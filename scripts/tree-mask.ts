// Phase 4 tolerance for lumberjack's rotated tree tops (D13, §5 Phase 4):
// the only frame pixels allowed to differ from Go are the edge pixels of
// each rotated tree top, derived from the snapshot.
//
// Canvas and the Go engine both sample the rotated sprite with the nearest
// filter, but they disagree on which pixels an edge covers (the Go engine
// nudges every vertex with `adjustDestinationPixel`, Canvas antialiases the
// quad edge). A destination pixel is an edge pixel when its footprint
// straddles an opaque/transparent texel boundary of the tree-top image:
// the texel under the pixel centre and the ones under its four corners do
// not all agree on being opaque. Interior pixels and colour changes inside
// the canopy are not masked.

import type { LumberjackTreeSnapshot } from "../src/game/snapshot.ts";
import type { Mask } from "./frame-diff.ts";

// src/lab/lumberjack/tree.ts: 64×80 frame (1, 0) of Big_Oak_Tree.png, rows
// [56, 80) cleared on the top image; pivot (26 or 37, 58).
export const FRAME_W = 64;
export const FRAME_H = 80;
const SPLIT_HEIGHT = 56;
const PIVOT_X_LEFT = 26;
const PIVOT_X_RIGHT = 37;
const PIVOT_Y = 58;

/** Opacity of the tree-top image at integer texel (u, v) of the 64×80 frame. */
export type TexelOpaque = (u: number, v: number) => boolean;

/** Tree-top opacity from Big_Oak_Tree.png's RGBA data (192×80, frame 1 at x = 64). */
export function treeTopTexels(sheet: { width: number; data: Uint8Array }): TexelOpaque {
  return (u, v) => {
    if (u < 0 || u >= FRAME_W || v < 0 || v >= SPLIT_HEIGHT) return false;
    return (sheet.data[(v * sheet.width + FRAME_W + u) * 4 + 3] ?? 0) > 0;
  };
}

const TREE_NUMBERS = ["x", "y", "theta", "health"] as const;

/**
 * The `trees` of a lumberjack trace snapshot (parsed JSON), checking the
 * fields `treeTopEdgeMasks` reads; throws if the snapshot is not
 * lumberjack-shaped.
 */
export function lumberjackTrees(snapshot: unknown): LumberjackTreeSnapshot[] {
  const trees = (snapshot as { trees?: unknown } | null)?.trees;
  if (!Array.isArray(trees)) throw new Error("not a lumberjack snapshot: no trees array");
  for (const [i, t] of trees.entries()) {
    const ok =
      typeof t === "object" &&
      t !== null &&
      TREE_NUMBERS.every((k) => typeof (t as Record<string, unknown>)[k] === "number") &&
      typeof (t as Record<string, unknown>).shakeRight === "boolean";
    if (!ok) throw new Error(`not a lumberjack snapshot: bad trees[${i}]`);
  }
  return trees as LumberjackTreeSnapshot[];
}

/**
 * 1×1 masks for the edge pixels of every rotated, visible tree top inside a
 * `width × height` frame. Unrotated trees (theta 0) and felled trees
 * (health ≤ 0, not drawn) get no mask.
 */
export function treeTopEdgeMasks(
  trees: readonly LumberjackTreeSnapshot[],
  opaque: TexelOpaque,
  width: number,
  height: number,
): Mask[] {
  const masks: Mask[] = [];
  const seen = new Set<number>();
  for (const t of trees) {
    if (t.health <= 0 || t.theta === 0) continue;
    const minX = t.x - FRAME_W / 2;
    const minY = t.y - FRAME_H / 2;
    const px = t.shakeRight ? PIVOT_X_RIGHT : PIVOT_X_LEFT;
    const cos = Math.cos(t.theta);
    const sin = Math.sin(t.theta);
    // Destination → texel: inverse of Translate(-p) Rotate(θ) Translate(p) Translate(min).
    const texel = (x: number, y: number): boolean => {
      const dx = x - minX - px;
      const dy = y - minY - PIVOT_Y;
      const u = cos * dx + sin * dy + px;
      const v = -sin * dx + cos * dy + PIVOT_Y;
      return opaque(Math.floor(u), Math.floor(v));
    };
    // Bounding box of the rotated frame, plus a pixel of slack.
    const corners = [
      [0, 0],
      [FRAME_W, 0],
      [0, FRAME_H],
      [FRAME_W, FRAME_H],
    ].map(([u = 0, v = 0]) => {
      const dx = u - px;
      const dy = v - PIVOT_Y;
      return [cos * dx - sin * dy + px + minX, sin * dx + cos * dy + PIVOT_Y + minY] as const;
    });
    const x0 = Math.max(0, Math.floor(Math.min(...corners.map((c) => c[0]))) - 1);
    const x1 = Math.min(width, Math.ceil(Math.max(...corners.map((c) => c[0]))) + 1);
    const y0 = Math.max(0, Math.floor(Math.min(...corners.map((c) => c[1]))) - 1);
    const y1 = Math.min(height, Math.ceil(Math.max(...corners.map((c) => c[1]))) + 1);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const c = texel(x + 0.5, y + 0.5);
        const edge =
          texel(x, y) !== c || texel(x + 1, y) !== c || texel(x, y + 1) !== c || texel(x + 1, y + 1) !== c;
        const key = y * width + x;
        if (edge && !seen.has(key)) {
          seen.add(key);
          masks.push({ x, y, w: 1, h: 1 });
        }
      }
    }
  }
  return masks;
}
