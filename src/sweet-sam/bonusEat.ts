// Port of the Go Sweet Sam minigame's bonus_eat.go (docs/port-notes.md gives its old Go name).

import { sub } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";
import { imagePoints } from "../engine/assets.ts";
import { pointsFrameSize } from "./art.ts";
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

/** Go `image.Rect(x0, 0, x0+16, 16)` as `[x0, y0, x1, y1]`: the popup's frame of points.png. */
export function bonusEatFrameRect(frameIdx: number): [number, number, number, number] {
  const x0 = clampFrameIdx(frameIdx) * pointsFrameSize;
  return [x0, 0, x0 + pointsFrameSize, pointsFrameSize];
}

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
    const [x0, y0, x1, y1] = bonusEatFrameRect(p.frameIdx);
    const frame = sub(imagePoints, x0, y0, x1, y1);
    // Centred on the bee; one tile gap above the bee, the frame flush above that gap.
    screen.draw(frame, p.x + bufX - pointsFrameSize / 2, p.y + bufY - tileSize - pointsFrameSize);
  }
}
