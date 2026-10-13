// Port of internal/hive/entity.go.

import { opposite, type Axis, type Direction } from "../engine/input.ts";
import type { Sprite } from "../engine/image.ts";
import type { PremulColor } from "../engine/surface.ts";
import type { HiveEnemyKind } from "../game/snapshot.ts";
import { imageBear, imageBee, imageFood } from "../engine/assets.ts";

export const tileSize = 8;
export const tileWidth = 28;
export const tileHeight = 36;

// Hive food atlas (food.png): two rows of four 8×12 frames (32×24). Small pellets use row 1 (y=0);
// power pellets use row 2 (y=12).
export const pelletAtlasCellW = 8;
export const pelletAtlasCellH = 12;
export const pelletAtlasSmallRowY = 0;
export const pelletAtlasPowerRowY = pelletAtlasSmallRowY + pelletAtlasCellH;
export const pelletAnimHoldTicks = 15;
export const pelletAnimFrameCount = 4;

// Go untyped constants are folded exactly at compile time (fact 3): hard-coded
// as literals, checked by entity.test.ts.
export const velocityMax = 1.25;

/** velocityMax * 0.8 */
export const velocityPlayerNormal = 1.0;
/** velocityMax * 0.9 */
export const velocityPlayerPower = 1.125;

/** velocityMax * 0.75 */
export const velocityEnemyNormal = 0.9375;
/** velocityMax * 0.50 */
export const velocityEnemyPower = 0.625;
/** velocityMax * 0.40 */
export const velocityEnemyTunnel = 0.5;

/** Tunnel row: `8*17+4` (update.go, state.go). */
export const tunnelRowY = 140;
/** `tileSize*4.5` (state.go:176). */
export const tunnelLeftX = 36;
/** `tileSize*(tileWidth-4.5)` (state.go:176). */
export const tunnelRightX = 188;

export interface Tile {
  x: number;
  y: number;
}

/** Go compares `tile` structs by value; never use `===` on tiles. */
export function tileEq(a: Tile, b: Tile): boolean {
  return a.x === b.x && a.y === b.y;
}

export const targetTopLeft: Readonly<Tile> = { x: 2, y: 0 };
export const targetTopRight: Readonly<Tile> = { x: tileWidth - 3, y: 0 };
export const targetBottomLeft: Readonly<Tile> = { x: 0, y: tileHeight - 2 };
export const targetBottomRight: Readonly<Tile> = { x: tileWidth - 1, y: tileHeight - 2 };

// Premultiplied Go color.RGBA values; debug drawing only. Identity is `kind`.
export const colorRed: PremulColor = { r: 255, g: 0, b: 0, a: 128 };
export const colorPink: PremulColor = { r: 255, g: 0, b: 180, a: 128 };
export const colorTeal: PremulColor = { r: 0, g: 255, b: 220, a: 128 };
export const colorOrange: PremulColor = { r: 255, g: 128, b: 0, a: 128 };

const kindColors: Record<HiveEnemyKind, PremulColor> = {
  red: colorRed,
  pink: colorPink,
  teal: colorTeal,
  orange: colorOrange,
};

export function pointToTile(x: number, y: number): Tile {
  return { x: Math.trunc(x / tileSize), y: Math.trunc(y / tileSize) };
}

/** Go `math.Sqrt(math.Pow(dx, 2) + math.Pow(dy, 2))` on ints (exact as dx*dx). */
export function distance(a: Tile, b: Tile): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Go `Direction.Axis()`: anything that is not Up/Down (including "") is horizontal. */
export function dirAxis(d: Direction | ""): Axis {
  return d === "UP" || d === "DOWN" ? "VERTICAL" : "HORIZONTAL";
}

/** Go `Direction.Opposite()`: panics (throws) on "". */
export function dirOpposite(d: Direction | ""): Direction {
  if (d === "") {
    throw new Error("invalid direction: ");
  }
  return opposite(d);
}

