import { describe, expect, test } from "bun:test";
import { checkCollision, checkCollisions, newWalls } from "./collision.ts";

describe("newWalls", () => {
  test("four walls in tile units (tileSize 8), as collision.go", () => {
    expect(newWalls()).toEqual([
      { x: 0, y: 0, w: 160, h: 48 },
      { x: 0, y: 48, w: 24, h: 72 },
      { x: 136, y: 48, w: 24, h: 72 },
      { x: 0, y: 120, w: 160, h: 24 },
    ]);
  });

  test("returns fresh copies each call", () => {
    const a = newWalls();
    const b = newWalls();
    expect(a).not.toBe(b);
    expect(a[0]).not.toBe(b[0]);
  });
});

describe("checkCollision (strict AABB overlap)", () => {
  const b = { x: 10, y: 10, w: 10, h: 10 };
  const cases: [string, { x: number; y: number; w: number; h: number }, boolean][] = [
    ["overlapping", { x: 15, y: 15, w: 10, h: 10 }, true],
    ["contained", { x: 12, y: 12, w: 2, h: 2 }, true],
    ["touching on the left edge", { x: 0, y: 10, w: 10, h: 10 }, false],
    ["touching on the right edge", { x: 20, y: 10, w: 10, h: 10 }, false],
    ["touching on the top edge", { x: 10, y: 0, w: 10, h: 10 }, false],
    ["touching on the bottom edge", { x: 10, y: 20, w: 10, h: 10 }, false],
    ["one pixel into the left edge", { x: 1, y: 10, w: 10, h: 10 }, true],
    ["fractional overlap", { x: 19.5, y: 19.5, w: 10, h: 10 }, true],
    ["far away", { x: 100, y: 100, w: 1, h: 1 }, false],
  ];
  for (const [name, a, want] of cases) {
    test(name, () => {
      expect(checkCollision(a, b)).toBe(want);
    });
  }
});

describe("checkCollisions against the hub walls", () => {
  // Player rect is 16x24 centred on (x, y).
  const playerAt = (x: number, y: number) => ({ x: x - 8, y: y - 12, w: 16, h: 24 });
  const walls = newWalls();
  const cases: [string, number, number, boolean][] = [
    ["spawn point (80, 92)", 80, 92, false],
    ["top wall face: y = 60 is clear", 80, 60, false],
    ["top wall face: y = 59 collides", 80, 59, true],
    ["left wall face: x = 32 is clear", 32, 92, false],
    ["left wall face: x = 31 collides", 31, 92, true],
    ["right wall face: x = 128 is clear", 128, 92, false],
    ["right wall face: x = 129 collides", 129, 92, true],
    ["bottom wall face: y = 108 is clear", 80, 108, false],
    ["bottom wall face: y = 109 collides", 80, 109, true],
  ];
  for (const [name, x, y, want] of cases) {
    test(name, () => {
      expect(checkCollisions(playerAt(x, y), walls)).toBe(want);
    });
  }

  test("empty list never collides", () => {
    expect(checkCollisions(playerAt(0, 0), [])).toBe(false);
  });
});
