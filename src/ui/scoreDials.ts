// The arcade's score HUD, as Sweet Sam drew it first: "1UP" and "HIGH SCORE"
// in thick lettering along the screen's top row, with the score and high score
// on rolling digit dials (./digitReel.ts) under them. Positions are in 8 px
// tiles from the screen's corner, (bufX, bufY).

import { sub, type Sprite } from "../engine/image.ts";
import { Surface } from "../engine/surface.ts";
import { imageDigits, imageScoreLabels } from "../engine/assets.ts";
import { goRound } from "../engine/gomath.ts";
import { bootReels, digits6, newDigitReels, syncAndTick, type DigitReels } from "./digitReel.ts";
import { scoreLabelsX } from "./hudArt.ts";

/** Where the score and high score dials start: tile columns on tile row `scoreDialsRow`. */
export const scoreDialColumn = 1;
export const highScoreDialColumn = 11;
export const scoreDialsRow = 1;

/** The score and high score dials, with the scratch cell their draw reuses. */
export class ScoreDials {
  readonly score: DigitReels = newDigitReels();
  readonly high: DigitReels = newDigitReels();
  /** Reused cell for clipped digit draws (Go `digitDialScratch`); lazily created, never touched by update. */
  scratch: Surface | null = null;

  /** Settle the score dial on 0 and the high score dial on `highScore` (clamped to 0..999999), with no spin. */
  constructor(highScore: number) {
    bootReels(this.score, 0);
    bootReels(this.high, Math.min(999_999, Math.max(0, highScore)));
  }

  /** Point the dials at the score and the high score shown (never below the score), and advance them a tick. */
  tick(score: number, highScore: number): void {
    syncAndTick(this.score, digits6(score));
    syncAndTick(this.high, digits6(Math.max(score, highScore)));
  }

  /** The score and high score dials; the high score shown is never below the score. */
  draw(screen: Surface, bufX: number, bufY: number, score: number, highScore: number): void {
    drawRollingInteger(this, screen, bufX, bufY, score, scoreDialColumn, scoreDialsRow, this.score);
    const shownHigh = Math.trunc(Math.max(score, highScore));
    drawRollingInteger(this, screen, bufX, bufY, shownHigh, highScoreDialColumn, scoreDialsRow, this.high);
  }
}

/** "1UP" and "HIGH SCORE" on the top row, for a screen whose background does not have them. */
export function drawScoreLabels(screen: Surface, bufX: number, bufY: number): void {
  screen.draw(imageScoreLabels, scoreLabelsX + bufX, bufY);
}

function digitGlyphSize(): [number, number] {
  const dw = Math.trunc(imageDigits.w / 10);
  const dh = imageDigits.h;
  return [dw, dh];
}

function digitFrame(digit: number): Sprite {
  let d = digit % 10;
  if (d < 0) {
    d += 10;
  }
  const [dw, dh] = digitGlyphSize();
  return sub(imageDigits, d * dw, 0, (d + 1) * dw, dh);
}

function digitDialCell(cache: ScoreDials, dw: number, dh: number): Surface {
  const cached = cache.scratch;
  if (cached !== null && cached.width === dw && cached.height === dh) {
    return cached;
  }
  const cell = Surface.offscreen(dw, dh);
  cache.scratch = cell;
  return cell;
}

/**
 * Renders each decimal column into a dw×dh scratch (hard clip), then
 * composites that cell onto the HUD. The last 2 digits always draw.
 */
function drawRollingInteger(
  cache: ScoreDials,
  screen: Surface,
  bufX: number,
  bufY: number,
  value: number,
  tx: number,
  ty: number,
  reels: DigitReels,
): void {
  const digs = digits6(value);
  const [dw, dhInt] = digitGlyphSize();
  const dh = dhInt;
  const cell = digitDialCell(cache, dw, dhInt);

  let leadingZero = true;
  for (let i = 0; i < 6; i++) {
    const digit = digs[i] ?? 0;
    const r = reels[i];
    if (r === undefined) {
      continue;
    }
    if (i >= 6 - 2) {
      leadingZero = false;
    }

    if (digit === 0 && leadingZero && !r.active) {
      continue;
    }

    if (digit !== 0) {
      leadingZero = false;
    }

    const px = 8 * (tx + i) + bufX;
    const py = 8 * ty + bufY;

    cell.clear();

    if (r.active) {
      const p = r.scroll01();
      const offOld = -p * dh;
      const offNew = (1 - p) * dh;
      cell.draw(digitFrame(r.from), 0, offOld);
      cell.draw(digitFrame(r.to), 0, offNew);
    } else {
      cell.draw(digitFrame(r.settledDigit), 0, 0);
    }

    screen.drawSurface(cell, goRound(px), goRound(py));
  }
}
