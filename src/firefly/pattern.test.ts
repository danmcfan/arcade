import { describe, expect, test } from "bun:test";
import { newBezierPatternFunc } from "./pattern.ts";
import { leftBezierConfig, rightBezierConfig } from "./game.ts";

describe("bezier pattern", () => {
  const left = newBezierPatternFunc(leftBezierConfig);
  const right = newBezierPatternFunc(rightBezierConfig);

  test("starts at p0 (tile 16,1 left; tile 12,1 right)", () => {
    expect(left(0)).toEqual({ x: 128, y: 8 });
    expect(right(0)).toEqual({ x: 96, y: 8 });
  });

  test("ends at p3 (tile 14,12) for both", () => {
    expect(left(1)).toEqual({ x: 112, y: 96 });
    expect(right(1)).toEqual({ x: 112, y: 96 });
  });

  test("midpoint matches the worked cubic", () => {
    // 1/8·p0 + 3/8·p1 + 3/8·p2 + 1/8·p3 with p1 = (-112,192), p2 = (112,288)
    expect(left(0.5)).toEqual({ x: 30, y: 193 });
  });
});
