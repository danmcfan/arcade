// The scene the page opens on: a title menu (Continue / New game), an intro
// that explains the game and its controls, then the arcade Game itself.
// New game over an existing save asks first, since it deletes that save.
// Esc in the hub opens a pause menu (Resume / Controls / Quit to menu).
//
// The Game runs unchanged inside this scene, so `?scene=game` and the parity
// fixtures still start straight in the hub.

import { NO_INPUT, type Input } from "../engine/input.ts";
import * as rng from "../engine/rng.ts";
import type { Surface } from "../engine/surface.ts";
import { Game, type Progress } from "../game/game.ts";
import type { TitlePhase, TitleSnapshot } from "../game/snapshot.ts";
import type { Scene } from "../game/software.ts";
import { draw, screenHeight, screenWidth } from "./draw.ts";
import { memoryStore, type SaveData, type SaveStore } from "./save.ts";

import { confirmMenu, newGameIndex, pauseMenu, titleMenu } from "./menus.ts";

export { confirmMenu, pauseMenu, titleMenu } from "./menus.ts";

/** Keys a menu reacts to on the tick they go down. */
const EDGE_KEYS = ["up", "down", "space", "escape"] as const;
type EdgeKey = (typeof EDGE_KEYS)[number];

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
  private prev: Input = NO_INPUT;
  /**
   * Keys held when play starts or resumes. They are hidden from the Game
   * until released, so the Space that chose "Continue" does not also start
   * the cabinet the player is facing.
   */
  private readonly masked = new Set<keyof Input>();

  constructor(deps: TitleDeps = {}) {
    this.store = deps.store ?? memoryStore();
    this.createGame = deps.createGame ?? ((restore) => new Game(null, restore ? { restore } : {}));
    this.saved = this.store.load();
    this.cursor = this.menuCursor();
  }

  get canContinue(): boolean {
    return this.saved !== null;
  }

  /** High score in the save, shown on the title menu; null without a save. */
  get savedHighScore(): number | null {
    return this.saved?.highScore ?? null;
  }

  /** The labels of the menu on screen, or [] when there is none. */
  items(): readonly string[] {
    if (this.phase === "menu") return titleMenu;
    if (this.phase === "confirm") return confirmMenu;
    if (this.phase === "paused") return pauseMenu;
    return [];
  }

  step(i: Input): void {
    const pressed = (k: EdgeKey): boolean => i[k] && !this.prev[k];
    const edges = Object.fromEntries(EDGE_KEYS.map((k) => [k, pressed(k)])) as Record<EdgeKey, boolean>;
    this.prev = i;
    this.tick++;

    switch (this.phase) {
      case "menu":
        this.moveCursor(edges);
        if (edges.space) {
          if (this.cursor === 0) this.startGame(this.saved ?? undefined);
          else if (this.canContinue) this.show("confirm", 0);
          else this.show("intro", 0);
        }
        break;
      case "confirm":
        this.moveCursor(edges);
        if (edges.escape || (edges.space && this.cursor === 0)) this.show("menu", newGameIndex);
        else if (edges.space) this.show("intro", 0);
        break;
      case "intro":
        if (edges.escape) this.show("menu", newGameIndex);
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

  private moveCursor(edges: Record<EdgeKey, boolean>): void {
    const n = this.items().length;
    const delta = (edges.down ? 1 : 0) - (edges.up ? 1 : 0);
    if (delta === 0) return;
    let next = this.cursor;
    do next = (next + delta + n) % n;
    while (this.phase === "menu" && next === 0 && !this.canContinue);
    this.cursor = next;
  }

  private show(phase: TitlePhase, cursor: number): void {
    this.phase = phase;
    this.cursor = cursor;
  }

  /** Continue when there is a save to continue, else New game. */
  private menuCursor(): number {
    return this.canContinue ? 0 : newGameIndex;
  }

  private startGame(restore?: Progress): void {
    this.game = this.createGame(restore);
    this.phase = "playing";
    this.cursor = 0;
    this.maskHeld(this.prev);
    this.persist();
  }

  private stepGame(i: Input, escapePressed: boolean): void {
    const game = this.game!;
    if (game.inHub() && escapePressed) {
      game.pauseAudio();
      this.phase = "paused";
      this.cursor = 0;
      return;
    }
    for (const k of this.masked) if (!i[k]) this.masked.delete(k);
    const input = { ...i };
    for (const k of this.masked) input[k] = false;
    const wasInHub = game.inHub();
    game.step(input);
    // A minigame just ended (game over or Esc): its score may be a new high.
    if (!wasInHub && game.inHub()) this.persist();
  }

  private resume(i: Input): void {
    this.phase = "playing";
    this.cursor = 0;
    this.maskHeld(i);
    this.game!.resumeAudio();
  }

  private quitToMenu(): void {
    this.persist();
    this.game!.stopAudio();
    this.game!.dispose();
    this.game = null;
    this.show("menu", this.menuCursor());
  }

  private maskHeld(i: Input): void {
    this.masked.clear();
    for (const k of Object.keys(i) as (keyof Input)[]) if (i[k]) this.masked.add(k);
  }

  persist(): void {
    if (this.game === null) return;
    this.saved = { v: 1, ...this.game.progress() };
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
    this.game?.dispose();
  }
}
