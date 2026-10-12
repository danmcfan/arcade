// The arcade cabinet bezel every minigame plays inside (a port of
// internal/hive/cabinet.go, shared since #15). A `FixedViewport` minigame
// sized `cabinetWidth` x `cabinetHeight` draws its cabinet strip at 0,0 with
// `drawCabinet`, then its playfield inside the insets. The strip holds 5
// joystick frames side by side; `cabinetJoystickFrame` picks one per tick.

import { direction, moving, type Input } from "../engine/input.ts";
import { sub, type Sprite } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";

export const cabinetWidth = 336;
export const cabinetHeight = 428;

export const cabinetFrameWidth = 336;
export const cabinetFrameHeight = 428;

export const cabinetInsetTop = 56;
export const cabinetInsetBottom = 84;
export const cabinetInsetLeft = 56;
export const cabinetInsetRight = 56;

/** The space inside the insets: 224x288, Sweet Sam's maze and Firefly's galaxy. */
export const cabinetPlayfieldWidth = cabinetWidth - cabinetInsetLeft - cabinetInsetRight;
export const cabinetPlayfieldHeight = cabinetHeight - cabinetInsetTop - cabinetInsetBottom;

export const cabinetFrameNeutral = 0;
export const cabinetFrameUp = 1;
export const cabinetFrameDown = 2;
export const cabinetFrameLeft = 3;
export const cabinetFrameRight = 4;

/** Which of the 5 strip frames shows the joystick for this tick's input. */
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

/** Draws joystick `frame` (clamped to 0..4) of the cabinet strip `sprite` at 0,0. */
export function drawCabinet(screen: Surface, frame: number, sprite: Sprite): void {
  if (frame < cabinetFrameNeutral) {
    frame = cabinetFrameNeutral;
  }
  if (frame > cabinetFrameRight) {
    frame = cabinetFrameRight;
  }

  const sx = frame * cabinetFrameWidth;
  const frameImg = sub(sprite, sx, 0, sx + cabinetFrameWidth, cabinetFrameHeight);

  screen.draw(frameImg, 0, 0);
}
