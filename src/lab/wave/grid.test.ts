import { expect, test } from "bun:test";
import * as rng from "../../engine/rng.ts";
import { Grid } from "./grid.ts";
import { cellsHash } from "./game.ts";

test("a new grid has every cell uncollapsed with all patterns in the top entropy bucket", () => {
  const g = new Grid(3, 2);
  expect(g.width).toBe(3);
  expect(g.height).toBe(2);
  expect(g.collapsedCount).toBe(0);
  for (let x = 0; x < 3; x++) {
    for (let y = 0; y < 2; y++) {
      expect(g.cell(x, y)).toEqual({ possible: [1, 2, 3], collapsed: false });
    }
  }
  // Reset appends in x-outer, y-inner order.
  expect(g.entropyBuckets[3]).toEqual([
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 0 },
    { x: 1, y: 1 },
    { x: 2, y: 0 },
    { x: 2, y: 1 },
  ]);
  expect(g.entropyBuckets[0]).toEqual([]);
  expect(g.entropyBuckets[1]).toEqual([]);
  expect(g.entropyBuckets[2]).toEqual([]);
});

/** The rng state after `n` draws from `seed`, without inspecting the grid. */
function stateAfter(seed: number, n: number): number {
  rng.seed(seed);
  for (let i = 0; i < n; i++) rng.float();
  return rng.state();
}

function collapsedCells(g: Grid): { x: number; y: number; v: number }[] {
  const out: { x: number; y: number; v: number }[] = [];
  for (let x = 0; x < g.width; x++) {
    for (let y = 0; y < g.height; y++) {
      const c = g.cell(x, y);
      if (c.collapsed) out.push({ x, y, v: c.possible[0] ?? -1 });
    }
  }
  return out;
}

test("the first step draws x, y, then the pattern, and constrains the four neighbours", () => {
  for (let seed = 1; seed <= 20; seed++) {
    const g = new Grid(5, 5);
    rng.seed(seed);
    g.step();
    expect(rng.state()).toBe(stateAfter(seed, 3));
    expect(g.collapsedCount).toBe(1);

    const done = collapsedCells(g);
    expect(done.length).toBe(1);
    const { x, y, v } = done[0] ?? { x: -1, y: -1, v: -1 };
    expect(g.cell(x, y).possible).toEqual([v]);
    expect(g.entropyBuckets[0]).toEqual([{ x, y }]);

    const expected = v === 1 ? [1, 2] : v === 3 ? [2, 3] : [1, 2, 3];
    for (const [nx, ny] of [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]] as const) {
      if (nx < 0 || ny < 0 || nx >= 5 || ny >= 5) continue;
      expect(g.cell(nx, ny).possible).toEqual(expected);
      expect(g.entropy[nx]?.[ny]).toBe(expected.length);
    }
  }
});

/** Every cell sits in exactly the bucket its entropy names, at its bucketIndex. */
function expectBucketInvariants(g: Grid): void {
  let total = 0;
  for (let e = 0; e <= g.patterns.length; e++) {
    const bucket = g.entropyBuckets[e] ?? [];
    total += bucket.length;
    bucket.forEach((p, i) => {
      expect(g.bucketIndex[p.x]?.[p.y]).toBe(i);
      expect(g.entropy[p.x]?.[p.y]).toBe(e);
    });
  }
  expect(total).toBe(g.width * g.height);
  expect(g.entropyBuckets[0]?.length).toBe(g.collapsedCount);
  expect(g.entropyBuckets[1]).toEqual([]);
  for (let x = 0; x < g.width; x++) {
    for (let y = 0; y < g.height; y++) {
      const c = g.cell(x, y);
      expect(g.entropy[x]?.[y]).toBe(c.collapsed ? 0 : c.possible.length);
    }
  }
}

test("bucket invariants hold after every random step", () => {
  for (const seed of [1, 2, 3, 99]) {
    rng.seed(seed);
    const g = new Grid(9, 7);
    expectBucketInvariants(g);
    for (let i = 0; i < 63; i++) {
      g.step();
      expectBucketInvariants(g);
    }
  }
});

test("width*height steps collapse every cell to a single pattern, and further steps do nothing", () => {
  rng.seed(5);
  const g = new Grid(16, 12);
  for (let i = 0; i < 16 * 12; i++) g.step();
  expect(g.collapsedCount).toBe(16 * 12);
  for (const col of g.cells) {
    for (const c of col) {
      expect(c.collapsed).toBe(true);
      expect(c.possible.length).toBe(1);
    }
  }
  const before = rng.state();
  g.step();
  expect(rng.state()).toBe(before);
  expect(g.collapsedCount).toBe(16 * 12);
});

test("after a full collapse, water never touches grass (over many seeds)", () => {
  for (let seed = 1; seed <= 200; seed++) {
    rng.seed(seed);
    const g = new Grid(24, 24);
    for (let i = 0; i < 24 * 24; i++) g.step();
    for (let x = 0; x < 24; x++) {
      for (let y = 0; y < 24; y++) {
        const v = g.cell(x, y).possible[0];
        for (const [nx, ny] of [[x + 1, y], [x, y + 1]] as const) {
          if (nx >= 24 || ny >= 24) continue;
          const n = g.cell(nx, ny).possible[0];
          expect([v, n].sort()).not.toEqual([1, 3]);
        }
      }
    }
  }
});

// Expected values from the Go grid.go (math/rand swapped for the mulberry32
// in §3.3), run once by hand: same rng state and cellsHash after N steps.
test.each([
  { seed: 7, w: 32, h: 32, steps: 100, collapsed: 100, rng: 3072508260, hash: 494077905 },
  { seed: 7, w: 32, h: 32, steps: 1024, collapsed: 1024, rng: 3371901436, hash: 3039139316 },
  { seed: 3, w: 64, h: 48, steps: 100000, collapsed: 3072, rng: 2157605368, hash: 877030262 },
])("matches Go: seed $seed, $w×$h, $steps steps", (tc) => {
  rng.seed(tc.seed);
  const g = new Grid(tc.w, tc.h);
  for (let i = 0; i < tc.steps; i++) g.step();
  expect(g.collapsedCount).toBe(tc.collapsed);
  expect(rng.state()).toBe(tc.rng);
  expect(cellsHash(g)).toBe(tc.hash);
});

// Perf smoke, standing in for Go's BenchmarkGrid* (grid_test.go has no tests).
test("perf smoke: a 128² grid collapses fully in under 1 s", () => {
  rng.seed(1);
  const start = performance.now();
  const g = new Grid(128, 128);
  for (let i = 0; i < g.width * g.height; i++) g.step();
  const ms = performance.now() - start;
  expect(g.collapsedCount).toBe(128 * 128);
  expect(ms).toBeLessThan(1000);
});
