// The layout of Brass Monkey's floors: where the girders, ladders and exit
// door stand, in the floor's own pixels (224×256, top-left 0, 0).
// scripts/gen-brass-monkey-art.ts draws the girder floor from this and the
// tiles in art.ts into girder-floor.png; #39 plays on it.

/**
 * A girder: its tiles from x0 up to x1 (exclusive), 8 px apart. Its top is at
 * y at x0 and moves `drop` px down every 16 px to the right (up when -1).
 */
export interface Girder {
  x0: number;
  x1: number;
  y: number;
  drop: -1 | 0 | 1;
}

/**
 * A ladder 8 px wide at x, from row `top` down to row `bottom` (inclusive).
 * A broken ladder has a `gap`: rows `gap[0]` to `gap[1]` are missing.
 */
export interface Ladder {
  x: number;
  top: number;
  bottom: number;
  gap?: readonly [number, number];
}

/** Where a floor's pieces stand; `door` is the exit door's foot, its left edge at x and its bottom row at y - 1. */
export interface Floor {
  girders: readonly Girder[];
  ladders: readonly Ladder[];
  door: { x: number; y: number };
}

/** The top of `g` at x. */
export function girderTop(g: Girder, x: number): number {
  return g.y + g.drop * Math.floor((x - g.x0) / 16);
}

/**
 * The girder floor, imported from the old workshop.png (picked in the #38
 * playground: T1): six sloped girders, the top platform with the exit door on
 * it, and the old workshop's ladders, broken ones and the two tall ladders
 * behind the Gnome included. The bottom girder is flat where the monkey walks
 * (x 0-111, y 248).
 */
export const girderFloor: Floor = {
  girders: [
    { x0: 0, x1: 112, y: 248, drop: 0 },
    { x0: 112, x1: 224, y: 247, drop: -1 },
    { x0: 0, x1: 208, y: 208, drop: 1 },
    { x0: 16, x1: 224, y: 187, drop: -1 },
    { x0: 0, x1: 208, y: 142, drop: 1 },
    { x0: 16, x1: 224, y: 121, drop: -1 },
    { x0: 0, x1: 144, y: 84, drop: 0 },
    { x0: 144, x1: 208, y: 85, drop: 1 },
    // The top platform.
    { x0: 88, x1: 136, y: 56, drop: 0 },
  ],
  ladders: [
    { x: 32, top: 128, bottom: 143 },
    { x: 32, top: 194, bottom: 209 },
    { x: 72, top: 126, bottom: 145 },
    { x: 96, top: 190, bottom: 213 },
    { x: 112, top: 157, bottom: 180 },
    { x: 184, top: 95, bottom: 110 },
    { x: 184, top: 161, bottom: 176 },
    { x: 184, top: 227, bottom: 242 },
    { x: 64, top: 154, bottom: 183, gap: [160, 175] },
    { x: 80, top: 221, bottom: 247, gap: [224, 239] },
    { x: 88, top: 92, bottom: 116, gap: [96, 103] },
    { x: 168, top: 120, bottom: 151, gap: [128, 143] },
    // Up to the top platform.
    { x: 128, top: 64, bottom: 83 },
    // The two tall ladders behind the Gnome, up from the top girder.
    { x: 64, top: 32, bottom: 83 },
    { x: 80, top: 32, bottom: 83 },
  ],
  door: { x: 104, y: 56 },
};
