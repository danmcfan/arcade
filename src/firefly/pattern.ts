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

/** Curves flown one after another, each starting where the one before ends. */
export type Path = readonly BezierConfig[];

/** Rough length of a curve, from 16 straight pieces. */
function curveLength(c: BezierConfig): number {
  const f = newBezierPatternFunc(c);
  let len = 0;
  let prev = f(0);
  for (let i = 1; i <= 16; i++) {
    const p = f(i / 16);
    len += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return len;
}

/** Rough length of a whole path. */
export function pathLength(path: Path): number {
  return path.reduce((len, c) => len + curveLength(c), 0);
}

/**
 * The path's curves chained, `t` in [0, 1] shared out by each curve's length
 * so a fixed step covers about the same ground on every curve.
 */
export function newPathPatternFunc(path: Path): PatternFunc {
  const first = path[0];
  if (first === undefined) throw new Error("empty path");
  for (let i = 1; i < path.length; i++) {
    const prev = path[i - 1];
    const next = path[i];
    if (prev !== undefined && next !== undefined && (prev.p3.x !== next.p0.x || prev.p3.y !== next.p0.y)) {
      throw new Error(`path curve ${i} does not start where curve ${i - 1} ends`);
    }
  }
  if (path.length === 1) return newBezierPatternFunc(first);
  const parts = path.map((c) => ({ f: newBezierPatternFunc(c), len: curveLength(c) }));
  const total = parts.reduce((a, b) => a + b.len, 0);
  const end = path.at(-1)?.p3 ?? first.p0;
  return (t: number): Vec => {
    if (t >= 1) return end;
    let left = t * total;
    for (const { f, len } of parts) {
      if (left <= len) return f(len === 0 ? 1 : left / len);
      left -= len;
    }
    return end;
  };
}
