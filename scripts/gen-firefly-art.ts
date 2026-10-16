// Build Firefly's pixel art from its source in src/firefly/art.ts:
//
//   bun run art      # also writes src/assets/images/firefly/*.png
//
// firefly.png, captive.png (the firefly in reds), spark.png and shot.png are
// their rows as drawn. moth.png,
// wasp.png, owl.png and owl-hurt.png (the Owl recoloured) are rotation
// sheets: the up-facing source turned clockwise in 15° steps, one frame per heading (`rotationRows` × `rotationColumns`). Quarter
// turns are exact; the other angles use RotSprite (scale the source up 8×
// with Scale2x, rotate, sample back down), which keeps the outlines whole and
// adds no colours. hit.png is the hit frames, each mirrored from its quarter.
// background.png is the dithered sky, the stars and the grass tiled along the
// bottom. gen-art.test.ts fails when the committed PNGs drift.

import { join } from "node:path";
import { PNG } from "pngjs";
import {
  backgroundHeight,
  backgroundWidth,
  captiveColours,
  fireflyArt,
  grassTile,
  hitQuarters,
  mothArt,
  owlArt,
  owlHurtColours,
  rotationColumns,
  rotationRows,
  rotationStep,
  skyStops,
  shotArt,
  sparkArt,
  starArt,
  stars,
  waspArt,
} from "../src/firefly/art.ts";
import { sweetie, type SweetieLetter } from "../src/ui/sweetie16.ts";
import { imageOutput, type ImageOutput } from "./image-outputs.ts";
import { blank, empty, mirrorX, mirrorY, paint, plot, recolour, toPng, type Rows } from "./pixel-art.ts";

function at(rows: Rows, x: number, y: number): string {
  return rows[y]?.[x] ?? empty;
}

/** The width of the first row: every art source has at least one. */
function widthOf(rows: Rows): number {
  const first = rows[0];
  if (first === undefined) throw new Error("art has no rows");
  return first.length;
}

/**
 * Scale2x (EPX): each pixel becomes 2×2, and a corner takes a neighbour's
 * colour where two neighbours meet along a diagonal edge. Outside is blank.
 */
export function scale2x(rows: Rows): string[] {
  const out: string[] = [];
  rows.forEach((row, y) => {
    let top = "";
    let bottom = "";
    for (let x = 0; x < row.length; x++) {
      const p = at(rows, x, y);
      const a = at(rows, x, y - 1);
      const b = at(rows, x + 1, y);
      const c = at(rows, x - 1, y);
      const d = at(rows, x, y + 1);
      top += (c === a && c !== d && a !== b ? a : p) + (a === b && a !== c && b !== d ? b : p);
      bottom += (d === c && d !== b && c !== a ? c : p) + (b === d && b !== a && d !== c ? d : p);
    }
    out.push(top, bottom);
  });
  return out;
}

/**
 * `rows` turned `degrees` clockwise about its centre, the same size. Quarter
 * turns move pixels exactly; other angles sample an 8× Scale2x copy at each
 * pixel's centre (RotSprite), so no new colours appear.
 */
export function rotate(rows: Rows, degrees: number): string[] {
  const h = rows.length;
  const w = widthOf(rows);
  const quarter = degrees % 90 === 0;
  const scale = quarter ? 1 : 8;
  const src = quarter ? rows : scale2x(scale2x(scale2x(rows)));
  const rad = (degrees * Math.PI) / 180;
  const cos = quarter ? Math.round(Math.cos(rad)) : Math.cos(rad);
  const sin = quarter ? Math.round(Math.sin(rad)) : Math.sin(rad);
  const out: string[] = [];
  for (let y = 0; y < h; y++) {
    let row = "";
    for (let x = 0; x < w; x++) {
      // Undo a clockwise turn (y points down) to find where this pixel came from.
      const dx = x + 0.5 - w / 2;
      const dy = y + 0.5 - h / 2;
      const sx = dx * cos + dy * sin + w / 2;
      const sy = -dx * sin + dy * cos + h / 2;
      row += at(src, Math.floor(sx * scale), Math.floor(sy * scale));
    }
    out.push(row);
  }
  return out;
}

