// Port of internal/arcade/state.go.

import type { Software } from "../game/software.ts";
import type { ArcadeTitle, RunKindSnapshot } from "../game/snapshot.ts";
import { checkCollision, checkCollisions, newWalls, type Rect } from "./collision.ts";
import { newPlayer, type Entity } from "./entity.ts";
import { newMachines, type Machine, type SoftwareFactory } from "./machine.ts";
import { counterRect } from "./prizeCounter.ts";

export const tileSize = 8;

/** Tokens a New game starts with. */
export const startingTokens = 5;

/**
 * How the loaded minigame was started: at a cabinet for a token ("paid"),
 * at a cabinet with no tokens ("free", free play), or straight from
 * `game.New(software)` without the hub ("direct": the parity fixtures and
 * `?scene=game&software=`), which costs nothing and has no payout.
 */
export type RunKind = RunKindSnapshot;

export class State {
  player: Entity;
  walls: Rect[];
  machines: Machine[];
  /** The prize counter: solid, and used like a cabinet. */
  counter: Rect;

  melodyPlaying = false;
  /** Go `imageTitle` (nil → null), by name; see `titleImages`. */
  imageTitle: ArcadeTitle | null = null;
  /** Go `LoadedSoftware`: picked up (and cleared) by the Game after each hub update. */
  loadedSoftware: Software | null;
  /** How `loadedSoftware` was started; null when nothing was loaded yet. */
  loadedRun: RunKind | null;
  /** Space was pressed facing the prize counter: picked up (and cleared) by the Game, which opens its menu. */
  counterOpened = false;

  highScore = 0;
  tokens = startingTokens;
  tickets = 0;

  constructor(initialSoftware: Software | null, factory: SoftwareFactory) {
    this.player = newPlayer();
    this.walls = newWalls();
    this.machines = newMachines(factory);
    this.counter = { ...counterRect };
    this.loadedSoftware = initialSoftware;
    this.loadedRun = initialSoftware === null ? null : "direct";
  }

  debugInfo(): string[] {
    const lines: string[] = [];
    lines.push(`Player: (${formatFloat0(this.player.x)},${formatFloat0(this.player.y)})`);
    return lines;
  }
}

/** Whether a player rect at `r` would be inside a wall or the prize counter. */
export function blocked(s: State, r: Rect): boolean {
  return checkCollisions(r, s.walls) || checkCollision(r, s.counter);
}

/** Go `arcade.NewState(initialSoftware)`; `factory` builds a machine's software. */
export function newState(initialSoftware: Software | null, factory: SoftwareFactory): State {
  return new State(initialSoftware, factory);
}

/**
 * Go `fmt.Sprintf("%.0f", v)`: correctly rounded, ties to even (JS `toFixed`
 * breaks ties upward). Hub positions are always integers today.
 */
export function formatFloat0(v: number): string {
  let r = Math.round(v);
  if (r - v === 0.5 && r % 2 !== 0) r -= 1;
  if (Object.is(r, -0) || (r === 0 && v < 0)) return "-0";
  return String(r);
}
