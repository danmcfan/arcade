// Port of internal/game/game.go: the top-level loop that switches between the
// arcade hub and the active software (minigame), plus Shift+P debug and
// `Layout`. Beyond the Go original: Esc in a minigame opens the minigame pause
// menu (Resume / Controls / Quit game), and a minigame that ends shows the
// payout, which turns its score into tickets, before the hub comes back.
// Space at the prize desk opens the prize counter menu over the hub, where
// tickets buy tokens and prizes.

import { addSoundListener, type Sound, type SoundEvent } from "../engine/audio.ts";
import { imageArcade, attractSounds, sounds } from "../engine/assets.ts";
import { MenuKeys, type Direction, type Input, type MenuEdges } from "../engine/input.ts";
import * as rng from "../engine/rng.ts";
import type { Surface } from "../engine/surface.ts";
import { draw as drawArcade } from "../arcade/draw.ts";
import type { SoftwareFactory } from "../arcade/machine.ts";
import { prizes } from "../arcade/prizes.ts";
import { blocked, newState, type State } from "../arcade/state.ts";
import { Wallet, type WalletProgress } from "../arcade/wallet.ts";
import { update as updateArcade } from "../arcade/update.ts";
import { newDebugPanel, type DebugPrinter, type Panel } from "./debugPanel.ts";
import { createSoftware } from "./minigames.ts";
import { closeItemIndex, firstPrizeIndex, prizeCounterItems, tokenItemIndex } from "./menus.ts";
import { cabinetInsetLeft, cabinetInsetTop, cabinetPlayfieldHeight, cabinetPlayfieldWidth } from "../ui/cabinet.ts";
import { tickerRect } from "../ui/tickerArt.ts";
import { drawMenuOverlay } from "./overlay.ts";
import { MinigameRun } from "./minigameRun.ts";
import type { GameSnapshot } from "./snapshot.ts";
import { isFixedViewport, type Scene, type Software, type SoftwareName } from "./software.ts";

const buffer = 16;

const initialDebugMode = false;

/** What "Continue" brings back: the hub high score, tokens, tickets and prizes, and where the player stood. */
export interface Progress extends WalletProgress {
  player: { x: number; y: number; dir: Direction };
}

/** Collaborators a test can replace; the real game uses the defaults. */
export interface GameDeps {
  /** Builds a machine's software; default: `createSoftware` from ./minigames.ts. */
  createSoftware?: SoftwareFactory;
  /** Debug panel text; default: `debugPrint` from src/engine/text.ts. */
  debugPrint?: DebugPrinter;
  /** Start from a save (title scene "Continue"); omit for a fresh hub. */
  restore?: Progress;
}

export class Game implements Scene {
  readonly name = "game";

  private readonly arcade: State;

