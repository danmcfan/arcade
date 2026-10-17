// Build Sweet Sam's pixel art from its source in src/sweet-sam/art.ts:
//
//   bun run art      # also writes src/assets/images/sweet-sam/*.png
//
// maze.png is `mazeTiles` drawn at 8 px a tile: solid yellow wax cut back 4 px
// from every corridor (so corridors are 16 px wide), its outer corners
// rounded, an orange border where wax meets the background, the bee home's door bar, and "1UP" and "HIGH SCORE"
// on the top row. bear.png is the walk
// cycle, one row per facing (down, up, left, right; right mirrors left), then
// the death frames. bees.png is the four bees, one 64×96 sheet each in
// `beeOrder`: flying right, flying left, then sleepy and waking, each right
// then left. honey-drop.png and honey-pot.png are 4 bobbing frames of 8×12.
// ready.png is READY!, six 8×8 letters. digits.png is the score dials' 0 to
// 9, 8×8 each, and score-labels.png the maze's "1UP" and "HIGH SCORE" alone, for
// Firefly's HUD. points.png is 200, 400, 800 and 1600, one 16×16 popup frame each.
// maze-flash.png is the maze with its wax in the level-clear flash colours,
// flower.png the bonus flowers, one 16×16 frame per flower kind (#47, #68),
// and bee-eyes.png an eaten bee's eyes, one 16×16 frame per direction (#196).
// gen-art.test.ts fails when the committed PNGs drift.

import { join } from "node:path";
import { PNG } from "pngjs";
import {
  bearDeath,
  bearWalk,
  beeBeats,
  beeBodies,
  beeEye,
  beeEyes,
  beeEyesOrder,
  beeFlight,
  beeOrder,
  beeTear,
  corridorMargin,
  dustPuff,
  nailArt,
  propCellHeight,
  propCellWidth,
  tearCellWidth,
  tornWing,
  dazedFace,
  dazedFaceAt,
  dialDigitsArt,
  flowers,
  doorBar,
  doorBarRows,
  frameSize,
  honeyDropArt,
  honeyDropShadow,
  honeyDropShadowTop,
  honeyDropTop,
  honeyPotArt,
  honeyPotShadow,
  honeyPotShadowTop,
  honeyPotTop,
  itemBob,
  itemCellHeight,
  itemCellWidth,
  mazeBackground,
  mazeHeight,
  mazeTiles,
  mazeWidth,
  pointsArt,
  pointsFrameSize,
  pointsTop,
  readyArt,
  sleepyLook,
  wakingLook,
  walkCycle,
  waxCornerCap,
  waxFill,
  waxFlashFill,
  waxFlashRim,
  waxRim,
  waxRimWidth,
} from "../src/sweet-sam/art.ts";
import { scoreLabelsArt, scoreLabelsX } from "../src/ui/hudArt.ts";
import type { SweetSamEnemyKind } from "../src/game/snapshot.ts";
import { sweetie, type SweetieLetter } from "../src/ui/sweetie16.ts";
import { imageOutput, type ImageOutput } from "./image-outputs.ts";
import { blank, flipX, flipY, overlay, paint, plot, recolour, type Rows } from "./pixel-art.ts";

const tile = 8;

/** The maze tile letter at tile (tx, ty); outside the map is background. */
export function mazeTileAt(tx: number, ty: number): string {
  return mazeTiles[ty]?.[tx] ?? " ";
}

/** True when pixel (x, y) is within `corridorMargin` of a corridor tile: the 16 px corridor. */
export function inCorridor(x: number, y: number): boolean {
  const reach = corridorMargin;
  for (let ty = Math.floor((y - reach) / tile); ty <= Math.floor((y + reach) / tile); ty++) {
    for (let tx = Math.floor((x - reach) / tile); tx <= Math.floor((x + reach) / tile); tx++) {
      if (mazeTileAt(tx, ty) !== ".") continue;
      if (
        x >= tx * tile - reach &&
        x < (tx + 1) * tile + reach &&
        y >= ty * tile - reach &&
        y < (ty + 1) * tile + reach
      )
        return true;
    }
  }
  return false;
}

