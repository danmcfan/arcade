import { describe, expect, test } from "bun:test";
import type { LumberjackTreeSnapshot } from "../src/game/snapshot.ts";
import { lumberjackTrees, treeTopEdgeMasks, treeTopTexels, FRAME_W } from "./tree-mask.ts";

function tree(over: Partial<LumberjackTreeSnapshot>): LumberjackTreeSnapshot {
  return {
    x: 128,
    y: 72,
    theta: 0.03,
    thetaInc: true,
    shaking: true,
    shakeRight: true,
    behind: false,
    transparent: false,
    health: 100,
    ...over,
  };
}

// Opaque texel block u in [10, 30), v in [10, 30). Tree minX = 96, minY = 32.
const block = (u: number, v: number) => u >= 10 && u < 30 && v >= 10 && v < 30;

function masked(trees: LumberjackTreeSnapshot[]): Set<string> {
  return new Set(treeTopEdgeMasks(trees, block, 512, 288).map((m) => `${m.x},${m.y}`));
}

describe("treeTopEdgeMasks", () => {
  test("masks the pixels along the rotated silhouette, not its interior or the empty frame", () => {
    const m = masked([tree({})]);
    expect(m.size).toBeGreaterThan(0);
    // Interior of the block (texel ~ (20, 20) → around (116, 52)).
    expect(m.has("116,52")).toBe(false);
    // Far outside the block but inside the frame.
    expect(m.has("150,100")).toBe(false);
    // Every masked pixel lies within a pixel or two of the block's rotated outline.
    for (const key of m) {
      const [x = 0, y = 0] = key.split(",").map(Number);
      expect(x).toBeGreaterThanOrEqual(96 + 10 - 3);
      expect(x).toBeLessThanOrEqual(96 + 30 + 3);
      expect(y).toBeGreaterThanOrEqual(32 + 10 - 3);
      expect(y).toBeLessThanOrEqual(32 + 30 + 3);
    }
    // The left edge column near the vertical middle is masked.
    const leftEdge = [...m].filter((k) => k.endsWith(",52")).map((k) => Number(k.split(",")[0]));
    expect(Math.min(...leftEdge)).toBeLessThanOrEqual(107);
  });

  test("unrotated and felled trees get no mask", () => {
    expect(masked([tree({ theta: 0 }), tree({ health: 0 })]).size).toBe(0);
  });

  test("treeTopTexels reads frame (1, 0) alpha and treats rows >= 56 as cleared", () => {
    const width = 3 * FRAME_W;
    const data = new Uint8Array(width * 80 * 4);
    data[(5 * width + FRAME_W + 7) * 4 + 3] = 255;
    data[(60 * width + FRAME_W + 7) * 4 + 3] = 255;
    const opaque = treeTopTexels({ width, data });
    expect(opaque(7, 5)).toBe(true);
    expect(opaque(8, 5)).toBe(false);
    expect(opaque(7, 60)).toBe(false);
    expect(opaque(-1, 5)).toBe(false);
  });
});

describe("lumberjackTrees", () => {
  test("returns the trees of a lumberjack trace snapshot", () => {
    const trees = [tree({ x: 10 }), tree({ x: 20, health: -1 })];
    expect(lumberjackTrees({ tick: 3, rng: 1, player: {}, trees })).toEqual(trees);
  });

  test("throws on a snapshot that is not lumberjack-shaped", () => {
    expect(() => lumberjackTrees({ tick: 3, rng: 1, sw: {} })).toThrow(/trees/);
    expect(() => lumberjackTrees({ trees: [{ x: 1, y: 2 }] })).toThrow(/trees\[0\]/);
    expect(() => lumberjackTrees(null)).toThrow();
  });
});
