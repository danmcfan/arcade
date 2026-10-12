// Port of internal/hive/cabinet.go.

import { direction, moving, type Input } from "../engine/input.ts";
import { sub } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";
import { imageCabinet } from "../engine/assets.ts";

export const cabinetWidth = 336;
export const cabinetHeight = 428;

export const cabinetFrameWidth = 336;
export const cabinetFrameHeight = 428;

export const cabinetInsetTop = 56;
export const cabinetInsetBottom = 84;
export const cabinetInsetLeft = 56;
export const cabinetInsetRight = 56;

export const cabinetFrameNeutral = 0;
export const cabinetFrameUp = 1;
export const cabinetFrameDown = 2;
export const cabinetFrameLeft = 3;
export const cabinetFrameRight = 4;

export function cabinetJoystickFrame(i: Input): number {
  if (!moving(i)) {
    return cabinetFrameNeutral;
  }
  switch (direction(i)) {
    case "UP":
      return cabinetFrameUp;
    case "DOWN":
      return cabinetFrameDown;
    case "LEFT":
      return cabinetFrameLeft;
    case "RIGHT":
      return cabinetFrameRight;
    default:
      return cabinetFrameNeutral;
  }
}

export function drawCabinet(screen: Surface, frame: number): void {
  if (frame < cabinetFrameNeutral) {
    frame = cabinetFrameNeutral;
  }
  if (frame > cabinetFrameRight) {
    frame = cabinetFrameRight;
  }

  const sx = frame * cabinetFrameWidth;
  const frameImg = sub(imageCabinet, sx, 0, sx + cabinetFrameWidth, cabinetFrameHeight);

  screen.draw(frameImg, 0, 0);
}
