import { describe, expect, test } from "bun:test";
import * as rng from "../engine/rng.ts";
import { flowerKind, flowerKinds, flowerPoints, flowerStayTicks } from "./flower.ts";

describe("the flower table (Pac-Man's Table A.1)", () => {
  test("each level's kind and points, level 13 and on holding the last", () => {
    const table: [number, number, number][] = [
      [1, 0, 100],
      [2, 1, 300],
      [3, 2, 500],
      [4, 2, 500],
      [5, 3, 700],
      [6, 3, 700],
      [7, 4, 1000],
      [8, 4, 1000],
      [9, 5, 2000],
      [10, 5, 2000],
      [11, 6, 3000],
      [12, 6, 3000],
      [13, 7, 5000],
      [14, 7, 5000],
      [255, 7, 5000],
    ];
    for (const [level, kind, points] of table) {
      expect([level, flowerKind(level), flowerPoints(level)]).toEqual([level, kind, points]);
    }
    expect(flowerKinds).toBe(8);
  });
});

describe("flowerStayTicks", () => {
  test("a random stay between 9 s and 10 s from the seeded rng", () => {
    const stays = Array.from({ length: 2000 }, () => {
      rng.float();
      return flowerStayTicks();
    });
    expect(Math.min(...stays)).toBe(540);
    expect(Math.max(...stays)).toBe(600);
    rng.seed(7);
    const a = flowerStayTicks();
    expect(flowerStayTicks()).toBe(a); // reading it leaves the rng where it was
    rng.seed(8);
    expect(flowerStayTicks()).not.toBe(a);
  });
});