  /** The minigame being played; null in the hub. */
  private run: MinigameRun | null = null;
  /** Go `game.New(software)`'s software: it starts, outside the economy, after the first hub tick. */
  private initialSoftware: Software | null;
  /** Selected item of the prize counter menu while it is open over the hub; null when closed. */
  private counterCursor: number | null = null;
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
    this.arcade = newState(factory);
    if (deps.restore) this.restore(deps.restore);
    this.initialSoftware = sw;
    this.debugPanel = newDebugPanel(0, 0, 120, deps.debugPrint);
  }

  /**
   * A position in or beyond a wall or the prize counter (a stale or edited
   * save) keeps the start position. The walls frame the hub image, so
   * "inside the image and touching no wall" means "on the floor".
   */
  private restore(p: Progress): void {
    const player = this.arcade.player;
    this.arcade.wallet = new Wallet(p);
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
    return this.run === null && this.counterCursor === null;
  }

  progress(): Progress {
    const p = this.arcade.player;
    return {
      ...this.arcade.wallet.toProgress(),
      player: { x: p.x, y: p.y, dir: p.direction },
    };
  }

  /** Goes up whenever tokens, tickets, prizes or the high score change. */
  walletVersion(): number {
    return this.arcade.wallet.version;
  }

  /** The faced cabinet's attract loop, while it plays. */
  private attract(): Sound | null {
    const a = this.arcade;
    return a.melodyPlaying && a.imageTitle !== null ? attractSounds[a.imageTitle] : null;
  }

  /** Silence the hub song and the faced cabinet while a menu covers the game. */
  pauseAudio(): void {
    if (this.hubSongOn) sounds.hub.pause();
    this.attract()?.pause();
  }

  /** Undo `pauseAudio`. */
  resumeAudio(): void {
    if (this.hubSongOn) sounds.hub.play();
    this.attract()?.play();
  }

  /** Stop the hub's sounds for good (leaving the game). */
  stopAudio(): void {
    this.hubSongOn = false;
    sounds.hub.pause();
    sounds.hub.rewind();
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
    const want = this.run === null;
    if (want === this.hubSongOn) return;
    this.hubSongOn = want;
    if (want) sounds.hub.play();
    else sounds.hub.pause();
  }

  /** Go `Game.Update` with the input already read. */
  private update(raw: Input): void {
    if (raw.shiftP) {
      this.debugMode = !this.debugMode;
    }

    const { edges } = this.keys.read(raw);
    const input = this.keys.unmasked(raw);

    if (this.run !== null) {
      if (this.run.update(raw, input, edges)) this.run = null;
      return;
    }
    if (this.counterCursor !== null) {
      this.updatePrizeCounter(this.counterCursor, raw, edges);
      return;
    }

    const event = updateArcade(this.arcade, input);
    if (this.initialSoftware !== null) {
      this.run = new MinigameRun(this.initialSoftware, "direct", this.arcade.wallet, this.keys);
      this.initialSoftware = null;
      return;
    }
    if (event === null) return;
    if ("start" in event) {
      this.run = new MinigameRun(event.start, event.run, this.arcade.wallet, this.keys);
      return;
    }
    sounds.select.blip();
    this.counterCursor = 0;
  }

  private updatePrizeCounter(cursor: number, raw: Input, edges: MenuEdges): void {
    const wallet = this.arcade.wallet;
    const n = prizeCounterItems(wallet.counter()).length;
    const delta = (edges.down ? 1 : 0) - (edges.up ? 1 : 0);
    let at = cursor;
    if (delta !== 0) {
      at = (cursor + delta + n) % n;
      this.counterCursor = at;
      sounds.move.blip();
    }
    if (edges.space && at === tokenItemIndex) {
      (wallet.buy("token") ? sounds.select : sounds.deny).blip();
      return;
    }
    if (edges.space && at >= firstPrizeIndex && at < closeItemIndex) {
      const prize = prizes[at - firstPrizeIndex];
      if (prize === undefined) throw new Error(`prize counter: no prize at item ${at}`);
      (wallet.buy(prize.id) ? sounds.select : sounds.deny).blip();
      return;
    }
    if (!edges.space && !edges.escape) return;
    // CLOSE or Esc: back to the hub.
    sounds.select.blip();
    this.counterCursor = null;
    this.keys.maskHeld(raw);
  }

  draw(screen: Surface): void {
    if (this.run !== null) {
      const { software, menu } = this.run;
      let margin = buffer;
      if (isFixedViewport(software)) {
        margin = 0;
      }
      software.draw(screen, margin);
      if (menu !== null) {
        const [w, h] = this.minigameSize(software);
        // Over a cabinet, the menu stays on its screen, clear of the bezel.
        const playfield = isFixedViewport(software)
          ? { x: cabinetInsetLeft, y: cabinetInsetTop, w: cabinetPlayfieldWidth, h: cabinetPlayfieldHeight }
          : { x: buffer, y: buffer, w: w - buffer * 2, h: h - buffer * 2 };
        const overlay = {
          menu,
          software: software.name,
          cursor: this.run.cursor,
          payout: this.run.payout,
          wallet: this.arcade.wallet,
          tick: this.tick,
          playfield,
        };
        screen.clipped(playfield.x, playfield.y, playfield.w, playfield.h, () => {
          drawMenuOverlay(screen, overlay);
        });
      }
      return;
    }

    // Everything in the hub, its counts and its menu included, is drawn inside the hub image (#72).
    drawArcade(screen, this.arcade, this.tick, buffer, this.debugMode);
    const hubWidth = imageArcade.w + buffer * 2;
    const hubHeight = imageArcade.h + buffer * 2;
    if (this.counterCursor !== null) {
      // The menu fills the room under the scoreboard, so the counts stay readable and change as tokens are bought.
      const below = tickerRect.y + tickerRect.h;
      drawMenuOverlay(screen, {
        menu: "prizeCounter",
        software: null,
        cursor: this.counterCursor,
        payout: null,
        wallet: this.arcade.wallet,
        tick: this.tick,
        playfield: { x: buffer, y: buffer + below, w: imageArcade.w, h: imageArcade.h - below },
      });
    }

    if (this.debugMode) {
      this.debugPanel.draw(screen, this.arcade, hubWidth, hubHeight);
    }
  }

  layout(): [number, number] {
    let baseWidth = imageArcade.w + buffer * 2;
    let baseHeight = imageArcade.h + buffer * 2;

    if (this.run !== null) {
      [baseWidth, baseHeight] = this.minigameSize(this.run.software);
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
    const hubRun = {
      run: null,
      menu: this.counterCursor === null ? null : "prizeCounter",
      cursor: this.counterCursor ?? 0,
      payout: null,
      sw: null,
    } as const;
    const { run, menu, cursor, payout, sw } = this.run === null ? hubRun : this.run.snapshot();
    return {
      tick: this.tick,
      rng: rng.state(),
      debug: this.debugMode,
      software: this.run === null ? null : this.run.software.name,
      arcade: {
        player: { x: p.x, y: p.y, dir: p.direction, frame: p.frame },
        melodyPlaying: this.arcade.melodyPlaying,
        title: this.arcade.imageTitle,
        ...this.walletSnapshot(),
      },
      run,
      menu,
      cursor,
      payout,
      sw,
      sounds: [...this.tickSounds],
    };
  }

  /** The wallet as the `arcade` snapshot shows it: `prizes` is absent while none is owned (ADR-0004). */
  private walletSnapshot(): Pick<GameSnapshot["arcade"], "highScore" | "tokens" | "tickets" | "prizes"> {
    const { highScore, tokens, tickets, prizes: owned } = this.arcade.wallet.toProgress();
    return { highScore, tokens, tickets, ...(owned.length > 0 ? { prizes: owned } : {}) };
  }

  dispose(): void {
    this.unsubscribe();
  }
}
