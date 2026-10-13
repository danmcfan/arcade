// Port of the Go port's Sweet Sam bonus_eat.go.

import { sub } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";
import { imageBonus } from "../engine/assets.ts";
import { tileSize } from "./entity.ts";
import type { SweetSamSoftware } from "./software.ts";

export const bonusEatSpriteSize = 16;
export const bonusEatFrameCount = 4;
/** Go `int(bonusEatIndicatorTTLSecs * float64(framesPerSecond))` with a 0.75 s TTL, a constant expression (fact 3). */
export const bonusEatIndicatorTicks = 45;

export const scaredBeeEatPoints: readonly number[] = [200, 400, 800, 1600];

/** A transient "200 / 400 / …" sprite above an eaten bee. A Go value type. */
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

/** Go `image.Rect(x0, 0, x0+16, 16)` as `[x0, y0, x1, y1]`. */
export function bonusEatFrameRect(frameIdx: number): [number, number, number, number] {
  const x0 = clampFrameIdx(frameIdx) * bonusEatSpriteSize;
  return [x0, 0, x0 + bonusEatSpriteSize, bonusEatSpriteSize];
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
  const sh = bonusEatSpriteSize;
  for (const p of s.bonusEatPopups) {
    const [x0, y0, x1, y1] = bonusEatFrameRect(p.frameIdx);
    const frame = sub(imageBonus, x0, y0, x1, y1);

    const screenX = p.x + bufX;
    const screenY = p.y + bufY;
    // Anchor center-X on bee; one tile gap above bee, sprite sits flush above that gap.
    screen.draw(frame, screenX - bonusEatSpriteSize / 2, screenY - tileSize - sh);
  }
}
