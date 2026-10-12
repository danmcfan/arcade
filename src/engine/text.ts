// Debug text (D14): a port of the Go engine's `DebugPrintAt`
// (`debugprint.go`, `drawDebugText`) using its own bitmap font,
// so debug frames can match Go pixel for pixel. No `fillText`.

import { debugFont } from "./assets.ts";
import { sub, whole, type Sprite } from "./image.ts";
import type { Surface } from "./surface.ts";

const cw = 6;
const ch = 16;
const fontSheet = whole(debugFont);
const glyphs = new Map<number, Sprite>();

/**
 * The glyph sub-image for a code point. Code points past the sheet (above
 * U+00FF) give an empty sub-image, which draws nothing, as in Go.
 */
function glyph(c: number): Sprite {
  let s = glyphs.get(c);
  if (s === undefined) {
    const n = Math.trunc(debugFont.width / cw);
    const sx = (c % n) * cw;
    const sy = Math.trunc(c / n) * ch;
    s = sub(fontSheet, sx, sy, sx + cw, sy + ch);
    glyphs.set(c, s);
  }
  return s;
}

/**
 * `DebugPrintAt(screen, text, x, y)`: one 6×16 glyph per code
 * point starting at `(x + 1, y)`; `\n` returns to the left margin 16 px
 * lower. Go passes `int` coordinates; callers truncate as Go does.
 */
export function debugPrint(screen: Surface, text: string, ox: number, oy: number): void {
  let x = 0;
  let y = 0;
  for (const ch_ of text) {
    const c = ch_.codePointAt(0) ?? 0;
    if (c === 0x0a) {
      x = 0;
      y += ch;
      continue;
    }
    screen.draw(glyph(c), x + ox + 1, y + oy);
    x += cw;
  }
}
