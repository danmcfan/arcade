// Pixel-font text and simple UI boxes for the title screen and menus. Glyphs
// come from font.png (generated from ./glyphs.ts); boxes are plain filled
// rects in the Sweetie 16 palette.

import { imageFont, imagePanel } from "../engine/assets.ts";
import { sub } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";
import { drawNineSlice } from "./nineSlice.ts";
import { panelCorner } from "./panelArt.ts";
import { bandRows, cell, charset, glyphHeight, glyphWidth, inkOrder, sheetColumns, type Ink } from "./glyphs.ts";

export type { Ink } from "./glyphs.ts";
export { glyphHeight as textHeight } from "./glyphs.ts";

const index = new Map(charset.map((ch, i) => [ch, i]));

/** Characters `drawText` can draw; anything else draws as nothing. */
export function canDraw(text: string): boolean {
  return Array.from(text.toUpperCase()).every((ch) => index.has(ch));
}

/** Width in pixels: glyph widths plus a 1-px gap between glyphs. */
export function textWidth(text: string): number {
  const chars = Array.from(text.toUpperCase()).filter((ch) => index.has(ch));
  if (chars.length === 0) return 0;
  return chars.reduce((w, ch) => w + glyphWidth(ch), 0) + chars.length - 1;
}

/** Draw `text` with its top-left corner at `x, y`. Lowercase draws as uppercase. */
export function drawText(screen: Surface, text: string, x: number, y: number, ink: Ink = "white"): void {
  const band = inkOrder.indexOf(ink);
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const i = index.get(ch);
    if (i === undefined) continue;
    const sx = (i % sheetColumns) * cell;
    const sy = (band * bandRows + Math.trunc(i / sheetColumns)) * cell;
    const w = glyphWidth(ch);
    screen.draw(sub(imageFont, sx, sy, sx + w, sy + glyphHeight), cx, y);
    cx += w + 1;
  }
}

/**
 * Draw only rows `from` (inclusive) to `to` (exclusive) of one glyph, the
 * first of them at `y`: a glyph cut off at the top or bottom, for the
 * payout's rolling digits.
 */
export function drawGlyphRows(
  screen: Surface,
  ch: string,
  x: number,
  y: number,
  from: number,
  to: number,
  ink: Ink = "white",
): void {
  const i = index.get(ch.toUpperCase());
  const top = Math.max(0, from);
  const bottom = Math.min(glyphHeight, to);
  if (i === undefined || bottom <= top) return;
  const band = inkOrder.indexOf(ink);
  const sx = (i % sheetColumns) * cell;
  const sy = (band * bandRows + Math.trunc(i / sheetColumns)) * cell;
  screen.draw(sub(imageFont, sx, sy + top, sx + glyphWidth(ch), sy + bottom), x, y);
}

/** Draw `text` horizontally centred on `cx`. */
export function drawTextCentered(screen: Surface, text: string, cx: number, y: number, ink: Ink = "white"): void {
  drawText(screen, text, cx - Math.trunc(textWidth(text) / 2), y, ink);
}

/** A framed box: `panelFrame` (src/ui/panelArt.ts) drawn at this size. */
export function drawPanel(screen: Surface, x: number, y: number, w: number, h: number): void {
  drawNineSlice(screen, imagePanel, panelCorner, x, y, w, h);
}

/** Height of a key cap drawn by `drawKey`. */
export const keyHeight = 11;

/** Width of the key cap `drawKey` draws for `label`. */
export function keyWidth(label: string): number {
  return textWidth(label) + 6;
}

/** A keyboard key with `label` on it; returns its width. */
export function drawKey(screen: Surface, label: string, x: number, y: number): number {
  const w = keyWidth(label);
  screen.fillRect(x + 1, y, w - 2, keyHeight - 1, "#566c86");
  screen.fillRect(x, y + 1, 1, keyHeight - 3, "#566c86");
  screen.fillRect(x + w - 1, y + 1, 1, keyHeight - 3, "#566c86");
  screen.fillRect(x + 1, y + keyHeight - 2, w - 2, 1, "#333c57");
  screen.fillRect(x + 2, y + 1, w - 4, keyHeight - 4, "#333c57");
  drawText(screen, label, x + 3, y + 1, "white");
  return w;
}
