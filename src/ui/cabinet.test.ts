import { describe, expect, test } from "bun:test";
import { fitScale } from "../engine/scale.ts";
import {
  cabinetHeight,
  cabinetInsetBottom,
  cabinetInsetLeft,
  cabinetInsetRight,
  cabinetInsetTop,
  cabinetPlayfieldHeight,
  cabinetPlayfieldWidth,
  cabinetWidth,
} from "./cabinet.ts";

/** The whole-number scale the cabinet gets in a `w x h` window at `dpr`. */
function scale(w: number, h: number, dpr: number): number {
  return fitScale(cabinetWidth, cabinetHeight, w, h, dpr).scale;
}

describe("cabinet size", () => {
  test("240x304: the 224x288 playfield with an 8 px outline on every side", () => {
    expect([cabinetWidth, cabinetHeight]).toEqual([240, 304]);
    expect([cabinetInsetTop, cabinetInsetBottom, cabinetInsetLeft, cabinetInsetRight]).toEqual([8, 8, 8, 8]);
    expect([cabinetPlayfieldWidth, cabinetPlayfieldHeight]).toEqual([224, 288]);
  });

  test("whole-number scales: 2x at 1280x720, 3x at 1920x1080, 3x on a phone in landscape", () => {
    expect([scale(1280, 720, 1), scale(1920, 1080, 1), scale(844, 390, 3)]).toEqual([2, 3, 3]);
  });
});
