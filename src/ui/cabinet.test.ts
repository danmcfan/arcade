import { describe, expect, test } from "bun:test";
import { imageCabinet } from "../engine/assets.ts";
import { whole, type Sprite } from "../engine/image.ts";
import { NO_INPUT } from "../engine/input.ts";
import type { Surface } from "../engine/surface.ts";
import {
  cabinetHeight,
  cabinetInsetBottom,
  cabinetInsetLeft,
  cabinetInsetRight,
  cabinetInsetTop,
  cabinetJoystickFrame,
  cabinetPlayfieldHeight,
  cabinetPlayfieldWidth,
  cabinetWidth,
  drawCabinet,
} from "./cabinet.ts";

describe("cabinet size", () => {
  test("336x428 with a 224x288 playfield inside the insets", () => {
    expect([cabinetWidth, cabinetHeight]).toEqual([336, 428]);
    expect([cabinetInsetTop, cabinetInsetBottom, cabinetInsetLeft, cabinetInsetRight]).toEqual([56, 84, 56, 56]);
    expect([cabinetPlayfieldWidth, cabinetPlayfieldHeight]).toEqual([224, 288]);
  });
});

describe("cabinetJoystickFrame", () => {
  test("neutral, then Up/Down/Left/Right by direction priority", () => {
    expect(cabinetJoystickFrame(NO_INPUT)).toBe(0);
    expect(cabinetJoystickFrame({ ...NO_INPUT, up: true, left: true })).toBe(1);
    expect(cabinetJoystickFrame({ ...NO_INPUT, down: true, right: true })).toBe(2);
    expect(cabinetJoystickFrame({ ...NO_INPUT, left: true, right: true })).toBe(3);
    expect(cabinetJoystickFrame({ ...NO_INPUT, right: true })).toBe(4);
    expect(cabinetJoystickFrame({ ...NO_INPUT, space: true })).toBe(0);
  });
});

interface DrawCall {
  sprite: Sprite;
  x: number;
  y: number;
}

function drawCalls(frame: number, sprite: Sprite): DrawCall[] {
  const calls: DrawCall[] = [];
  const fake: Pick<Surface, "draw"> = {
    draw: (s, x, y) => {
      calls.push({ sprite: s, x, y });
    },
  };
  drawCabinet(fake as Surface, frame, sprite);
  return calls;
}

const rect = (s: Sprite) => [s.sx, s.sy, s.w, s.h];

describe("drawCabinet", () => {
  test("draws the joystick frame of the given strip at 0,0", () => {
    const [call, ...rest] = drawCalls(2, imageCabinet);
    expect(rest).toEqual([]);
    expect(call?.sprite.asset).toBe(imageCabinet.asset);
    expect(call && rect(call.sprite)).toEqual([672, 0, 336, 428]);
    expect([call?.x, call?.y]).toEqual([0, 0]);
  });

  test("frames are clamped to 0..4", () => {
    expect(rect(drawCalls(-1, imageCabinet)[0]!.sprite)).toEqual([0, 0, 336, 428]);
    expect(rect(drawCalls(9, imageCabinet)[0]!.sprite)).toEqual([1344, 0, 336, 428]);
  });

  test("honours the sprite it is given", () => {
    const other = whole({ url: "other.png", width: 1680, height: 428, image: null });
    const call = drawCalls(3, other)[0];
    expect(call?.sprite.asset).toBe(other.asset);
    expect(call && rect(call.sprite)).toEqual([1008, 0, 336, 428]);
  });
});