/** Go `hive.Entity`. Fields default to Go zero values. */
export class Entity {
  sprite: Sprite | null = null;
  /** Enemy identity (Go compares `e.color`); null for non-enemies. */
  kind: HiveEnemyKind | null = null;
  /** Debug drawing only. */
  color: PremulColor | null = null;
  /** Go `e.Sprite == assets.ImageFood`. */
  isFood = false;

  frame = 0;
  frameIncrement = 0;
  frameTotal = 0;
  /** Go `map[Direction]int`; a nil map (or missing key) reads as 0. */
  frameDirection: Record<Direction, number> | null = null;

  x = 0;
  y = 0;
  width = 0;
  height = 0;
  direction: Direction | "" = "";
  directions: Direction[] = [];
  velocity = 0;

  reverseDirection = false;
  reverseTile: Tile = { x: 0, y: 0 };

  home = false;
  dotMinimum = 0;

  blueFrames = 0;
  flashFrames = 0;
  flash = false;

  /** Hidden skips drawing only; gameplay states own when this is toggled. */
  hidden = false;

  /** Distinguishes power pellets from small dots within the hive food atlas. */
  powerPellet = false;

  target: Tile = { x: 0, y: 0 };

  isPellet(): boolean {
    return !this.powerPellet && this.isFood;
  }

  isPower(): boolean {
    return this.powerPellet && this.isFood;
  }
}

export function newPlayer(): Entity {
  const e = new Entity();
  e.sprite = imageBear;
  e.frameIncrement = 0.1;
  e.frameTotal = 4;
  e.frameDirection = { DOWN: 0, UP: 1, LEFT: 2, RIGHT: 3 };
  e.x = 112;
  e.y = 212;
  e.width = 16;
  e.height = 16;
  e.direction = "DOWN";
  e.velocity = velocityMax;
  return e;
}

export function newEnemies(): Entity[] {
  return [
    newEnemy(14, 14.5, "RIGHT", targetTopLeft, "red", false, 0),
    newEnemy(14, 17.5, "LEFT", targetTopRight, "pink", true, 0),
    newEnemy(12, 17.5, "RIGHT", targetBottomLeft, "teal", true, 30),
    newEnemy(16, 17.5, "LEFT", targetBottomRight, "orange", true, 60),
  ];
}

function newEnemy(
  tx: number,
  ty: number,
  direction: Direction,
  target: Readonly<Tile>,
  kind: HiveEnemyKind,
  home: boolean,
  dotMinimum: number,
): Entity {
  const e = new Entity();
  e.sprite = imageBee;
  e.kind = kind;
  e.color = kindColors[kind];
  e.frameIncrement = 0.1;
  e.frameTotal = 4;
  e.frameDirection = { DOWN: 0, UP: 1, LEFT: 1, RIGHT: 0 };
  e.x = tileSize * tx;
  e.y = tileSize * ty;
  e.width = 16;
  e.height = 16;
  e.direction = direction;
  e.velocity = 0.75;
  e.target = { ...target };
  e.home = home;
  e.dotMinimum = dotMinimum;
  return e;
}

