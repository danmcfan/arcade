// The cabinets' rolling number dials (#266; Sweet Sam's first, a port of the
// Go game's draw.go): each digit spins on its reel (./digitReel.ts) inside an
// 8×8 cell, in the thick dial digits. The caller places every dial; nothing
// here knows a game's layout.

import { imageDigits, imageScoreLabels } from "../engine/assets.ts";
import { goRound } from "../engine/gomath.ts";
import { sub, type Sprite } from "../engine/image.ts";
import { Surface } from "../engine/surface.ts";
import { bootReels, digits6, newDigitReels, syncAndTick, type DigitReels } from "./digitReel.ts";
import { scoreLabelsX } from "./hudArt.ts";

/** A dial digit's width and height: an 8×8 tile. */
export const dialDigitSize = 8;

/** Where a dial's six-reel field starts, in px from the origin its draw is given. */
export interface DialPosition {
  readonly x: number;
  readonly y: number;
}

function digitFrame(digit: number): Sprite {
  let d = digit % 10;
  if (d < 0) {
    d += 10;
  }
  return sub(imageDigits, d * dialDigitSize, 0, (d + 1) * dialDigitSize, dialDigitSize);
}

/** The cell a dial clips its digits in (Go `digitDialScratch`); made lazily on the first draw (D12), shareable between dials. */
class DialCell {
  private cell: Surface | null = null;

  get(): Surface {
    this.cell ??= Surface.offscreen(dialDigitSize, dialDigitSize);
    return this.cell;
  }
}

/** One number on a HUD: owns its reels, so the value drawn is the value spun to. */
export class Dial {
  readonly reels: DigitReels = newDigitReels();
  private readonly at: DialPosition;
  private readonly alwaysShown: number;
  private value: number;
  private readonly cell: DialCell;

  /** Settled on `initial`, with no spin; the last `alwaysShown` digits draw even when they are leading zeros. */
  constructor(at: DialPosition, initial = 0, alwaysShown = 2, cell = new DialCell()) {
    this.at = at;
    this.cell = cell;
    this.value = initial;
    this.alwaysShown = alwaysShown;
    bootReels(this.reels, initial);
  }

  /** Point the reels at `value` and advance them one tick. */
  update(value: number): void {
    this.value = value;
    syncAndTick(this.reels, digits6(value));
  }

  /**
   * Six reels from the dial's position, offset by (ox, oy), a digit per 8 px.
   * Leading zeros are blank. Each column renders into the scratch cell (hard
   * clip), which is then composited.
   */
  draw(screen: Surface, ox = 0, oy = 0): void {
    const digs = digits6(this.value);
    const cell = this.cell.get();

    let leadingZero = true;
    for (let i = 0; i < 6; i++) {
      const digit = digs[i] ?? 0;
      const r = this.reels[i];
      if (r === undefined) {
        continue;
      }
      if (i >= 6 - this.alwaysShown) {
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

      screen.drawSurface(cell, goRound(ox + this.at.x + dialDigitSize * i), goRound(oy + this.at.y));
    }
  }
}

/**
 * The Score and high score dials. The high score starts on the House high
 * score and follows the Score once the Score passes it, so it is never shown
 * below the Score.
 */
export class ScoreDials {
  readonly score: Dial;
  readonly high: Dial;
  private best: number;

  constructor(houseHighScore: number, at: { readonly score: DialPosition; readonly high: DialPosition }) {
    this.best = Math.min(999_999, Math.max(0, houseHighScore));
    const cell = new DialCell();
    this.score = new Dial(at.score, 0, 2, cell);
    this.high = new Dial(at.high, this.best, 2, cell);
  }

  /** The high score shown: the House high score, or the best Score this run once it passed. */
  get highScore(): number {
    return this.best;
  }

  /** Point the dials at `score` and the high score it makes, and advance them a tick. */
  tick(score: number): void {
    this.best = Math.max(this.best, score);
    this.score.update(score);
    this.high.update(this.best);
  }

  draw(screen: Surface, ox = 0, oy = 0): void {
    this.score.draw(screen, ox, oy);
    this.high.draw(screen, ox, oy);
  }
}

/** "1UP" and "HIGH SCORE" on the top row from (ox, oy), for a screen whose background does not have them. */
export function drawScoreLabels(screen: Surface, ox: number, oy: number): void {
  screen.draw(imageScoreLabels, scoreLabelsX + ox, oy);
}
