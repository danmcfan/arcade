import { describe, expect, test } from "bun:test";
import { checkCollision, checkCollisions, newWalls, type Rect } from "./collision.ts";

describe("newWalls", () => {
  test("the back wall, then the frame's left, right and bottom edges, just outside it", () => {
    expect(newWalls()).toEqual([
      { x: 0, y: 0, w: 160, h: 48 },
      { x: -8, y: 0, w: 8, h: 144 },
      { x: 160, y: 0, w: 8, h: 144 },
      { x: 0, y: 144, w: 160, h: 8 },
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

// Player rect is 16x24 centred on (x, y).
function playerAt(x: number, y: number): Rect {
  return { x: x - 8, y: y - 12, w: 16, h: 24 };
}

describe("checkCollisions against the hub walls", () => {
  const walls = newWalls();
  const cases: [string, number, number, boolean][] = [
    ["spawn point (80, 92)", 80, 92, false],
    ["top wall face: y = 60 is clear", 80, 60, false],
    ["top wall face: y = 59 collides", 80, 59, true],
    ["left edge: x = 8 is clear", 8, 92, false],
    ["left edge: x = 7 collides", 7, 92, true],
    ["right edge: x = 152 is clear", 152, 92, false],
    ["right edge: x = 153 collides", 153, 92, true],
    ["bottom edge: y = 132 is clear", 80, 132, false],
    ["bottom edge: y = 133 collides", 80, 133, true],
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
