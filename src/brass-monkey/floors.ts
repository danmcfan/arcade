// The layout of Brass Monkey's floors: where the girders, conveyors, ladders,
// exit door, Gnome, furnace, bolts and wrenches stand, in the floor's own pixels (224×256,
// top-left 0, 0). scripts/gen-brass-monkey-art.ts draws each floor from this
// and the tiles in art.ts into girder-floor.png and conveyor-floor.png; play.ts
// plays on them.

/**
 * A girder: its tiles from x0 up to x1 (exclusive), 8 px apart. Its top is at
 * y at x0 and moves `drop` px down every 16 px to the right (up when -1). A
 * conveyor is a flat girder with a `belt`, which carries what stands on it
 * left (-1) or right (1).
 */
export interface Girder {
  x0: number;
  x1: number;
  y: number;
  drop: -1 | 0 | 1;
  belt?: -1 | 1;
}

/** A point on a floor: x across, y the row its foot stands on (a girder's top). */
export interface Spot {
  x: number;
  y: number;
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

/**
 * A floor, `width` by `height` px, and where its pieces stand; `door` is the
 * exit door's foot, its left edge at x and its bottom row at y - 1. `gnome` is
 * the top-left of the Gnome's 32×32 frame, `start` the monkey's foot when the
 * floor starts, `bolts` the feet of the bolts to collect and `wrenches` the
 * feet of the wrenches to pick up (two a floor, as Donkey Kong's hammers).
 * `furnace`, on a floor that has one, is the foot of the furnace's middle,
 * 16 px wide: gears end in it and embers come out of it.
 */
export interface Floor {
  width: number;
  height: number;
  girders: readonly Girder[];
  ladders: readonly Ladder[];
  door: Spot;
  gnome: Spot;
  start: Spot;
  bolts: readonly Spot[];
  wrenches: readonly Spot[];
  furnace?: Spot;
}

/** The top of `g` at x. */
export function girderTop(g: Girder, x: number): number {
  return g.y + g.drop * Math.floor((x - g.x0) / 16);
}

/**
 * The girder floor, imported from the old workshop.png (picked in the #38
 * playground: T1): six sloped girders, the top platform with the exit door on
 * it, and the old workshop's ladders, broken ones and the two tall ladders
 * behind the Gnome (each capped by a girder) included. The bottom girder is
 * flat where the monkey walks (x 0-111, y 248).
 */
export const girderFloor: Floor = {
  width: 224,
  height: 256,
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
    // The caps on the two tall ladders.
    { x0: 64, x1: 72, y: 24, drop: 0 },
    { x0: 80, x1: 88, y: 24, drop: 0 },
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
  gnome: { x: 24, y: 52 },
  // As Donkey Kong's oil drum: at the bottom left, the monkey starting just right of it.
  furnace: { x: 8, y: 248 },
  start: { x: 24, y: 248 },
  bolts: [
    { x: 64, y: 212 },
    { x: 150, y: 179 },
    { x: 40, y: 144 },
    { x: 120, y: 115 },
  ],
  // As Donkey Kong's girder board: one low on the right, one higher on the left.
  wrenches: [
    { x: 168, y: 218 },
    { x: 24, y: 143 },
  ],
};

/**
 * The conveyor floor: three conveyors between a flat bottom girder and the
 * Gnome's girder, each running the other way to the one below it, so a gear
 * zigzags down; one ladder joins each pair, at alternate ends. The top
 * platform and its ladder are the girder floor's.
 */
export const conveyorFloor: Floor = {
  width: 224,
  height: 256,
  girders: [
    { x0: 0, x1: 224, y: 248, drop: 0 },
    { x0: 16, x1: 224, y: 208, drop: 0, belt: -1 },
    { x0: 0, x1: 208, y: 168, drop: 0, belt: 1 },
    { x0: 16, x1: 224, y: 128, drop: 0, belt: -1 },
    // The Gnome's girder: a gear rolls off its right end onto the top conveyor.
    { x0: 0, x1: 192, y: 88, drop: 0 },
    // The top platform.
    { x0: 88, x1: 136, y: 56, drop: 0 },
  ],
  ladders: [
    { x: 200, top: 216, bottom: 247 },
    { x: 24, top: 176, bottom: 207 },
    { x: 184, top: 136, bottom: 167 },
    { x: 40, top: 96, bottom: 127 },
    { x: 152, top: 96, bottom: 127 },
    { x: 128, top: 64, bottom: 87 },
  ],
  door: { x: 104, y: 56 },
  gnome: { x: 24, y: 56 },
  start: { x: 16, y: 248 },
  bolts: [
    { x: 120, y: 208 },
    { x: 100, y: 168 },
    { x: 160, y: 128 },
    { x: 170, y: 88 },
  ],
  wrenches: [
    { x: 60, y: 208 },
    { x: 100, y: 128 },
  ],
};

/** The floors in the order they are played. */
export const floors: readonly Floor[] = [girderFloor, conveyorFloor];
