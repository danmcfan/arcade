// The scene the page opens on: a title menu (Continue / New game), an intro
// that explains the game and its controls, then the arcade Game itself.
// New game over an existing save asks first, since it deletes that save.
// Esc in the hub opens the hub pause menu (Resume / Controls / Quit to menu);
// in a minigame the Game itself opens the minigame pause menu, and at the
// prize counter Esc closes the prize counter menu.
// Title music plays until the Game starts; menus blip when the cursor moves
// and chirp when a choice is made.
//
// The Game runs unchanged inside this scene, so `?scene=game` and the parity
// fixtures still start straight in the hub.

import { sounds } from "../engine/assets.ts";
import { MenuKeys, type Input, type MenuEdges } from "../engine/input.ts";
import * as rng from "../engine/rng.ts";
import type { Surface } from "../engine/surface.ts";
import { Game, type Progress } from "../game/game.ts";
import type { TitlePhase, TitleSnapshot } from "../game/snapshot.ts";
import type { Scene } from "../game/software.ts";
import { draw, screenHeight, screenWidth } from "./draw.ts";
import { memoryStore, saveVersion, type SaveData, type SaveStore } from "./save.ts";

import { Menu, type MenuItem } from "../game/menu.ts";
import { confirmItems, hubPauseItems, titleItems } from "./menus.ts";

/** Phases the title music plays in: everything before the Game starts. */
const MUSIC_PHASES: ReadonlySet<string> = new Set<TitlePhase>(["menu", "confirm", "intro"]);

export interface TitleDeps {
  /** Where the save lives; default: an in-memory store. */
  store?: SaveStore;
  /** Builds the hosted Game; default: `new Game(null, { restore })`. */
  createGame?: (restore?: Progress) => Game;
}

export class Title implements Scene {
  readonly name = "title";

  phase: TitlePhase = "menu";
  /** Ticks since construction; drives blinking text. */
  tick = 0;
  game: Game | null = null;

  private readonly store: SaveStore;
  private readonly createGame: (restore?: Progress) => Game;
  private saved: SaveData | null;
  /**
   * Menu key presses, and keys held when play starts or resumes: those are
   * hidden from the Game until released, so the Space that chose "Continue"
   * does not also start the cabinet the player is facing.
   */
  private readonly keys = new MenuKeys();
  /** Whether the title music was started and not stopped since. */
  private musicOn = false;

  /** The title menu: Continue is only listed when there is a save. Esc does nothing here. */
  private readonly titleMenu = new Menu((): MenuItem[] =>
    titleItems({
      newGame: (): void => {
        if (this.canContinue) this.show("confirm");
        else this.show("intro");
      },
      continueGame: this.canContinue
        ? (): void => {
            this.startGame(this.saved ?? undefined);
          }
        : null,
    }),
  );

  /** Asked before New game replaces a save; No (back to the title menu) is first. */
  private readonly confirmMenu = new Menu(
    (): MenuItem[] =>
      confirmItems({
        no: (): void => {
          this.show("menu");
        },
        yes: (): void => {
          this.show("intro");
        },
      }),
    (): void => {
      this.show("menu");
    },
  );

  /** The hub pause menu; Esc resumes. */
  private readonly pauseMenu = new Menu(
    (): MenuItem[] =>
      hubPauseItems({
        resume: (): void => {
          this.resume();
        },
        controls: (): void => {
          this.phase = "controls";
        },
        quit: (): void => {
          this.quitToMenu();
        },
      }),
    (): void => {
      this.resume();
    },
  );

  constructor(deps: TitleDeps = {}) {
    this.store = deps.store ?? memoryStore();
    this.createGame = deps.createGame ?? ((restore): Game => new Game(null, restore ? { restore } : {}));
    this.saved = this.store.load();
  }

  get canContinue(): boolean {
    return this.saved !== null;
  }

  /** The title menu's labels, also drawn (dimmed) behind the New game check. */
  menuItems(): readonly string[] {
    return this.titleMenu.labels();
  }

  /** The title menu's selected item. */
  get menuCursor(): number {
    return this.titleMenu.cursor;
  }

  /** The menu on screen; the controls panel belongs to the pause menu. */
  private activeMenu(): Menu | null {
    if (this.phase === "menu") return this.titleMenu;
    if (this.phase === "confirm") return this.confirmMenu;
    if (this.phase === "paused" || this.phase === "controls") return this.pauseMenu;
    return null;
  }

