// Firefly's moving things: enemies, sparks and enemy shots, and the sprite
// frame for a heading. game.ts moves them; draw.ts draws them.

import type { FireflyEnemyState } from "../game/snapshot.ts";
import type { BezierConfig } from "./pattern.ts";
import type { EnemyKind } from "./rules.ts";

export interface Vec {
  x: number;
  y: number;
}

export interface Enemy {
  kind: EnemyKind;
  row: number;
  col: number;
  /** Its slot at sway 0. */
  home: Vec;
  state: FireflyEnemyState;
  x: number;
  y: number;
  dx: number;
  dy: number;
  hp: number;
  deadFrames: number;
  /** Ticks left before it flies in (while `waiting`). */
  wait: number;
  /** The curve it follows while entering or diving, how far along (0..1) and the step per tick. */
  path: BezierConfig | null;
  t: number;
  tStep: number;
  /** Shots still to drop on this dive, and ticks to the next. */
  shotsLeft: number;
  shotTimer: number;
  /** It left the formation to dive and is not back yet: a kill scores the diving points. */
  outOfFormation: boolean;
}

export interface Spark {
  x: number;
  y: number;
}

export interface Shot {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

/** Sprite-sheet row (per 90°) and column (per 15°) for an angle in degrees. */
export function frameAngle(degrees: number): [row: number, col: number] {
  const row = Math.trunc(degrees / 90);
  const col = Math.trunc((degrees % 90) / 15);
  return [row, col];
}

/** Go untyped constant `180 / math.Pi`, rounded once. */
export const radToDeg = 57.29577951308232;

/** Heading in degrees clockwise from up, in [0, 360). */
export function angle(heading: Vec): number {
  if (heading.x === 0 && heading.y === 0) {
    return 0;
  }

  let a = Math.atan2(heading.y, heading.x) * radToDeg;
  a += 90;

  if (a < 0) {
    a += 360;
  }

  return a;
}
