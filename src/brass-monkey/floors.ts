// The layout of Brass Monkey's floors: where the girders, conveyors, ladders,
// exit door, Gnome and bolts stand, in the floor's own pixels (224×256,
// top-left 0, 0). scripts/gen-brass-monkey-art.ts draws each floor from this
// and the tiles in art.ts into girder-floor.png, conveyor-floor.png and
// elevator-floor.png; play.ts plays on them.

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
 * A lift shaft `liftWidth` px wide from x, its platforms moving `dir` (up -1,
 * down 1) on a loop: a platform's top runs between rows `top` and `bottom`,
 * and one that reaches an end comes back at the other. `platforms` are spaced
 * evenly along it.
 */
export interface Shaft {
  x: number;
  top: number;
  bottom: number;
  dir: -1 | 1;
  platforms: number;
}

/** A lift platform's width, and its shaft's: two girder tiles. */
export const liftWidth = 16;

/** Where the springs go: they bounce right along the girder whose top is at y, then drop at x `dropX`. */
export interface Springs {
  y: number;
  dropX: number;
}

/**
 * A floor, `width` by `height` px, and where its pieces stand; `door` is the
 * exit door's foot, its left edge at x and its bottom row at y - 1. `gnome` is
 * the top-left of the Gnome's 32×32 frame, `start` the monkey's foot when the
 * floor starts, and `bolts` the feet of the bolts to collect. A floor with
 * `pans` sends no gears: its conveyors carry pans. On a floor with `lifts`,
 * the monkey rides their platforms; on one with `springs`, the Gnome sends
 * springs instead of gears. The rivet floor has no door: `rivets` are the
 * feet of its 8 rivet slots, each in the middle of an 8 px girder tile,
 * pulled to clear it.
 */
export interface Floor {
  width: number;
  height: number;
  girders: readonly Girder[];
  ladders: readonly Ladder[];
  door?: Spot;
  gnome: Spot;
  start: Spot;
  bolts: readonly Spot[];
  pans?: boolean;
  lifts?: readonly Shaft[];
  springs?: Springs;
  rivets?: readonly Spot[];
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
  start: { x: 16, y: 248 },
  bolts: [
    { x: 64, y: 212 },
    { x: 150, y: 179 },
    { x: 40, y: 144 },
    { x: 120, y: 115 },
  ],
};

/**
 * The conveyor floor: three conveyors between a flat bottom girder and the
 * Gnome's girder, each running the other way to the one below it, so a gear
 * zigzags down; one ladder joins each pair, at alternate ends. The top
 * platform and its ladder are the girder floor's. As Donkey Kong's 50m board,
 * the belts carry pans.
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
  pans: true,
  start: { x: 16, y: 248 },
  bolts: [
    { x: 120, y: 208 },
    { x: 100, y: 168 },
    { x: 160, y: 128 },
    { x: 170, y: 88 },
  ],
};

/**
 * The tops of `shaft`'s platforms once they have moved `travel` px, in order:
 * the first starts at the end they move away from.
 */
export function liftTops(shaft: Shaft, travel: number): number[] {
  const span = shaft.bottom - shaft.top;
  return Array.from({ length: shaft.platforms }, (_, n) => {
    const along = (((travel + (n * span) / shaft.platforms) % span) + span) % span;
    return shaft.dir > 0 ? shaft.top + along : shaft.bottom - along;
  });
}

/**
 * The elevator floor, as Donkey Kong's 75m board: the monkey starts on a
 * stub of girder at the bottom left, rides the up lift (x 40) to two islands
 * joined by a ladder, crosses on the down lift (x 152) to the right-hand
 * girders, climbs them to a ledge under the Gnome's girder and jumps the gap
 * to it, then goes left to the top platform's ladder. The Gnome's springs
 * bounce along its girder and drop through that gap (x 192), past the
 * right-hand ladders. Being carried off the top of the up shaft, or off the
 * bottom of the down one, costs a life.
 */