/** Item slots are nullable: an eaten item becomes null and keeps its slot. */
export function newItems(): (Entity | null)[] {
  return [
    // Rows of pellets
    ...newPelletRow(1, 12, 1),
    ...newPelletRow(15, 26, 1),
    ...newPelletRow(1, 26, 5),
    ...newPelletRow(1, 6, 8),
    ...newPelletRow(9, 12, 8),
    ...newPelletRow(15, 18, 8),
    ...newPelletRow(21, 26, 8),
    ...newPelletRow(1, 12, 20),
    ...newPelletRow(15, 26, 20),
    ...newPelletRow(6, 12, 23),
    ...newPelletRow(15, 21, 23),
    ...newPelletRow(1, 6, 26),
    ...newPelletRow(9, 12, 26),
    ...newPelletRow(15, 18, 26),
    ...newPelletRow(21, 26, 26),
    ...newPelletRow(1, 26, 29),

    // Columns of pellets
    ...newPelletColumn(9, 19, 6),
    ...newPelletColumn(9, 19, 21),
    ...newPelletColumn(2, 4, 6),
    ...newPelletColumn(2, 4, 12),
    ...newPelletColumn(2, 4, 15),
    ...newPelletColumn(2, 4, 21),
    ...newPelletColumn(6, 7, 1),
    ...newPelletColumn(6, 7, 6),
    ...newPelletColumn(6, 7, 9),
    ...newPelletColumn(6, 7, 18),
    ...newPelletColumn(6, 7, 21),
    ...newPelletColumn(6, 7, 26),
    ...newPelletColumn(21, 22, 1),
    ...newPelletColumn(21, 22, 6),
    ...newPelletColumn(21, 22, 12),
    ...newPelletColumn(21, 22, 15),
    ...newPelletColumn(21, 22, 21),
    ...newPelletColumn(21, 22, 26),
    ...newPelletColumn(23, 25, 3),
    ...newPelletColumn(23, 25, 24),
    ...newPelletColumn(24, 25, 6),
    ...newPelletColumn(24, 25, 9),
    ...newPelletColumn(24, 25, 18),
    ...newPelletColumn(24, 25, 21),
    ...newPelletColumn(27, 28, 1),
    ...newPelletColumn(27, 28, 12),
    ...newPelletColumn(27, 28, 15),
    ...newPelletColumn(27, 28, 26),

    // Individual pellets
    newPellet(1, 2),
    newPellet(1, 4),
    newPellet(26, 2),
    newPellet(26, 4),
    newPellet(2, 23),
    newPellet(25, 23),

    // Power pellets
    newPower(1, 3),
    newPower(26, 3),
    newPower(1, 23),
    newPower(26, 23),
  ];
}

function newPelletRow(txa: number, txb: number, ty: number): Entity[] {
  const food: Entity[] = [];
  for (let tx = txa; tx <= txb; tx++) {
    food.push(newPellet(tx, ty));
  }
  return food;
}

function newPelletColumn(tya: number, tyb: number, tx: number): Entity[] {
  const food: Entity[] = [];
  for (let ty = tya; ty <= tyb; ty++) {
    food.push(newPellet(tx, ty));
  }
  return food;
}

function newPellet(tx: number, ty: number): Entity {
  const e = new Entity();
  e.sprite = imageFood;
  e.isFood = true;
  e.frameTotal = 1;
  e.x = 8 * tx + 4;
  e.y = 8 * (ty + 3) + 4;
  e.width = pelletAtlasCellW;
  e.height = pelletAtlasCellH;
  return e;
}

function newPower(tx: number, ty: number): Entity {
  const e = newPellet(tx, ty);
  e.powerPellet = true;
  return e;
}

