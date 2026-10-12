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

import { soundMove, soundSelect, soundTitleMusic } from "../engine/assets.ts";
import { MenuKeys, type Input, type MenuEdges } from "../engine/input.ts";
import * as rng from "../engine/rng.ts";
import type { Surface } from "../engine/surface.ts";
import { Game, type Progress } from "../game/game.ts";
import type { TitlePhase, TitleSnapshot } from "../game/snapshot.ts";
import type { Scene } from "../game/software.ts";
import { draw, screenHeight, screenWidth } from "./draw.ts";
import { memoryStore, saveVersion, type SaveData, type SaveStore } from "./save.ts";

import { confirmMenu, pauseMenu, titleMenu } from "./menus.ts";

export { confirmMenu, pauseMenu, titleMenu } from "./menus.ts";

/** Phases the title music plays in: everything before the Game starts. */
const MUSIC_PHASES: readonly TitlePhase[] = ["menu", "confirm", "intro"];

export interface TitleDeps {
  /** Where the save lives; default: an in-memory store. */
  store?: SaveStore;
  /** Builds the hosted Game; default: `new Game(null, { restore })`. */
  createGame?: (restore?: Progress) => Game;
}

export class Title implements Scene {
  readonly name = "title";

  phase: TitlePhase = "menu";
  cursor = 0;
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

  constructor(deps: TitleDeps = {}) {
    this.store = deps.store ?? memoryStore();
    this.createGame = deps.createGame ?? ((restore) => new Game(null, restore ? { restore } : {}));
    this.saved = this.store.load();
  }

  get canContinue(): boolean {
    return this.saved !== null;
  }

  /** High score in the save, shown on the title menu; null without a save. */
  get savedHighScore(): number | null {
    return this.saved?.highScore ?? null;
  }

  /** The title menu: Continue is only listed when there is a save. */
  menuItems(): readonly string[] {
    return this.canContinue ? titleMenu : titleMenu.slice(1);
  }

  /** The labels of the menu on screen, or [] when there is none. */
  items(): readonly string[] {
    if (this.phase === "menu") return this.menuItems();
    if (this.phase === "confirm") return confirmMenu;
    if (this.phase === "paused") return pauseMenu;
    return [];
  }

  step(i: Input): void {
    const { edges, anyPressed } = this.keys.read(i);
    this.tick++;
    this.stepPhase(i, edges);
    this.updateMusic(anyPressed);
  }

  private stepPhase(i: Input, edges: MenuEdges): void {
    // Every choice or Back chirps (Esc does nothing on the title menu itself).
    if (this.phase !== "playing" && (edges.space || (edges.escape && this.phase !== "menu"))) soundSelect.blip();

    switch (this.phase) {
      case "menu":
        this.moveCursor(edges);
        if (edges.space) {
          if (this.cursor !== this.newGameIndex) this.startGame(this.saved ?? undefined);
          else if (this.canContinue) this.show("confirm", 0);
          else this.show("intro", 0);
        }
        break;
      case "confirm":
        this.moveCursor(edges);
        if (edges.escape || (edges.space && this.cursor === 0)) this.show("menu", this.newGameIndex);
        else if (edges.space) this.show("intro", 0);
        break;
      case "intro":
        if (edges.escape) this.show("menu", this.newGameIndex);
        else if (edges.space) {
          this.store.clear();
          this.saved = null;
          this.startGame();
        }
        break;
      case "playing":
        this.stepGame(i, edges.escape);
        break;
      case "paused":
        this.moveCursor(edges);
        if (edges.escape) this.resume(i);
        else if (edges.space) {
          if (this.cursor === 0) this.resume(i);
          else if (this.cursor === 1) this.phase = "controls";
          else this.quitToMenu();
        }
        break;
      case "controls":
        if (edges.space || edges.escape) this.phase = "paused";
        break;
    }
  }

  private moveCursor(edges: MenuEdges): void {
    const n = this.items().length;
    const delta = (edges.down ? 1 : 0) - (edges.up ? 1 : 0);
    if (delta === 0) return;
    this.cursor = (this.cursor + delta + n) % n;
    soundMove.blip();
  }

  /**
   * Start the title music on the first tick and retry on each key press until
   * it plays: browsers block audio until the page gets a key press, and it
   * may still be loading. Stop it once play starts.
   */
  private updateMusic(anyPressed: boolean): void {
    const wanted = MUSIC_PHASES.includes(this.phase);
    if (wanted && (!this.musicOn || (anyPressed && !soundTitleMusic.playing))) {
      this.musicOn = true;
      soundTitleMusic.play();
    } else if (!wanted && this.musicOn) {
      this.musicOn = false;
      soundTitleMusic.pause();
      soundTitleMusic.rewind();
    }
  }

  private show(phase: TitlePhase, cursor: number): void {
    this.phase = phase;
    this.cursor = cursor;
  }

  /** Index of NEW GAME on the title menu: Continue is only listed above it with a save. */
  get newGameIndex(): number {
    return this.canContinue ? 1 : 0;
  }

  private startGame(restore?: Progress): void {
    this.game = this.createGame(restore);
    this.phase = "playing";
    this.cursor = 0;
    this.keys.maskHeld();
    this.persist();
  }

  private stepGame(i: Input, escapePressed: boolean): void {
    const game = this.game!;
    if (game.inHub() && escapePressed) {
      soundSelect.blip();
      game.pauseAudio();
      this.phase = "paused";
      this.cursor = 0;
      return;
    }
    const wasInHub = game.inHub();
    const before = game.progress();
    game.step(this.keys.unmasked(i));
    const after = game.progress();
    // A cabinet start spent a token, a minigame just ended (after its payout,
    // or Quit game), the prize counter menu opened or closed, or tokens,
    // tickets or prizes changed (a purchase, a payout): save.
    const changed = before.tokens !== after.tokens || before.tickets !== after.tickets || before.prizes.length !== after.prizes.length;
    if (wasInHub !== game.inHub() || changed) this.persist();
  }

  private resume(i: Input): void {
    this.phase = "playing";
    this.cursor = 0;
    this.keys.maskHeld(i);
    this.game!.resumeAudio();
  }

  private quitToMenu(): void {
    this.persist();
    this.game!.stopAudio();
    this.game!.dispose();
    this.game = null;
    this.show("menu", 0);
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
      soundTitleMusic.pause();
      soundTitleMusic.rewind();
    }
    this.game?.dispose();
  }
}