/** The maze tile letter under pixel (x, y). */
function tileUnder(x: number, y: number): string {
  return mazeTileAt(Math.floor(x / tile), Math.floor(y / tile));
}

/** True when pixel (x, y) is wax before its corners are rounded. */
function isSquareWax(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= mazeWidth || y >= mazeHeight) return false;
  return tileUnder(x, y) === "#" && !inCorridor(x, y);
}

/** Steps from (x, y) towards (dx, dy) until the next pixel is off the square wax, up to `waxCornerCap` + 1. */
function runTo(x: number, y: number, dx: number, dy: number): number {
  for (let n = 1; n <= waxCornerCap; n++) if (!isSquareWax(x + n * dx, y + n * dy)) return n;
  return waxCornerCap + 1;
}

/** The wax mask, outer corners rounded, row-major; built once from the square wax. */
const waxMask: boolean[] = Array.from({ length: mazeWidth * mazeHeight }, (_, i) => {
  const x = i % mazeWidth;
  const y = Math.floor(i / mazeWidth);
  if (!isSquareWax(x, y)) return false;
  const h = Math.min(runTo(x, y, -1, 0), runTo(x, y, 1, 0));
  const v = Math.min(runTo(x, y, 0, -1), runTo(x, y, 0, 1));
  return h + v > 3;
});

/** True when pixel (x, y) of maze.png is wax. */
export function isWax(x: number, y: number): boolean {
  if (x < 0 || y < 0 || x >= mazeWidth || y >= mazeHeight) return false;
  return waxMask[y * mazeWidth + x] ?? false;
}

/** True when wax pixel (x, y) is within `waxRimWidth` of non-wax (4-neighbour steps). */
function onRim(x: number, y: number): boolean {
  for (let dy = -waxRimWidth; dy <= waxRimWidth; dy++) {
    const reach = waxRimWidth - Math.abs(dy);
    for (let dx = -reach; dx <= reach; dx++) if (!isWax(x + dx, y + dy)) return true;
  }
  return false;
}

function isLetter(c: string): c is SweetieLetter {
  return c in sweetie;
}

/** The letter at pixel (x, y) of maze.png. */
export function mazeLetter(x: number, y: number): SweetieLetter {
  const label = scoreLabelsArt[y]?.[x - scoreLabelsX];
  if (label !== undefined && isLetter(label)) return label;
  if (tileUnder(x, y) === "=" && doorBarRows.includes(y % tile) && !inCorridor(x, y)) return doorBar;
  if (!isWax(x, y)) return mazeBackground;
  return onRim(x, y) ? waxRim : waxFill;
}

/** The letter at pixel (x, y) of maze-flash.png: the maze with its wax in the flash colours. */
export function mazeFlashLetter(x: number, y: number): SweetieLetter {
  const letter = mazeLetter(x, y);
  if (letter === waxFill) return waxFlashFill;
  if (letter === waxRim) return waxFlashRim;
  return letter;
}

function mazeImage(letterAt: (x: number, y: number) => SweetieLetter): PNG {
  const png = blank(mazeWidth, mazeHeight);
  for (let y = 0; y < mazeHeight; y++) {
    for (let x = 0; x < mazeWidth; x++) plot(png, x, y, sweetie[letterAt(x, y)]);
  }
  return png;
}

export const renderMaze = (): PNG => mazeImage(mazeLetter);
export const renderMazeFlash = (): PNG => mazeImage(mazeFlashLetter);

/** A sheet of frames, `frames[row][column]`, each `frameSize` square. */
function sheet(frames: readonly (readonly Rows[])[]): PNG {
  const columns = Math.max(...frames.map((r) => r.length));
  const png = blank(columns * frameSize, frames.length * frameSize);
  frames.forEach((row, r) => {
    row.forEach((rows, c) => {
      paint(png, rows, sweetie, c * frameSize, r * frameSize);
    });
  });
  return png;
}