export function newCorners(): Entity[] {
  return [
    // ROW 1
    newCorner(1, 1, "DOWN", "RIGHT"),
    newCorner(6, 1, "DOWN", "LEFT", "RIGHT"),
    newCorner(12, 1, "DOWN", "LEFT"),
    newCorner(15, 1, "DOWN", "RIGHT"),
    newCorner(21, 1, "DOWN", "LEFT", "RIGHT"),
    newCorner(26, 1, "DOWN", "LEFT"),
    // ROW 5
    newCorner(1, 5, "UP", "DOWN", "RIGHT"),
    newCorner(6, 5, "UP", "DOWN", "LEFT", "RIGHT"),
    newCorner(9, 5, "DOWN", "LEFT", "RIGHT"),
    newCorner(12, 5, "UP", "LEFT", "RIGHT"),
    newCorner(15, 5, "UP", "LEFT", "RIGHT"),
    newCorner(18, 5, "DOWN", "LEFT", "RIGHT"),
    newCorner(21, 5, "UP", "DOWN", "LEFT", "RIGHT"),
    newCorner(26, 5, "UP", "DOWN", "LEFT"),
    // ROW 8
    newCorner(1, 8, "UP", "RIGHT"),
    newCorner(6, 8, "UP", "DOWN", "LEFT"),
    newCorner(9, 8, "UP", "RIGHT"),
    newCorner(12, 8, "DOWN", "LEFT"),
    newCorner(15, 8, "DOWN", "RIGHT"),
    newCorner(18, 8, "UP", "LEFT"),
    newCorner(21, 8, "UP", "DOWN", "RIGHT"),
    newCorner(26, 8, "UP", "LEFT"),
    // ROW 11
    newCorner(9, 11, "DOWN", "RIGHT"),
    newCorner(12, 11, "UP", "LEFT", "RIGHT"),
    newCorner(15, 11, "UP", "LEFT", "RIGHT"),
    newCorner(18, 11, "DOWN", "LEFT"),
    // ROW 14
    newCorner(6, 14, "UP", "DOWN", "LEFT", "RIGHT"),
    newCorner(9, 14, "UP", "DOWN", "LEFT"),
    newCorner(18, 14, "UP", "DOWN", "RIGHT"),
    newCorner(21, 14, "UP", "DOWN", "LEFT", "RIGHT"),
    // ROW 17
    newCorner(9, 17, "UP", "DOWN", "RIGHT"),
    newCorner(18, 17, "UP", "DOWN", "LEFT"),
    // ROW 20
    newCorner(1, 20, "DOWN", "RIGHT"),
    newCorner(6, 20, "UP", "DOWN", "LEFT", "RIGHT"),
    newCorner(9, 20, "UP", "LEFT", "RIGHT"),
    newCorner(12, 20, "DOWN", "LEFT"),
    newCorner(15, 20, "DOWN", "RIGHT"),
    newCorner(18, 20, "UP", "LEFT", "RIGHT"),
    newCorner(21, 20, "UP", "DOWN", "LEFT", "RIGHT"),
    newCorner(26, 20, "DOWN", "LEFT"),
    // ROW 23
    newCorner(1, 23, "UP", "RIGHT"),
    newCorner(3, 23, "DOWN", "LEFT"),
    newCorner(6, 23, "UP", "DOWN", "RIGHT"),
    newCorner(9, 23, "DOWN", "LEFT", "RIGHT"),
    newCorner(12, 23, "UP", "LEFT", "RIGHT"),
    newCorner(15, 23, "UP", "LEFT", "RIGHT"),
    newCorner(18, 23, "DOWN", "LEFT", "RIGHT"),
    newCorner(21, 23, "UP", "DOWN", "LEFT"),
    newCorner(24, 23, "DOWN", "RIGHT"),
    newCorner(26, 23, "UP", "LEFT"),
    // ROW 26
    newCorner(1, 26, "DOWN", "RIGHT"),
    newCorner(3, 26, "UP", "LEFT", "RIGHT"),
    newCorner(6, 26, "UP", "LEFT"),
    newCorner(9, 26, "UP", "RIGHT"),
    newCorner(12, 26, "DOWN", "LEFT"),
    newCorner(15, 26, "DOWN", "RIGHT"),
    newCorner(18, 26, "UP", "LEFT"),
    newCorner(21, 26, "UP", "RIGHT"),
    newCorner(24, 26, "UP", "LEFT", "RIGHT"),
    newCorner(26, 26, "DOWN", "LEFT"),
    // ROW 29
    newCorner(1, 29, "UP", "RIGHT"),
    newCorner(12, 29, "UP", "LEFT", "RIGHT"),
    newCorner(15, 29, "UP", "LEFT", "RIGHT"),
    newCorner(26, 29, "UP", "LEFT"),
  ];
}

function newCorner(tx: number, ty: number, ...directions: Direction[]): Entity {
  const e = new Entity();
  e.x = 8 * tx + 4;
  e.y = 8 * (ty + 3) + 4;
  e.directions = directions;
  return e;
}
