import { describe, expect, test } from "bun:test";
import { overlaps, resolve, type Hitbox } from "./hitbox.ts";

describe("overlaps", () => {
  const a = { x: 0, y: 0, w: 10, h: 10 };

  test("boxes sharing area overlap", () => {
    expect(overlaps(a, { x: 5, y: 5, w: 10, h: 10 })).toBe(true);
  });

  test("touching edges do not overlap (strict <)", () => {
    expect(overlaps(a, { x: 10, y: 0, w: 10, h: 10 })).toBe(false);
    expect(overlaps(a, { x: -10, y: 0, w: 10, h: 10 })).toBe(false);
    expect(overlaps(a, { x: 0, y: 10, w: 10, h: 10 })).toBe(false);
    expect(overlaps(a, { x: 0, y: -10, w: 10, h: 10 })).toBe(false);
  });

  test("a fractional sliver overlaps", () => {
    expect(overlaps(a, { x: 9.5, y: 0, w: 10, h: 10 })).toBe(true);
  });
});

/** A 10x10 box at (x, y). */
function box(x: number, y: number): Hitbox {
  return { x, y, w: 10, h: 10 };
}

describe("resolve", () => {
  test("src left of dst is pushed left by the overlap", () => {
    expect(resolve(box(0, 0), box(8, 0))).toEqual([-2, 0]);
  });

  test("src right of dst is pushed right by the overlap", () => {
    expect(resolve(box(8, 0), box(0, 0))).toEqual([2, 0]);
  });

  test("src above dst is pushed up", () => {
    expect(resolve(box(0, 0), box(0, 7))).toEqual([0, -3]);
  });

  test("src below dst is pushed down", () => {
    expect(resolve(box(0, 8), box(0, 0))).toEqual([0, 2]);
  });

  test("an x/y tie resolves along Y", () => {
    expect(resolve(box(0, 0), box(8, 8))).toEqual([0, -2]);
  });

  test("the smaller axis wins even when it is Y", () => {
    expect(resolve(box(0, 0), box(5, 9))).toEqual([0, -1]);
  });
});
