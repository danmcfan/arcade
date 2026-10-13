// Pixel helpers shared by the art generators (gen-ui-art.ts,
// gen-firefly-art.ts) and `bun run pixel` (pixel.ts). Art source is rows of
// Sweetie 16 letters (`sweetie` in src/ui/sweetie16.ts), `.` blank.
//
// - PNGs: blank, plot, paint rows into a PNG, toPng, toRows (a PNG back to
//   rows), scale, colours.
// - Rows: checkRows (size and letters, naming the bad row and column), and
//   the derivations that save drawing pixels by hand: outline, mirrorX/Y,
//   flipX/Y, recolour, overlay.

import { PNG } from "pngjs";
import { sweetie } from "../src/ui/sweetie16.ts";

/** Rows of palette letters, `.` blank. */
export type Rows = readonly string[];

/** A palette: each letter the rows use mapped to its CSS hex colour. */
export type Palette = Readonly<Record<string, string>>;

/** The letter for a blank pixel. */
export const empty = ".";

function hex(css: string): [number, number, number] {
  const n = Number.parseInt(css.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The byte at offset `i` of `png`'s data; throws past the end. */
function byteAt(png: PNG, i: number): number {
  const v = png.data[i];
  if (v === undefined) throw new Error(`byte ${i} is outside the ${png.width}x${png.height} PNG`);
  return v;
}

/** The pixel at byte offset `i` as #rrggbb. */
function cssAt(png: PNG, i: number): string {
  return `#${[0, 1, 2]
    .map((j) =>
      byteAt(png, i + j)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** The letter for one opaque-or-transparent pixel at byte offset `i`, or a thrown error naming (X, Y). */
function letterAt(png: PNG, i: number, letterOf: Map<string, string>, X: number, Y: number): string {
  const a = byteAt(png, i + 3);
  if (a === 0) return empty;
  if (a !== 255) throw new Error(`pixel (${X}, ${Y}) is half transparent (alpha ${a})`);
  const letter = letterOf.get(cssAt(png, i));
  if (letter === undefined) throw new Error(`pixel (${X}, ${Y}) is ${cssAt(png, i)}, not in the palette`);
  return letter;
}

/** Each of `palette`'s colours (#rrggbb, lower case) mapped back to its letter. */
export function letters(palette: Palette = sweetie): Map<string, string> {
  return new Map(Object.entries(palette).map(([letter, css]) => [css.toLowerCase(), letter]));
}

/** Set (x, y) to the opaque CSS hex colour `css`. */
export function plot(png: PNG, x: number, y: number, css: string): void {
  const i = (y * png.width + x) * 4;
  const [r, g, b] = hex(css);
  png.data[i] = r;
  png.data[i + 1] = g;
  png.data[i + 2] = b;
  png.data[i + 3] = 255;
}

/** A fully transparent `width` × `height` PNG. */
export function blank(width: number, height: number): PNG {
  const png = new PNG({ width, height });
  png.data.fill(0);
  return png;
}

/**
 * Paint `rows` into `png` in `palette`'s colours with its top-left at
 * (ox, oy). `.` leaves what is there; pixels outside the PNG are dropped.
 */
export function paint(png: PNG, rows: Rows, palette: Palette, ox = 0, oy = 0): void {
  rows.forEach((row, y) => {
    row.split("").forEach((px, x) => {
      if (px === empty) return;
      const X = ox + x;
      const Y = oy + y;
      if (X < 0 || Y < 0 || X >= png.width || Y >= png.height) return;
      const css = palette[px];
      if (css === undefined) throw new Error(`no colour for "${px}" in the palette`);
      plot(png, X, Y, css);
    });
  });
}

/** `rows` as a PNG of their own size. */
export function toPng(rows: Rows, palette: Palette = sweetie): PNG {
  const png = blank(rows[0]?.length ?? 0, rows.length);
  paint(png, rows, palette);
  return png;
}

/**
 * The `w` × `h` area of `png` at (x, y) as rows of `palette`'s letters, `.`
 * for transparent. Throws on a colour the palette lacks or a half-transparent
 * pixel, naming where it is.
 */
export function toRows(
  png: PNG,
  palette: Palette = sweetie,
  x = 0,
  y = 0,
  w = png.width - x,
  h = png.height - y,
): string[] {
  const letterOf = letters(palette);
  const rows: string[] = [];
  for (let Y = y; Y < y + h; Y++) {
    let row = "";
    for (let X = x; X < x + w; X++) {
      row += letterAt(png, (Y * png.width + X) * 4, letterOf, X, Y);
    }
    rows.push(row);
  }
  return rows;
}

/** `png` scaled up `k` times, nearest neighbour. */
export function scale(png: PNG, k: number): PNG {
  const out = new PNG({ width: png.width * k, height: png.height * k });
  for (let y = 0; y < out.height; y++) {
    for (let x = 0; x < out.width; x++) {
      const from = (Math.trunc(y / k) * png.width + Math.trunc(x / k)) * 4;
      png.data.copy(out.data, (y * out.width + x) * 4, from, from + 4);
    }
  }
  return out;
}

/** How many pixels of each colour `png` has: #rrggbb, "transparent" for alpha 0, "alpha N" otherwise. */
export function colours(png: PNG): Map<string, number> {
  const seen = new Map<string, number>();
  for (let i = 0; i < png.data.length; i += 4) {
    const a = byteAt(png, i + 3);
    const key = a === 0 ? "transparent" : a === 255 ? cssAt(png, i) : `alpha ${a}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return seen;
}

/**
 * Throw unless `rows` are all one width (`w` when given), `h` rows high when
 * given, and only `palette`'s letters and `.`. The error names the art, the
 * row and the column, so a typo shows before anything renders.
 */
export function checkRows(
  name: string,
  rows: Rows,
  size: { w?: number; h?: number } = {},
  palette: Palette = sweetie,
): void {
  const w = size.w ?? rows[0]?.length ?? 0;
  if (size.h !== undefined && rows.length !== size.h)
    throw new Error(`${name} has ${rows.length} rows, want ${size.h}`);
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`${name} row ${y} is ${row.length} wide, want ${w}: "${row}"`);
    const x = row.split("").findIndex((px) => px !== empty && palette[px] === undefined);
    if (x >= 0) throw new Error(`${name} row ${y} column ${x} is "${row[x]}", not a palette letter: "${row}"`);
  });
}