function frameOf(frames: readonly Rows[], i: number): Rows {
  const f = frames[i];
  if (f === undefined) throw new Error(`no frame ${i}`);
  return f;
}

/** A facing's 4 walk frames. Facing down or up, the other step is the first step mirrored. */
function walk(frames: readonly Rows[]): Rows[] {
  const steps = frames.length === 2 ? [...frames, flipX(frameOf(frames, 1))] : frames;
  return walkCycle.map((i) => frameOf(steps, i));
}

/** The standing bear, dazed: `dazedFace` over its eyes. */
export function dazedBear(): string[] {
  const [x, y] = dazedFaceAt;
  return overlay(frameOf(bearWalk.down, 0), dazedFace, x, y);
}

/** Rows of bear.png: down, up, left, right, then dying. */
export function bearFrames(): Rows[][] {
  const left = walk(bearWalk.left);
  return [walk(bearWalk.down), walk(bearWalk.up), left, left.map((f) => flipX(f)), [dazedBear(), ...bearDeath]];
}

/** `rows` moved up `n` rows, blank rows coming in at the bottom. */
export function liftRows(rows: Rows, n: number): string[] {
  const blankRow = ".".repeat(rows[0]?.length ?? 0);
  return [...rows.slice(n), ...Array.from({ length: n }, () => blankRow)];
}

/** One wing beat of a bee in a look: its own colours, or sleepy (eyes shut), or waking (eyes wide). */
export function beeFrame(kind: SweetSamEnemyKind, beat: number, look: "awake" | "sleepy" | "waking"): string[] {
  const b = beeBeats[beat];
  if (b === undefined) throw new Error(`no bee wing beat ${beat}`);
  const rows = frameOf(beeFlight, b.frame);
  let out: string[];
  if (look === "awake") {
    out = recolour(rows, { y: beeBodies[kind] });
  } else {
    const colours = look === "sleepy" ? sleepyLook : wakingLook;
    const [ex, ey] = beeEye;
    out = recolour(rows, { y: colours.body, w: colours.wings, l: colours.veins });
    // Sleepy: the eye shut, a lid across the pupil. Waking: the eye wide, the pupil twice as tall.
    out =
      look === "sleepy"
        ? overlay(out, [`.${colours.body}`, "kk"], ex - 1, ey - 1)
        : overlay(out, ["k", "k"], ex, ey - 1);
  }
  return liftRows(out, b.bob);
}

/** One bee's 64×96 sheet rows: flying right, left, sleepy right, left, waking right, left. */
export function beeFrames(kind: SweetSamEnemyKind): Rows[][] {
  const rows: Rows[][] = [];
  for (const look of ["awake", "sleepy", "waking"] as const) {
    const right = beeBeats.map((_, beat) => beeFrame(kind, beat, look));
    rows.push(
      right,
      right.map((f) => flipX(f)),
    );
  }
  return rows;
}

/** 4 bobbing 8×12 frames of a honey drop or honey pot: the art lifted by `itemBob`, its shadow staying put. */
function itemSheet(art: Rows, top: number, shadow: Rows, shadowTop: number): PNG {
  const png = blank(itemCellWidth * itemBob.length, itemCellHeight);
  itemBob.forEach((bob, i) => {
    const ox = i * itemCellWidth;
    const cx = (itemCellWidth - (art[0]?.length ?? 0)) / 2;
    const sx = (itemCellWidth - (shadow[0]?.length ?? 0)) / 2;
    paint(png, shadow, sweetie, ox + sx, shadowTop);
    paint(png, art, sweetie, ox + cx, top - bob);
  });
  return png;
}

export const renderHoneyDrop = (): PNG => itemSheet(honeyDropArt, honeyDropTop, honeyDropShadow, honeyDropShadowTop);
export const renderHoneyPot = (): PNG => itemSheet(honeyPotArt, honeyPotTop, honeyPotShadow, honeyPotShadowTop);