export const elevatorFloor: Floor = {
  width: 224,
  height: 256,
  girders: [
    { x0: 0, x1: 40, y: 248, drop: 0 },
    // The islands between the shafts.
    { x0: 56, x1: 112, y: 192, drop: 0 },
    { x0: 96, x1: 152, y: 152, drop: 0 },
    // The right-hand girders, then the ledge under the Gnome's girder.
    { x0: 168, x1: 224, y: 232, drop: 0 },
    { x0: 168, x1: 224, y: 192, drop: 0 },
    { x0: 168, x1: 224, y: 144, drop: 0 },
    { x0: 200, x1: 224, y: 88, drop: 0 },
    // The Gnome's girder: springs bounce off its right end.
    { x0: 0, x1: 184, y: 88, drop: 0 },
    // The top platform.
    { x0: 88, x1: 136, y: 56, drop: 0 },
  ],
  ladders: [
    { x: 100, top: 160, bottom: 191 },
    { x: 208, top: 200, bottom: 231 },
    { x: 176, top: 152, bottom: 191 },
    { x: 208, top: 96, bottom: 143 },
    { x: 128, top: 64, bottom: 87 },
  ],
  lifts: [
    { x: 40, top: 104, bottom: 254, dir: -1, platforms: 3 },
    { x: 152, top: 136, bottom: 256, dir: 1, platforms: 2 },
  ],
  springs: { y: 88, dropX: 192 },
  door: { x: 104, y: 56 },
  gnome: { x: 24, y: 56 },
  start: { x: 16, y: 248 },
  bolts: [
    { x: 76, y: 192 },
    { x: 136, y: 152 },
    { x: 216, y: 232 },
    { x: 160, y: 88 },
  ],
};

/**
 * The rivet floor, as Donkey Kong's 100m board: five flat girders, the four
 * upper ones each held by two rivet slots, one either side, and the Gnome on
 * the top one. Ladders join each pair, clear of the slots. No exit door: the
 * floor is cleared by pulling all 8 rivets.
 */
export const rivetFloor: Floor = {
  width: 224,
  height: 256,
  girders: [
    { x0: 0, x1: 224, y: 248, drop: 0 },
    { x0: 0, x1: 224, y: 208, drop: 0 },
    { x0: 0, x1: 224, y: 168, drop: 0 },
    { x0: 0, x1: 224, y: 128, drop: 0 },
    { x0: 16, x1: 208, y: 88, drop: 0 },
  ],
  ladders: [
    { x: 8, top: 216, bottom: 247 },
    { x: 104, top: 216, bottom: 247 },
    { x: 208, top: 216, bottom: 247 },
    { x: 24, top: 176, bottom: 207 },
    { x: 192, top: 176, bottom: 207 },
    { x: 8, top: 136, bottom: 167 },
    { x: 104, top: 136, bottom: 167 },
    { x: 208, top: 136, bottom: 167 },
    { x: 32, top: 96, bottom: 127 },
    { x: 184, top: 96, bottom: 127 },
  ],
  gnome: { x: 96, y: 56 },
  start: { x: 56, y: 248 },
  bolts: [],
  rivets: [
    { x: 52, y: 208 },
    { x: 172, y: 208 },
    { x: 52, y: 168 },
    { x: 172, y: 168 },
    { x: 52, y: 128 },
    { x: 172, y: 128 },
    { x: 52, y: 88 },
    { x: 172, y: 88 },
  ],
};

/** The floors in the order they are played. */
export const floors: readonly Floor[] = [girderFloor, conveyorFloor, elevatorFloor, rivetFloor];

/** Each loop's floors in order, as Donkey Kong's international board order; the last repeats. */
const plans: readonly (readonly Floor[])[] = [
  [girderFloor, rivetFloor],
  [girderFloor, elevatorFloor, rivetFloor],
  [girderFloor, conveyorFloor, elevatorFloor, rivetFloor],
  [girderFloor, conveyorFloor, girderFloor, elevatorFloor, rivetFloor],
  [girderFloor, conveyorFloor, girderFloor, elevatorFloor, girderFloor, rivetFloor],
];

/**
 * The floors loop `loop` plays, in order: 25-100, then 25-75-100,
 * 25-50-75-100, 25-50-25-75-100, and 25-50-25-75-25-100 from the fifth loop on.
 */
export function floorsFor(loop: number): readonly Floor[] {
  return plans[Math.min(loop, plans.length - 1)] ?? floors;
}
