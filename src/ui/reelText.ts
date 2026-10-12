// A six-digit number on slot-machine reels (src/ui/digitReel.ts), drawn in
// the pixel font: a spinning column shows its old digit leaving upward and
// the new one rising from below, cut to the line of text.

import type { Surface } from "../engine/surface.ts";
import type { DigitReels } from "./digitReel.ts";
import { glyphWidth } from "./glyphs.ts";
import { drawGlyphRows, textHeight, type Ink } from "./text.ts";

/** Width of one digit column: the widest digit plus a 1-px gap. */
export const reelColumnWidth = 6;

/** Draw `reels` right-aligned so the last column ends at `right`, top at `y`. Leading zeros are hidden unless spinning; the last digit always shows. */
export function drawReels(screen: Surface, reels: DigitReels, right: number, y: number, ink: Ink): void {
  const left = right - reels.length * reelColumnWidth + 1;
  let leading = true;
  reels.forEach((r, i) => {
    const last = i === reels.length - 1;
    if (leading && !last && !r.active && r.settledDigit === 0) return;
    leading = false;
    const x = left + i * reelColumnWidth;
    if (!r.active) {
      drawDigitRows(screen, r.settledDigit, x, y, 0, textHeight, ink);
      return;
    }
    // The old digit moves up by `off` rows; the new one follows a row behind it.
    const off = Math.round(r.scroll01() * (textHeight + 1));
    drawDigitRows(screen, r.from, x, y - off, off, textHeight, ink);
    drawDigitRows(screen, r.to, x, y + textHeight + 1 - off, 0, off - 1, ink);
  });
}

/** Rows `from`..`to` of a digit, centred in its column, with glyph row 0 at `y` (so row `from` lands at `y + from`). */
function drawDigitRows(screen: Surface, digit: number, x: number, y: number, from: number, to: number, ink: Ink): void {
  const ch = String(digit);
  const cx = x + Math.trunc((reelColumnWidth - 1 - glyphWidth(ch)) / 2);
  drawGlyphRows(screen, ch, cx, y + from, from, to, ink);
}
