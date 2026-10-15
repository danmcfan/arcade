import { describe, expect, test } from "bun:test";
import { nineSlice } from "./nineSlice.ts";

/** Which source pixel lands on each destination pixel, as "sx,sy". */
function sourceOf(cells: ReturnType<typeof nineSlice>, w: number, h: number): string[][] {
  const grid = Array.from({ length: h }, () => Array.from({ length: w }, () => ""));
  for (const c of cells) {
    for (let y = 0; y < c.h; y++) {
      for (let x = 0; x < c.w; x++) {
        const row = grid[c.dy + y];
        if (row === undefined || row[c.dx + x] !== "") throw new Error(`pixel ${c.dx + x},${c.dy + y} drawn twice`);
        row[c.dx + x] = `${c.sx + x},${c.sy + y}`;
      }
    }
  }
  return grid;
}

describe("nineSlice", () => {
  test("keeps the corners, repeats the middle and cuts the last repeat short, covering every pixel once", () => {
    // A 7x6 image with 2 px corners (a 3x2 middle) drawn at 10x7.
    const grid = sourceOf(nineSlice(7, 6, 2, 10, 7), 10, 7);
    expect(grid.flat().every((s) => s !== "")).toBe(true);
    expect(grid[0]?.slice(0, 2)).toEqual(["0,0", "1,0"]);
    expect(grid[0]?.slice(-2)).toEqual(["5,0", "6,0"]);
    expect(grid[6]?.at(-1)).toBe("6,5");
    // The top edge's middle: 2..4 then 2..4 again, cut to fit 6 px.
    expect(grid[0]?.slice(2, 8).map((s) => s.split(",")[0])).toEqual(["2", "3", "4", "2", "3", "4"]);
    // The left edge's middle rows: 2, 3, 2.
    expect(grid.slice(2, 5).map((r) => r[0])).toEqual(["0,2", "0,3", "0,2"]);
  });

  test("draws an image at its own size unchanged", () => {
    const grid = sourceOf(nineSlice(8, 8, 3, 8, 8), 8, 8);
    grid.forEach((row, y) => {
      row.forEach((s, x) => {
        expect(s).toBe(`${x},${y}`);
      });
    });
  });

  test("throws on an image with no middle", () => {
    expect(() => nineSlice(6, 6, 3, 10, 10)).toThrow("no middle");
  });
});