/** A 16×16 (or any size) quarter mirrored into the full frame: the quarter is the top-left. */
export function mirrorQuarter(quarter: Rows): string[] {
  return mirrorY(mirrorX(quarter));
}

/** One frame per heading: row r, column c is the source turned (r × 90 + c × 15)°. */
export function rotationSheet(rows: Rows): PNG {
  const w = widthOf(rows);
  const h = rows.length;
  const png = blank(w * rotationColumns, h * rotationRows);
  for (let r = 0; r < rotationRows; r++) {
    for (let c = 0; c < rotationColumns; c++) {
      paint(png, rotate(rows, r * 90 + c * rotationStep), sweetie, c * w, r * h);
    }
  }
  return png;
}

export function renderHit(): PNG {
  const frames = hitQuarters.map((q) => mirrorQuarter(q));
  const first = frames[0];
  if (first === undefined) throw new Error("hitQuarters is empty");
  const size = first.length;
  const png = blank(size * frames.length, size);
  frames.forEach((rows, i) => {
    paint(png, rows, sweetie, i * size, 0);
  });
  return png;
}

/** 4×4 Bayer thresholds (0..15) for the sky's ordered dither. */
const bayer = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

function bayerAt(x: number, y: number): number {
  const t = bayer[y % 4]?.[x % 4];
  if (t === undefined) throw new Error(`no Bayer threshold at (${x}, ${y})`);
  return t;
}

/** The sky colour at (x, y): the stop above, or the next one where the dither says so. */
export function skyColor(x: number, y: number): SweetieLetter {
  for (let i = skyStops.length - 1; i >= 0; i--) {
    const stop = skyStops[i];
    if (stop === undefined || y < stop.y) continue;
    const next = skyStops[i + 1];
    if (next === undefined) return stop.color;
    const t = (y - stop.y) / (next.y - stop.y);
    return t * 16 > bayerAt(x, y) + 0.5 ? next.color : stop.color;
  }
  const first = skyStops[0];
  if (first === undefined) throw new Error("skyStops is empty");
  return first.color;
}

export function renderBackground(): PNG {
  const png = blank(backgroundWidth, backgroundHeight);
  for (let y = 0; y < backgroundHeight; y++) {
    for (let x = 0; x < backgroundWidth; x++) plot(png, x, y, sweetie[skyColor(x, y)]);
  }
  for (const [x, y, kind] of stars) {
    const rows = starArt[kind];
    paint(png, rows, sweetie, x - Math.trunc(rows[0].length / 2), y - Math.trunc(rows.length / 2));
  }
  const tileW = widthOf(grassTile);
  for (let ox = 0; ox < backgroundWidth; ox += tileW)
    paint(png, grassTile, sweetie, ox, backgroundHeight - grassTile.length);
  return png;
}

export const fireflyImagesDir = "src/assets/images/firefly";

/** Every generated Firefly image: its file, its size and how to draw it. */
export const fireflyArtFiles: readonly ImageOutput[] = [
  imageOutput(join(fireflyImagesDir, "firefly.png"), 16, 16, () => toPng(fireflyArt)),
  imageOutput(join(fireflyImagesDir, "captive.png"), 16, 16, () => toPng(recolour(fireflyArt, captiveColours))),
  imageOutput(join(fireflyImagesDir, "spark.png"), 8, 8, () => toPng(sparkArt)),
  imageOutput(join(fireflyImagesDir, "moth.png"), 96, 64, () => rotationSheet(mothArt)),
  imageOutput(join(fireflyImagesDir, "wasp.png"), 96, 64, () => rotationSheet(waspArt)),
  imageOutput(join(fireflyImagesDir, "owl.png"), 96, 64, () => rotationSheet(owlArt)),
  imageOutput(join(fireflyImagesDir, "owl-hurt.png"), 96, 64, () => rotationSheet(recolour(owlArt, owlHurtColours))),
  imageOutput(join(fireflyImagesDir, "shot.png"), 4, 8, () => toPng(shotArt)),
  imageOutput(join(fireflyImagesDir, "hit.png"), 160, 32, renderHit),
  imageOutput(join(fireflyImagesDir, "background.png"), 224, 288, renderBackground),
];
