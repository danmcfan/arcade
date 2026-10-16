// Port of internal/arcade/state.go.

import type { ArcadeTitle } from "../game/snapshot.ts";
import { checkCollision, checkCollisions, newWalls, type Rect } from "./collision.ts";
import { newPlayer, type Entity } from "./entity.ts";
import { newMachines, type Machine, type SoftwareFactory } from "./machine.ts";
import { changeMachineRect } from "./changeMachine.ts";
import { counterRects } from "./desk.ts";
import { Wallet } from "./wallet.ts";

export class State {
  player: Entity;
  walls: Rect[];
  machines: Machine[];
  /** The prize desk's rects: solid, and faced with Space to open the prize counter menu. */
  counters: Rect[];
  /** The change machine: solid, and faced with Space to trade tickets for a token. */
  changeMachine: Rect = { ...changeMachineRect };
  /** Whether the action key was down last tick: the change machine trades once per press. */
  actionHeld = false;
  /** What the scoreboard flashes after a press of the change machine, for `ticks` more ticks; null when nothing. */
  notice: { kind: "price" | "lastChance"; ticks: number } | null = null;

  melodyPlaying = false;
  /** Go `imageTitle` (nil → null), by name; the scoreboard shows it while the melody plays. */
  imageTitle: ArcadeTitle | null = null;
  /** Tokens, tickets, owned prizes and the high score. */
  wallet = new Wallet();

  constructor(factory: SoftwareFactory) {
    this.player = newPlayer();
    this.walls = newWalls();
    this.machines = newMachines(factory);
    this.counters = counterRects.map(({ x, y, w, h }) => ({ x, y, w, h }));
  }

  debugInfo(): string[] {
    return [`Player: (${formatFloat0(this.player.x)},${formatFloat0(this.player.y)})`];
  }
}

/** Whether a player rect at `r` would be inside a wall, the prize desk or the change machine. */
export function blocked(s: State, r: Rect): boolean {
  return checkCollisions(r, s.walls) || checkCollisions(r, s.counters) || checkCollision(r, s.changeMachine);
}

/** Go `arcade.NewState`; `factory` builds a machine's software. The Game starts any initial software itself. */
export function newState(factory: SoftwareFactory): State {
  return new State(factory);
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
