// Port of internal/game/game.go: the top-level loop that switches between the
// arcade hub and the active software (minigame), plus Esc, Shift+P debug and
// `Layout`.

import { addSoundListener, type SoundEvent } from "../engine/audio.ts";
import { imageArcade, soundMelody, soundStart } from "../engine/assets.ts";
import type { Direction, Input } from "../engine/input.ts";
import * as rng from "../engine/rng.ts";
import type { Surface } from "../engine/surface.ts";
import { checkCollisions } from "../arcade/collision.ts";
import { draw as drawArcade } from "../arcade/draw.ts";
import type { SoftwareFactory } from "../arcade/machine.ts";
import { newState, type State } from "../arcade/state.ts";
import { update as updateArcade } from "../arcade/update.ts";
import { newDebugPanel, type DebugPrinter, type Panel } from "./debugPanel.ts";
import { createSoftware } from "./registry.ts";
import type { GameSnapshot } from "./snapshot.ts";
import { isFixedViewport, type Scene, type Software, type SoftwareName } from "./software.ts";

const buffer = 16;

const initialDebugMode = false;

/** What "Continue" brings back: the hub high score and where the player stood. */
export interface Progress {
  highScore: number;
  player: { x: number; y: number; dir: Direction };
}

/** Collaborators a test can replace; the real game uses the defaults. */
export interface GameDeps {
  /** Builds a machine's software; default: `createSoftware` from ./registry.ts. */
  createSoftware?: SoftwareFactory;
  /** Debug panel text; default: `debugPrint` from src/engine/text.ts. */
  debugPrint?: DebugPrinter;
  /** Start from a save (title scene "Continue"); omit for a fresh hub. */
  restore?: Progress;
}

export class Game implements Scene {
  readonly name = "game";

  private arcade: State;

  private software: Software | null = null;

  private debugMode = initialDebugMode;
  private debugPanel: Panel;

  private tick = 0;
  /** Sound events since the end of the previous tick. */
  private pendingSounds: SoundEvent[] = [];
  /** Sound events of the last completed tick (`GameSnapshot.sounds`). */
  private tickSounds: SoundEvent[] = [];
  private readonly unsubscribe: () => void;

  /**
   * Go `game.New(initialSoftware)`. The sound listener is installed before
   * the initial software is built, so its construction sounds land in tick
   * 1's `sounds`. `deps` swaps collaborators in tests only.
   */
  constructor(initialSoftware: SoftwareName | null, deps: GameDeps = {}) {
    const factory = deps.createSoftware ?? createSoftware;
    this.unsubscribe = addSoundListener((e) => this.pendingSounds.push(e));
    const sw = initialSoftware === null ? null : factory(initialSoftware, 0);
    this.arcade = newState(sw, factory);
    if (deps.restore) this.restore(deps.restore);
    this.debugPanel = newDebugPanel(0, 0, 120, deps.debugPrint);
  }

  /**
   * A position in or beyond a wall (a stale or edited save) keeps the start
   * position. The walls frame the hub image, so "inside the image and
   * touching no wall" means "on the floor".
   */
  private restore(p: Progress): void {
    const player = this.arcade.player;
    this.arcade.highScore = p.highScore;
    player.direction = p.player.dir;
    const rect = { x: p.player.x - player.width / 2, y: p.player.y - player.height / 2, w: player.width, h: player.height };
    const inside = rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= imageArcade.w && rect.y + rect.h <= imageArcade.h;
    if (inside && !checkCollisions(rect, this.arcade.walls)) {
      player.x = p.player.x;
      player.y = p.player.y;
    }
  }

  /** True while the hub (not a minigame) is running. */
  inHub(): boolean {
    return this.software === null;
  }

  progress(): Progress {
    const p = this.arcade.player;
    return { highScore: this.arcade.highScore, player: { x: p.x, y: p.y, dir: p.direction } };
  }

  /** Silence the hub melody while a menu covers the game. */
  pauseAudio(): void {
    if (this.arcade.melodyPlaying) soundMelody.pause();
  }

  /** Undo `pauseAudio`. */
  resumeAudio(): void {
    if (this.arcade.melodyPlaying) soundMelody.play();
  }

  /** Stop the hub melody for good (leaving the game). */
  stopAudio(): void {
    soundMelody.pause();
    soundMelody.rewind();
  }

  step(i: Input): void {
    this.update(i);
    this.tick++;
    this.tickSounds = this.pendingSounds;
    this.pendingSounds = [];
  }

  /** Go `Game.Update` with the input already read. */
  private update(input: Input): void {
    if (input.shiftP) {
      this.debugMode = !this.debugMode;
    }

    if (input.escape && this.software !== null) {
      soundStart.pause();
      this.software = null;
      return;
    }

    if (this.software !== null) {
      this.software.update(input);
      if (this.software.gameOver()) {
        this.arcade.highScore = Math.max(this.arcade.highScore, this.software.score());
        this.software = null;
      }
      return;
    }

    updateArcade(this.arcade, input);

    if (this.arcade.loadedSoftware !== null) {
      this.software = this.arcade.loadedSoftware;
      this.arcade.loadedSoftware = null;
    }
  }

  draw(screen: Surface): void {
    if (this.software !== null) {
      let margin = buffer;
      if (isFixedViewport(this.software)) {
        margin = 0;
      }
      this.software.draw(screen, margin);
      return;
    }

    drawArcade(screen, this.arcade, buffer, this.debugMode);

    if (this.debugMode) {
      const gameWidth = imageArcade.w + buffer * 2;
      const gameHeight = imageArcade.h + buffer * 2;
      this.debugPanel.draw(screen, this.arcade, gameWidth, gameHeight);
    }
  }

  layout(): [number, number] {
    let baseWidth = imageArcade.w + buffer * 2;
    let baseHeight = imageArcade.h + buffer * 2;

    if (this.software !== null) {
      if (isFixedViewport(this.software)) {
        [baseWidth, baseHeight] = this.software.fixedViewportSize();
      } else {
        baseWidth = this.software.background().w + buffer * 2;
        baseHeight = this.software.background().h + buffer * 2;
      }
    }

    if (this.debugMode) {
      baseWidth += Math.trunc(this.debugPanel.width());
    }

    return [baseWidth, baseHeight];
  }

  snapshot(): GameSnapshot {
    const p = this.arcade.player;
    return {
      tick: this.tick,
      rng: rng.state(),
      debug: this.debugMode,
      software: this.software === null ? null : this.software.name,
      arcade: {
        player: { x: p.x, y: p.y, dir: p.direction, frame: p.frame },
        melodyPlaying: this.arcade.melodyPlaying,
        title: this.arcade.imageTitle,
        highScore: this.arcade.highScore,
      },
      sw: this.software === null ? null : this.software.snapshot(),
      sounds: [...this.tickSounds],
    };
  }

  dispose(): void {
    this.unsubscribe();
  }
}
