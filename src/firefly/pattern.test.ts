import { describe, expect, test } from "bun:test";
import { newBezierPatternFunc, newPathPatternFunc, pathLength } from "./pattern.ts";

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

describe("chained path", () => {
  const a = { p0: { x: 0, y: 0 }, p1: { x: 0, y: 10 }, p2: { x: 10, y: 10 }, p3: { x: 10, y: 0 } };
  const b = { p0: { x: 10, y: 0 }, p1: { x: 10, y: -30 }, p2: { x: 40, y: -30 }, p3: { x: 40, y: 0 } };
  const path = newPathPatternFunc([a, b]);

  test("starts at the first curve's p0 and ends at the last curve's p3", () => {
    expect(path(0)).toEqual({ x: 0, y: 0 });
    expect(path(1)).toEqual({ x: 40, y: 0 });
  });

  test("runs on without a jump from one curve into the next", () => {
    let prev = path(0);
    for (let i = 1; i <= 400; i++) {
      const p = path(i / 400);
      expect(Math.hypot(p.x - prev.x, p.y - prev.y)).toBeLessThan(1);
      prev = p;
    }
  });

  test("shares t out by length, so a step covers the same ground on each curve", () => {
    const share = pathLength([a]) / pathLength([a, b]);
    expect(path(share).x).toBeCloseTo(10, 6);
    expect(path(share).y).toBeCloseTo(0, 6);
  });

  test("rejects curves that do not meet end to start", () => {
    expect(() => newPathPatternFunc([a, { ...b, p0: { x: 11, y: 0 } }])).toThrow();
  });
});
