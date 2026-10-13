import { describe, expect, test } from "bun:test";
import { newBezierPatternFunc } from "./pattern.ts";

describe("bezier pattern", () => {
  const curve = newBezierPatternFunc({
    p0: { x: 128, y: 8 },
    p1: { x: -112, y: 192 },
    p2: { x: 112, y: 288 },
    p3: { x: 112, y: 96 },
  });

  test("starts at p0 and ends at p3", () => {
    expect(curve(0)).toEqual({ x: 128, y: 8 });
    expect(curve(1)).toEqual({ x: 112, y: 96 });
  });

  test("midpoint matches the worked cubic", () => {
    // 1/8·p0 + 3/8·p1 + 3/8·p2 + 1/8·p3
    expect(curve(0.5)).toEqual({ x: 30, y: 193 });
  });
});
