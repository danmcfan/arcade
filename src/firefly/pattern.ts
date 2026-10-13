// Cubic bezier curves: the paths Firefly enemies fly in on and dive along.

import type { Vec } from "./entity.ts";

export type PatternFunc = (t: number) => Vec;

export interface BezierConfig {
  readonly p0: Vec;
  readonly p1: Vec;
  readonly p2: Vec;
  readonly p3: Vec;
}

/** Cubic bezier through the four control points, `t` in [0, 1]. */
export function newBezierPatternFunc(config: BezierConfig): PatternFunc {
  return (t: number): Vec => {
    // Same expression order as Go, so the IEEE results match (§6).
    const tt = t * t;
    const ttt = t * t * t;

    const u = 1 - t;
    const uu = u * u;
    const uuu = uu * u;

    const x = uuu * config.p0.x + 3 * uu * t * config.p1.x + 3 * u * tt * config.p2.x + ttt * config.p3.x;
    const y = uuu * config.p0.y + 3 * uu * t * config.p1.y + 3 * u * tt * config.p2.y + ttt * config.p3.y;

    return { x, y };
  };
}
