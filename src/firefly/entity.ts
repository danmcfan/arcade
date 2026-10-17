// Firefly's moving things: enemies, sparks and enemy shots, and the sprite
// frame for a heading. game.ts moves them; draw.ts draws them.

import type { FireflyEnemyState } from "../game/snapshot.ts";
import type { Path } from "./pattern.ts";
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
  path: Path | null;
  t: number;
  tStep: number;
  /** Shots still to drop on this dive, and ticks to the next. */
  shotsLeft: number;
  shotTimer: number;
  /** Ticks left of its tractor beam (while `beaming`). */
  beamTicks: number;
  /** It left the formation to dive and is not back yet: a kill scores the diving points. */
  outOfFormation: boolean;
  /** The diving Owl this Wasp escorts, flying `escortDx` px beside it; null when on its own. */
  escortOf: Enemy | null;
  escortDx: number;
  /** An Owl's escorts shot down on its current dive: its kill scores the escort-kill bonus. */
  escortsKilled: number;
}

/** A captured firefly, red, above the Owl that took it; `y` climbs while the beam pulls it up. */
export interface Captive {
  /** The Owl holding it; null once it turned hostile. */
  owl: Enemy | null;
  /** Its Owl was shot in formation: it dives at the firefly like an enemy. */
  hostile: boolean;
  x: number;
  y: number;
}

export interface Spark {
  x: number;
  y: number;
}

/** The points of an escort-kill bonus, shown where the Owl was shot. */
export interface Bonus {
  points: number;
  x: number;
  y: number;
  /** Ticks left on the screen. */
  ticks: number;
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
