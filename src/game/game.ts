// Port of internal/game/game.go: the top-level loop that switches between the
// arcade hub and the active software (minigame), plus Shift+P debug and
// `Layout`. Beyond the Go original: Esc in a minigame opens the minigame pause
// menu (Resume / Controls / Quit game), and a minigame that ends shows the
// payout, which turns its score into tickets, before the hub comes back.
// Space at the prize counter opens the prize counter menu over the hub, where
// tickets buy tokens and prizes.

import { addSoundListener, type Sound, type SoundEvent } from "../engine/audio.ts";
import {
  imageArcade,
  attractSounds,
  soundBoom,
  soundDeath,
  soundDeny,
  soundHub,
  soundLaser,
  soundMove,
  soundPower,
  soundSelect,
  soundStart,
  soundTicket,
} from "../engine/assets.ts";
import { MenuKeys, type Direction, type Input, type MenuEdges } from "../engine/input.ts";
import * as rng from "../engine/rng.ts";
import type { Surface } from "../engine/surface.ts";
import { draw as drawArcade } from "../arcade/draw.ts";
import type { SoftwareFactory } from "../arcade/machine.ts";
import { buyToken, tokenOffer } from "../arcade/prizeCounter.ts";
import { buyPrize, inCatalogueOrder, prizeOffers, prizes, type PrizeId } from "../arcade/prizes.ts";
import { blocked, newState, type RunKind, type State } from "../arcade/state.ts";
import { update as updateArcade } from "../arcade/update.ts";
import { newDebugPanel, type DebugPrinter, type Panel } from "./debugPanel.ts";
import { createSoftware } from "./softwareFactories.ts";
import {
  closeItemIndex,
  firstPrizeIndex,
  minigamePauseMenu,
  prizeCounterItems,
  quitGameIndex,
  tokenItemIndex,
} from "./menus.ts";
import { drawHud } from "../ui/hud.ts";
import { drawMenuOverlay } from "./overlay.ts";
import { Payout, ticketsFor } from "./payout.ts";
import type { GameMenu, GameSnapshot } from "./snapshot.ts";
import { isFixedViewport, type Scene, type Software, type SoftwareName } from "./software.ts";

const buffer = 16;

const initialDebugMode = false;

/** What "Continue" brings back: the hub high score, tokens, tickets and prizes, and where the player stood. */
export interface Progress {
  highScore: number;
  tokens: number;
  tickets: number;
  /** Owned prizes, in catalogue order. */
  prizes: PrizeId[];
  player: { x: number; y: number; dir: Direction };
}

/** The minigames' sounds: paused with the minigame pause menu. */
const minigameSounds: readonly Sound[] = [soundStart, soundPower, soundDeath, soundLaser, soundBoom];

/** Collaborators a test can replace; the real game uses the defaults. */
export interface GameDeps {
  /** Builds a machine's software; default: `createSoftware` from ./softwareFactories.ts. */
  createSoftware?: SoftwareFactory;
  /** Debug panel text; default: `debugPrint` from src/engine/text.ts. */
  debugPrint?: DebugPrinter;
  /** Start from a save (title scene "Continue"); omit for a fresh hub. */
  restore?: Progress;
}

export class Game implements Scene {
  readonly name = "game";

  private readonly arcade: State;

  private software: Software | null = null;
  /** How `software` was started; null in the hub. */
  private run: RunKind | null = null;
  /** The menu over the minigame or the hub, if any. */
  private menu: GameMenu | null = null;
  /** Selected item of the minigame pause menu or the prize counter menu. */
  private cursor = 0;
  private payout: Payout | null = null;
  /** Minigame sounds that were playing when the pause menu opened; Resume restarts them. */
  private pausedSounds: Sound[] = [];
  /**
   * Menu key presses, and keys held when a menu closes: those are hidden
   * until released, so the Space that chose Resume does not also fire in the
   * minigame, and the Space that closed a menu does not start the cabinet again.
   */
  private readonly keys = new MenuKeys();

  private debugMode = initialDebugMode;
  private readonly debugPanel: Panel;