/**
 * A 1 px outline in `letter` round the drawn pixels: every blank pixel that
 * touches a drawn one along an edge. Same size, so leave a blank border for it.
 */
export function outline(rows: Rows, letter = "k"): string[] {
  const drawn = (x: number, y: number): boolean => (rows[y]?.[x] ?? empty) !== empty;
  return rows.map((row, y) =>
    row
      .split("")
      .map((px, x) =>
        px === empty && (drawn(x - 1, y) || drawn(x + 1, y) || drawn(x, y - 1) || drawn(x, y + 1)) ? letter : px,
      )
      .join(""),
  );
}

/** Left to right reversed. */
export function flipX(rows: Rows): string[] {
  return rows.map((row) => row.split("").toReversed().join(""));
}

/** Top to bottom reversed. */
export function flipY(rows: Rows): string[] {
  return rows.toReversed();
}

/** The left half drawn, the right half its mirror: twice as wide. */
export function mirrorX(left: Rows): string[] {
  return left.map((row) => row + row.split("").toReversed().join(""));
}

/** The top half drawn, the bottom half its mirror: twice as high. */
export function mirrorY(top: Rows): string[] {
  return [...top, ...flipY(top)];
}

/** `rows` with each letter in `map` swapped for its value, e.g. `{ r: "b" }` for a blue copy of a red sprite. */
export function recolour(rows: Rows, map: Readonly<Record<string, string>>): string[] {
  return rows.map((row) =>
    row
      .split("")
      .map((px) => map[px] ?? px)
      .join(""),
  );
}

/**
 * `part` drawn over `rows` with its top-left at (x, y); `part`'s `.` leaves
 * what is there. Throws when `part` reaches outside `rows`.
 */
export function overlay(rows: Rows, part: Rows, x: number, y: number): string[] {
  const w = rows[0]?.length ?? 0;
  const pw = part[0]?.length ?? 0;
  if (x < 0 || y < 0 || x + pw > w || y + part.length > rows.length) {
    throw new Error(`a ${pw}x${part.length} part at (${x}, ${y}) reaches outside ${w}x${rows.length} rows`);
  }
  return rows.map((row, Y) => {
    const p = part[Y - y];
    if (p === undefined) return row;
    return row
      .split("")
      .map((px, X) => (X >= x && X < x + pw && (p[X - x] ?? empty) !== empty ? (p[X - x] ?? px) : px))
      .join("");
  });
}
