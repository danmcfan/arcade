// Port of the Go Sweet Sam minigame's bonus_eat.go (docs/port-notes.md gives its old Go name).

import type { Surface } from "../engine/surface.ts";
import { drawTextCentered } from "../ui/text.ts";
import { tileSize } from "./entity.ts";
import type { SweetSamSoftware } from "./software.ts";

export const bonusEatFrameCount = 4;
/** Go `int(bonusEatIndicatorTTLSecs * float64(framesPerSecond))` with a 0.75 s TTL, a constant expression (fact 3). */
export const bonusEatIndicatorTicks = 45;

export const scaredBeeEatPoints: readonly number[] = [200, 400, 800, 1600];

/** A transient "200 / 400 / …" above an eaten bee. A Go value type. */
export interface BonusEatPopup {
  x: number;
  y: number;
  frameIdx: number;
  ticksRemain: number;
}

/** Clamps a popup frame index into `[0, bonusEatFrameCount)`, as Go does inline. */
function clampFrameIdx(frameIdx: number): number {
  if (frameIdx < 0) {
    return 0;
  }
  if (frameIdx >= bonusEatFrameCount) {
    return bonusEatFrameCount - 1;
  }
  return frameIdx;
}

/** The points a popup shows: 200, 400, 800 or 1600. */
export function bonusEatPoints(frameIdx: number): number {
  return scaredBeeEatPoints[clampFrameIdx(frameIdx)] ?? 0;
}

/** How far above the bee the points' top row is: a tile's gap, then rows 4..10 of Go's 16 px popup. */
const popupRise = tileSize + 12;

export function spawnBonusEatIndicator(s: SweetSamSoftware, worldX: number, worldY: number, frameIdx: number): void {
  s.bonusEatPopups.push({
    x: worldX,
    y: worldY,
    frameIdx: clampFrameIdx(frameIdx),
    ticksRemain: bonusEatIndicatorTicks,
  });
}

export function tickBonusEatPopups(s: SweetSamSoftware): void {
  if (s.bonusEatPopups.length === 0) {
    return;
  }
  const dst: BonusEatPopup[] = [];
  for (const p of s.bonusEatPopups) {
    p.ticksRemain--;
    if (p.ticksRemain > 0) {
      dst.push(p);
    }
  }
  s.bonusEatPopups = dst;
}

export function anyBeeInScaredMode(s: SweetSamSoftware): boolean {
  for (const e of s.enemies) {
    if (e.blueFrames > 0) {
      return true;
    }
  }
  return false;
}

export function resetScaredEatAwardIfNobodyScared(s: SweetSamSoftware): void {
  if (anyBeeInScaredMode(s)) {
    return;
  }
  s.scaredEatAwardNext = 0;
}

export function drawBonusEatIndicators(s: SweetSamSoftware, screen: Surface, bufX: number, bufY: number): void {
  for (const p of s.bonusEatPopups) {
    // Centred on the bee, in the pixel font, where Go's popup sprite drew its digits.
    drawTextCentered(screen, String(bonusEatPoints(p.frameIdx)), p.x + bufX, p.y + bufY - popupRise);
  }
}
