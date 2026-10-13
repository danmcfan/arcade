// Pixel helpers shared by the art generators (gen-ui-art.ts,
// gen-firefly-art.ts): a blank PNG, one opaque pixel, and rows of palette
// letters painted into a PNG.

import { PNG } from "pngjs";

/** Rows of palette letters, `.` blank. */
export type Rows = readonly string[];

/** A palette: each letter the rows use mapped to its CSS hex colour. */
export type Palette = Readonly<Record<string, string>>;

function hex(css: string): [number, number, number] {
  const n = Number.parseInt(css.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
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
    [...row].forEach((px, x) => {
      if (px === ".") return;
      const X = ox + x;
      const Y = oy + y;
      if (X < 0 || Y < 0 || X >= png.width || Y >= png.height) return;
      const css = palette[px];
      if (css === undefined) throw new Error(`no colour for "${px}" in the palette`);
      plot(png, X, Y, css);
    });
  });
}
