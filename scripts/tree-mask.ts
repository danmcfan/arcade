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

/** The fields of a lumberjack tree snapshot that `treeTopEdgeMasks` reads. */
export type TreeTop = Pick<LumberjackTreeSnapshot, "x" | "y" | "theta" | "health" | "shakeRight">;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isTreeTop(t: unknown): t is TreeTop {
  return (
    isRecord(t) &&
    typeof t["x"] === "number" &&
    typeof t["y"] === "number" &&
    typeof t["theta"] === "number" &&
    typeof t["health"] === "number" &&
    typeof t["shakeRight"] === "boolean"
  );
}

/**
 * The `trees` of a lumberjack trace snapshot (parsed JSON), checking the
 * fields `treeTopEdgeMasks` reads; throws if the snapshot is not
 * lumberjack-shaped.
 */
export function lumberjackTrees(snapshot: unknown): TreeTop[] {
  const trees = isRecord(snapshot) ? snapshot["trees"] : undefined;
  if (!Array.isArray(trees)) throw new Error("not a lumberjack snapshot: no trees array");
  return trees.map((t: unknown, i) => {
    if (!isTreeTop(t)) throw new Error(`not a lumberjack snapshot: bad trees[${i}]`);
    return t;
  });
}

/**
 * 1×1 masks for the edge pixels of every rotated, visible tree top inside a
 * `width × height` frame. Unrotated trees (theta 0) and felled trees
 * (health ≤ 0, not drawn) get no mask.
 */
/** The frame-clipped bounding box of a rotated tree frame, plus a pixel of slack. */
function rotatedBounds(
  corners: readonly (readonly [number, number])[],
  width: number,
  height: number,
): { x0: number; x1: number; y0: number; y1: number } {
  return {
    x0: Math.max(0, Math.floor(Math.min(...corners.map((c) => c[0]))) - 1),
    x1: Math.min(width, Math.ceil(Math.max(...corners.map((c) => c[0]))) + 1),
    y0: Math.max(0, Math.floor(Math.min(...corners.map((c) => c[1]))) - 1),
    y1: Math.min(height, Math.ceil(Math.max(...corners.map((c) => c[1]))) + 1),
  };
}

/** Push a 1×1 mask for each edge pixel of tree `t` not already in `seen`. */
function addTreeMasks(
  t: TreeTop,
  opaque: TexelOpaque,
  width: number,
  height: number,
  seen: Set<number>,
  masks: Mask[],
): void {
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
  const { x0, x1, y0, y1 } = rotatedBounds(corners, width, height);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const c = texel(x + 0.5, y + 0.5);
      const edge = texel(x, y) !== c || texel(x + 1, y) !== c || texel(x, y + 1) !== c || texel(x + 1, y + 1) !== c;
      const key = y * width + x;
      if (!edge || seen.has(key)) continue;
      seen.add(key);
      masks.push({ x, y, w: 1, h: 1 });
    }
  }
}

export function treeTopEdgeMasks(
  trees: readonly TreeTop[],
  opaque: TexelOpaque,
  width: number,
  height: number,
): Mask[] {
  const masks: Mask[] = [];
  const seen = new Set<number>();
  for (const t of trees) {
    if (t.health <= 0 || t.theta === 0) continue;
    addTreeMasks(t, opaque, width, height, seen, masks);
  }
  return masks;
}