  private tick = 0;
  /** The hub song is playing: it loops, quietly, whenever no minigame is running. */
  private hubSongOn = false;
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
    this.unsubscribe = addSoundListener((e) => {
      this.pendingSounds.push(e);
    });
    const sw = initialSoftware === null ? null : factory(initialSoftware, 0, []);
    this.arcade = newState(sw, factory);
    if (deps.restore) this.restore(deps.restore);
    this.debugPanel = newDebugPanel(0, 0, 120, deps.debugPrint);
  }

  /**
   * A position in or beyond a wall or the prize counter (a stale or edited
   * save) keeps the start position. The walls frame the hub image, so
   * "inside the image and touching no wall" means "on the floor".
   */
  private restore(p: Progress): void {
    const player = this.arcade.player;
    this.arcade.highScore = p.highScore;
    this.arcade.tokens = p.tokens;
    this.arcade.tickets = p.tickets;
    this.arcade.prizes = inCatalogueOrder(p.prizes);
    player.direction = p.player.dir;
    const rect = {
      x: p.player.x - player.width / 2,
      y: p.player.y - player.height / 2,
      w: player.width,
      h: player.height,
    };
    const inside = rect.x >= 0 && rect.y >= 0 && rect.x + rect.w <= imageArcade.w && rect.y + rect.h <= imageArcade.h;
    if (inside && !blocked(this.arcade, rect)) {
      player.x = p.player.x;
      player.y = p.player.y;
    }
  }

  /** True while the hub is running: not in a minigame, its pause menu, the payout or the prize counter menu. */
  inHub(): boolean {
    return this.software === null && this.menu === null;
  }

  progress(): Progress {
    const a = this.arcade;
    const p = a.player;
    return {
      highScore: a.highScore,
      tokens: a.tokens,
      tickets: a.tickets,
      prizes: [...a.prizes],
      player: { x: p.x, y: p.y, dir: p.direction },
    };
  }

  /** The faced cabinet's attract loop, while it plays. */
  private attract(): Sound | null {
    const a = this.arcade;
    return a.melodyPlaying && a.imageTitle !== null ? attractSounds[a.imageTitle] : null;
  }

  /** Silence the hub song and the faced cabinet while a menu covers the game. */
  pauseAudio(): void {
    if (this.hubSongOn) soundHub.pause();
    this.attract()?.pause();
  }

  /** Undo `pauseAudio`. */
  resumeAudio(): void {
    if (this.hubSongOn) soundHub.play();
    this.attract()?.play();
  }

  /** Stop the hub's sounds for good (leaving the game). */
  stopAudio(): void {
    this.hubSongOn = false;
    soundHub.pause();
    soundHub.rewind();
    const attract = this.attract();
    attract?.pause();
    attract?.rewind();
  }

  step(i: Input): void {
    this.update(i);
    this.updateHubSong();
    this.tick++;
    this.tickSounds = this.pendingSounds;
    this.pendingSounds = [];
  }

  /** Play the hub song in the hub (its menus too), pause it in a minigame, and pick up where it left off after. */
  private updateHubSong(): void {
    const want = this.software === null;
    if (want === this.hubSongOn) return;
    this.hubSongOn = want;
    if (want) soundHub.play();
    else soundHub.pause();
  }

  /** Go `Game.Update` with the input already read. */
  private update(raw: Input): void {
    if (raw.shiftP) {
      this.debugMode = !this.debugMode;
    }

    const { edges } = this.keys.read(raw);
    const input = this.keys.unmasked(raw);

    if (this.software === null) {
      if (this.menu === "prizeCounter") this.updatePrizeCounter(raw, edges);
      else this.updateHub(input);
      return;
    }
    switch (this.menu) {
      case null:
        this.updateMinigame(this.software, input, edges);
        return;
      case "paused":
        this.updatePauseMenu(raw, edges);
        return;
      case "controls":
        if (edges.space || edges.escape) {
          soundSelect.blip();
          this.menu = "paused";
        }
        return;
      case "payout":
        if (this.payout === null) throw new Error("game: payout menu without a payout");
        this.updatePayout(this.payout, raw, edges);
        break;
      case "prizeCounter":
        break; // only opens in the hub
    }
  }

  private updateHub(input: Input): void {
    updateArcade(this.arcade, input);

    if (this.arcade.loadedSoftware !== null) {
      this.software = this.arcade.loadedSoftware;
      this.run = this.arcade.loadedRun;
      this.arcade.loadedSoftware = null;
    }

    if (this.arcade.counterOpened) {
      this.arcade.counterOpened = false;
      soundSelect.blip();
      this.menu = "prizeCounter";
      this.cursor = 0;
    }
  }

  private updatePrizeCounter(raw: Input, edges: MenuEdges): void {
    const n = prizeCounterItems(tokenOffer(this.arcade), prizeOffers(this.arcade)).length;
    const delta = (edges.down ? 1 : 0) - (edges.up ? 1 : 0);
    if (delta !== 0) {
      this.cursor = (this.cursor + delta + n) % n;
      soundMove.blip();
    }
    if (edges.space && this.cursor === tokenItemIndex) {
      const after = buyToken(this.arcade);
      if (after === null) {
        soundDeny.blip();
        return;
      }
      soundSelect.blip();
      this.arcade.tokens = after.tokens;
      this.arcade.tickets = after.tickets;
      return;
    }
    if (edges.space && this.cursor >= firstPrizeIndex && this.cursor < closeItemIndex) {
      const prize = prizes[this.cursor - firstPrizeIndex];
      if (prize === undefined) throw new Error(`prize counter: no prize at item ${this.cursor}`);
      const after = buyPrize(this.arcade, prize.id);
      if (after === null) {
        soundDeny.blip();
        return;
      }
      soundSelect.blip();
      this.arcade.tickets = after.tickets;
      this.arcade.prizes = after.prizes;
      return;
    }
    if (!edges.space && !edges.escape) return;
    // CLOSE or Esc: back to the hub.
    soundSelect.blip();
    this.menu = null;
    this.cursor = 0;
    this.keys.maskHeld(raw);
  }

  private updateMinigame(software: Software, input: Input, edges: MenuEdges): void {
    if (edges.escape) {
      this.openPauseMenu();
      return;
    }

    software.update(input);
    if (software.gameOver()) {
      const score = software.score();
      this.arcade.highScore = Math.max(this.arcade.highScore, score);
      if (this.run === "direct") {
        this.leaveMinigame();
        return;
      }
      // Paid out at once, so a save taken during the count keeps them.
      const freePlay = this.run === "free";
      this.arcade.tickets += ticketsFor(score, freePlay);
      this.payout = new Payout(score, freePlay);
      this.menu = "payout";
    }
  }

  private openPauseMenu(): void {
    soundSelect.blip();
    this.pausedSounds = minigameSounds.filter((s) => s.playing);
    for (const s of minigameSounds) s.pause();
    this.menu = "paused";
    this.cursor = 0;
  }

  private updatePauseMenu(raw: Input, edges: MenuEdges): void {
    const delta = (edges.down ? 1 : 0) - (edges.up ? 1 : 0);
    if (delta !== 0) {
      const n = minigamePauseMenu.length;
      this.cursor = (this.cursor + delta + n) % n;
      soundMove.blip();
    }
    if (!edges.space && !edges.escape) return;
    soundSelect.blip();
    if (edges.escape || this.cursor === 0) {
      // Resume: the minigame carries on from this tick.
      this.menu = null;
      this.cursor = 0;
      for (const s of this.pausedSounds) s.play();
      this.pausedSounds = [];
      this.keys.maskHeld(raw);
    } else if (this.cursor === quitGameIndex) {
      // Quit game: the token stays spent, no tickets, no payout.
      this.pausedSounds = [];
      this.leaveMinigame();
      this.keys.maskHeld(raw);
    } else {
      this.menu = "controls";
    }
  }

  private updatePayout(payout: Payout, raw: Input, edges: MenuEdges): void {
    if (edges.space) soundSelect.blip();
    if (payout.step(edges.space)) soundTicket.blip();
    if (payout.done) {
      this.leaveMinigame();
      this.keys.maskHeld(raw);
    }
  }

  private leaveMinigame(): void {
    this.software = null;
    this.run = null;
    this.menu = null;
    this.cursor = 0;
    this.payout = null;
  }

  draw(screen: Surface): void {
    if (this.software !== null) {
      let margin = buffer;
      if (isFixedViewport(this.software)) {
        margin = 0;
      }
      this.software.draw(screen, margin);
      if (this.menu !== null) {
        const [w, h] = this.minigameSize(this.software);
        const playfield = isFixedViewport(this.software)
          ? { x: 0, y: 0, w, h }
          : { x: buffer, y: buffer, w: w - buffer * 2, h: h - buffer * 2 };
        drawMenuOverlay(screen, {
          menu: this.menu,
          software: this.software.name,
          cursor: this.cursor,
          payout: this.payout,
          wallet: this.arcade,
          tick: this.tick,
          width: w,
          height: h,
          playfield,
        });
      }
      return;
    }

    drawArcade(screen, this.arcade, buffer, this.debugMode);
    const hubWidth = imageArcade.w + buffer * 2;
    const hubHeight = imageArcade.h + buffer * 2;
    drawHud(screen, this.arcade.tokens, this.arcade.tickets, hubWidth);
    if (this.menu === "prizeCounter") {
      // Only the hub image dims, so the HUD counts stay readable and change as tokens are bought.
      drawMenuOverlay(screen, {
        menu: this.menu,
        software: null,
        cursor: this.cursor,
        payout: null,
        wallet: this.arcade,
        tick: this.tick,
        width: hubWidth,
        height: hubHeight,
        playfield: { x: buffer, y: buffer, w: imageArcade.w, h: imageArcade.h },
      });
    }

    if (this.debugMode) {
      this.debugPanel.draw(screen, this.arcade, hubWidth, hubHeight);
    }
  }

  layout(): [number, number] {
    let baseWidth = imageArcade.w + buffer * 2;
    let baseHeight = imageArcade.h + buffer * 2;

    if (this.software !== null) {
      [baseWidth, baseHeight] = this.minigameSize(this.software);
    }

    if (this.debugMode) {
      baseWidth += Math.trunc(this.debugPanel.width());
    }

    return [baseWidth, baseHeight];
  }

  /** The minigame's layout, without the debug panel. */
  private minigameSize(software: Software): [number, number] {
    if (isFixedViewport(software)) return software.fixedViewportSize();
    return [software.background().w + buffer * 2, software.background().h + buffer * 2];
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
        tokens: this.arcade.tokens,
        tickets: this.arcade.tickets,
        ...(this.arcade.prizes.length > 0 ? { prizes: [...this.arcade.prizes] } : {}),
      },
      run: this.run,
      menu: this.menu,
      cursor: this.cursor,
      payout: this.payout === null ? null : this.payout.snapshot(),
      sw: this.software === null ? null : this.software.snapshot(),
      sounds: [...this.tickSounds],
    };
  }

  dispose(): void {
    this.unsubscribe();
  }
}
