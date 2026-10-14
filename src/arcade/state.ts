// Port of internal/arcade/state.go.

import type { Software } from "../game/software.ts";
import type { ArcadeTitle } from "../game/snapshot.ts";
import { checkCollisions, newWalls, type Rect } from "./collision.ts";
import { newPlayer, type Entity } from "./entity.ts";
import { newMachines, type Machine, type SoftwareFactory } from "./machine.ts";
import { counterRects } from "./desk.ts";
import { Wallet, type RunKind } from "./wallet.ts";

export class State {
  player: Entity;
  walls: Rect[];
  machines: Machine[];
  /** The prize desk's rects: solid, and faced with Space to open the prize counter menu. */
  counters: Rect[];

  melodyPlaying = false;
  /** Go `imageTitle` (nil → null), by name; the scoreboard shows it while the melody plays. */
  imageTitle: ArcadeTitle | null = null;
  /** Go `LoadedSoftware`: picked up (and cleared) by the Game after each hub update. */
  loadedSoftware: Software | null;
  /** How `loadedSoftware` was started; null when nothing was loaded yet. */
  loadedRun: RunKind | null;
  /** Space was pressed facing the prize counter: picked up (and cleared) by the Game, which opens its menu. */
  counterOpened = false;

  /** Tokens, tickets, owned prizes and the high score. */
  wallet = new Wallet();

  constructor(initialSoftware: Software | null, factory: SoftwareFactory) {
    this.player = newPlayer();
    this.walls = newWalls();
    this.machines = newMachines(factory);
    this.counters = counterRects.map(({ x, y, w, h }) => ({ x, y, w, h }));
    this.loadedSoftware = initialSoftware;
    this.loadedRun = initialSoftware === null ? null : "direct";
  }

  debugInfo(): string[] {
    return [`Player: (${formatFloat0(this.player.x)},${formatFloat0(this.player.y)})`];
  }
}

/** Whether a player rect at `r` would be inside a wall or the prize desk. */
export function blocked(s: State, r: Rect): boolean {
  return checkCollisions(r, s.walls) || checkCollisions(r, s.counters);
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
