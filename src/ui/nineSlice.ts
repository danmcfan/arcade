// Nine-slice: draw a small frame image at any size. Its corners (`corner` px
// square) stay as drawn; its edges and middle repeat to fill the rest, the
// last repeat cut short. The game draws the cells from a sprite
// (src/ui/text.ts, src/game/overlay.ts); the pixel preview paints them from
// rows (scripts/pixel-scenes.ts), so both place the same pixels.

import { sub, type Sprite } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";

/** One piece of the source image and where it goes, relative to the frame's top left. */
export interface SliceCell {
  sx: number;
  sy: number;
  w: number;
  h: number;
  dx: number;
  dy: number;
}

interface Span {
  s: number;
  len: number;
  d: number;
}

/** One axis: the near corner, the middle repeated across `size`, the far corner. */
function spans(src: number, corner: number, size: number): Span[] {
  const middle = src - 2 * corner;
  if (middle < 1) throw new Error(`nine-slice: a ${src} px image has no middle between ${corner} px corners`);
  const out: Span[] = [{ s: 0, len: Math.min(corner, size), d: 0 }];
  for (let d = corner; d < size - corner; d += middle) {
    out.push({ s: corner, len: Math.min(middle, size - corner - d), d });
  }
  if (size > corner) out.push({ s: src - corner, len: corner, d: size - corner });
  return out;
}

/** The cells that draw a `srcW`×`srcH` frame image with `corner` px corners at `w`×`h`. */
export function nineSlice(srcW: number, srcH: number, corner: number, w: number, h: number): SliceCell[] {
  const xs = spans(srcW, corner, w);
  const ys = spans(srcH, corner, h);
  return ys.flatMap((y) => xs.map((x) => ({ sx: x.s, sy: y.s, w: x.len, h: y.len, dx: x.d, dy: y.d })));
}

/** `frame` (a sprite with `corner` px corners) drawn at (x, y), `w`×`h`. */
export function drawNineSlice(
  screen: Surface,
  frame: Sprite,
  corner: number,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  for (const c of nineSlice(frame.w, frame.h, corner, w, h)) {
    const sx = frame.sx + c.sx;
    const sy = frame.sy + c.sy;
    screen.draw(sub(frame, sx, sy, sx + c.w, sy + c.h), x + c.dx, y + c.dy);
  }
}
