// The score dials' drawing, shared by the cabinets' HUDs (#212; Sweet Sam's
// before that, a port of the Go game's draw.go): each digit spins on its reel
// (src/ui/digitReel.ts) inside an 8×8 cell, in the thick dial digits.

import { imageDigits } from "../engine/assets.ts";
import { goRound } from "../engine/gomath.ts";
import { sub, type Sprite } from "../engine/image.ts";
import { Surface } from "../engine/surface.ts";
import { digits6, type DigitReels } from "./digitReel.ts";

/** A dial digit's width and height: an 8×8 tile. */
export const dialDigitSize = 8;

function digitFrame(digit: number): Sprite {
  let d = digit % 10;
  if (d < 0) {
    d += 10;
  }
  return sub(imageDigits, d * dialDigitSize, 0, (d + 1) * dialDigitSize, dialDigitSize);
}

/** Draws rolling numbers; holds the one scratch cell they clip in, made lazily on the first draw (D12). */
export class RollingDials {
  /** Reused cell for clipped digit draws (Go `digitDialScratch`). */
  private cell: Surface | null = null;

  /**
   * Draws `value` as six reels from (x, y), a digit per 8 px. Leading zeros
   * are blank, but the last `alwaysShown` digits always draw. Each column
   * renders into the scratch cell (hard clip), which is then composited.
   */
  draw(screen: Surface, value: number, x: number, y: number, reels: DigitReels, alwaysShown = 2): void {
    const digs = digits6(value);
    const cell = this.scratch();

    let leadingZero = true;
    for (let i = 0; i < 6; i++) {
      const digit = digs[i] ?? 0;
      const r = reels[i];
      if (r === undefined) {
        continue;
      }
      if (i >= 6 - alwaysShown) {
        leadingZero = false;
      }

      if (digit === 0 && leadingZero && !r.active) {
        continue;
      }

      if (digit !== 0) {
        leadingZero = false;
      }

      cell.clear();

      if (r.active) {
        const p = r.scroll01();
        cell.draw(digitFrame(r.from), 0, -p * dialDigitSize);
        cell.draw(digitFrame(r.to), 0, (1 - p) * dialDigitSize);
      } else {
        cell.draw(digitFrame(r.settledDigit), 0, 0);
      }

      screen.drawSurface(cell, goRound(x + dialDigitSize * i), goRound(y));
    }
  }

  private scratch(): Surface {
    this.cell ??= Surface.offscreen(dialDigitSize, dialDigitSize);
    return this.cell;
  }
}