/** `rows` as a PNG of their own size. */
function image(rows: Rows): PNG {
  const png = blank(rows[0]?.length ?? 0, rows.length);
  paint(png, rows, sweetie, 0, 0);
  return png;
}

/** points.png: `pointsArt` `pointsTop` rows down a strip of 16×16 popup frames. */
export function renderPoints(): PNG {
  const png = blank(pointsArt[0]?.length ?? 0, pointsFrameSize);
  paint(png, pointsArt, sweetie, 0, pointsTop);
  return png;
}

export const sweetSamImagesDir = "src/assets/images/sweet-sam";

/** Every generated Sweet Sam image: its file, its size and how to draw it. */
/** bee-eyes.png's frames in `beeEyesOrder`: `beeEyes` with the left look, its right look mirrored, second. */
function beeEyesFrames(): Rows[] {
  const [right = [], ...upDown] = beeEyes;
  return [right, flipX(right), ...upDown];
}

/** `beeTear`'s frames in the order intermission.png lays them out (`tearColumn`). */
export function tearFrames(): Rows[] {
  return [...beeTear.stretch, ...beeTear.torn, ...beeTear.patched, ...beeTear.crawl];
}

/** intermission.png's props, in `propColumn` order: the torn wing and its flutter, the dust puff, the nail. */
export function propFrames(): Rows[] {
  return [tornWing, flipY(tornWing), ...dustPuff, nailArt];
}

/** intermission.png (#199): the tear frames facing right, then left, then the props standing on their cells' floors. */
export function renderIntermission(): PNG {
  const tears = tearFrames();
  const props = propFrames();
  const png = blank(tears.length * tearCellWidth, 2 * frameSize + propCellHeight);
  tears.forEach((rows, i) => {
    const w = rows[0]?.length ?? 0;
    paint(png, rows, sweetie, i * tearCellWidth + tearCellWidth - w, 0);
    paint(png, flipX(rows), sweetie, i * tearCellWidth, frameSize);
  });
  props.forEach((rows, i) => {
    const w = rows[0]?.length ?? 0;
    const x = i * propCellWidth + Math.trunc((propCellWidth - w) / 2);
    paint(png, rows, sweetie, x, 2 * frameSize + propCellHeight - rows.length);
  });
  return png;
}

export const sweetSamArtFiles: readonly ImageOutput[] = [
  imageOutput(join(sweetSamImagesDir, "maze.png"), 224, 288, renderMaze),
  imageOutput(join(sweetSamImagesDir, "bear.png"), 64, 80, () => sheet(bearFrames())),
  imageOutput(join(sweetSamImagesDir, "bees.png"), 64, 384, () => sheet(beeOrder.flatMap((kind) => beeFrames(kind)))),
  imageOutput(join(sweetSamImagesDir, "honey-drop.png"), 32, 12, renderHoneyDrop),
  imageOutput(join(sweetSamImagesDir, "honey-pot.png"), 32, 12, renderHoneyPot),
  imageOutput(join(sweetSamImagesDir, "ready.png"), 48, 8, () => image(readyArt)),
  imageOutput(join(sweetSamImagesDir, "digits.png"), 80, 8, () => image(dialDigitsArt)),
  imageOutput(join(sweetSamImagesDir, "score-labels.png"), 126, 7, () => image(scoreLabelsArt)),
  imageOutput(join(sweetSamImagesDir, "points.png"), 64, 16, renderPoints),
  imageOutput(join(sweetSamImagesDir, "maze-flash.png"), 224, 288, renderMazeFlash),
  imageOutput(join(sweetSamImagesDir, "flower.png"), 16 * flowers.length, 16, () => sheet([flowers])),
  imageOutput(join(sweetSamImagesDir, "bee-eyes.png"), 16 * beeEyesOrder.length, 16, () => sheet([beeEyesFrames()])),
  imageOutput(
    join(sweetSamImagesDir, "intermission.png"),
    9 * tearCellWidth,
    2 * frameSize + propCellHeight,
    renderIntermission,
  ),
];