  /** The labels of the menu on screen, or [] when there is none. */
  items(): readonly string[] {
    return this.phase === "controls" ? [] : (this.activeMenu()?.labels() ?? []);
  }

  /** The selected item of the menu on screen; 0 without one. */
  get cursor(): number {
    return this.activeMenu()?.cursor ?? 0;
  }

  step(i: Input): void {
    const { edges, anyPressed } = this.keys.read(i);
    this.tick++;
    this.stepPhase(i, edges);
    this.updateMusic(anyPressed);
  }

  private stepPhase(i: Input, edges: MenuEdges): void {
    switch (this.phase) {
      case "menu":
      case "confirm":
        this.activeMenu()?.step(edges);
        break;
      case "paused":
        this.pauseMenu.step(edges);
        break;
      case "intro":
        if (edges.space || edges.escape) sounds.select.blip();
        if (edges.escape) this.show("menu");
        else if (edges.space) {
          this.store.clear();
          this.saved = null;
          this.startGame();
        }
        break;
      case "playing":
        this.stepGame(i, edges.escape);
        break;
      case "controls":
        if (edges.escape) {
          sounds.select.blip();
          this.phase = "paused";
        }
        break;
    }
  }

  /**
   * Start the title music on the first tick and retry on each key press until
   * it plays: browsers block audio until the page gets a key press, and it
   * may still be loading. Stop it once play starts.
   */
  private updateMusic(anyPressed: boolean): void {
    const wanted = MUSIC_PHASES.has(this.phase);
    if (wanted && (!this.musicOn || (anyPressed && !sounds.title.playing))) {
      this.musicOn = true;
      sounds.title.play();
    } else if (!wanted && this.musicOn) {
      this.musicOn = false;
      sounds.title.pause();
      sounds.title.rewind();
    }
  }

  /** Show a phase; a menu opened from the title menu starts on its first item, which keeps its own cursor. */
  private show(phase: TitlePhase): void {
    this.phase = phase;
    if (phase === "confirm") this.confirmMenu.open();
  }

  private startGame(restore?: Progress): void {
    this.game = this.createGame(restore);
    this.phase = "playing";
    this.keys.maskHeld();
    this.persist();
  }

  private stepGame(i: Input, escapePressed: boolean): void {
    const game = this.hostedGame();
    if (game.inHub() && escapePressed) {
      sounds.select.blip();
      game.pauseAudio();
      this.phase = "paused";
      this.pauseMenu.open();
      return;
    }
    const wasInHub = game.inHub();
    const before = game.walletVersion();
    game.step(this.keys.unmasked(i));
    // A minigame just started or ended (after its payout, or Quit game), the
    // prize counter menu opened or closed, or the wallet changed (a token
    // spent, a purchase, a payout, a new high score): save.
    if (wasInHub !== game.inHub() || before !== game.walletVersion()) this.persist();
  }

  /** Back to the hub, with the keys that chose this hidden until released. */
  private resume(): void {
    this.phase = "playing";
    this.keys.maskHeld();
    this.hostedGame().resumeAudio();
  }

  private quitToMenu(): void {
    this.persist();
    const game = this.hostedGame();
    game.stopAudio();
    game.dispose();
    this.game = null;
    this.titleMenu.open();
    this.show("menu");
  }

  /** The hosted Game; only called in phases that have one. */
  hostedGame(): Game {
    if (this.game === null) throw new Error(`title: no Game in phase "${this.phase}"`);
    return this.game;
  }

  persist(): void {
    if (this.game === null) return;
    this.saved = { v: saveVersion, ...this.game.progress() };
    this.store.save(this.saved);
  }

  draw(screen: Surface): void {
    draw(screen, this);
  }

  layout(): [number, number] {
    return this.game ? this.game.layout() : [screenWidth, screenHeight];
  }

  snapshot(): TitleSnapshot {
    return {
      tick: this.tick,
      rng: rng.state(),
      phase: this.phase,
      items: [...this.items()],
      cursor: this.cursor,
      canContinue: this.canContinue,
      game: this.game ? this.game.snapshot() : null,
    };
  }

  dispose(): void {
    if (this.musicOn) {
      sounds.title.pause();
      sounds.title.rewind();
    }
    this.game?.dispose();
  }
}
