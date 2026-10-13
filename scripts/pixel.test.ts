import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { prizeArt } from "../src/ui/prizeArt.ts";
import { repoRoot } from "../test/parity/fixtures.ts";
import { toPng, toRows } from "./pixel-art.ts";
import { autoScale, load, place, sheet } from "./pixel.ts";

const prizeSource = join(repoRoot, "src/ui/prizeArt.ts");
const icons = join(repoRoot, "src/assets/images/icons.png");

describe("load", () => {
  test("a record of rows is one image per entry, labelled with its key", async () => {
    const panels = await load(`${prizeSource}:prizeArt`);
    expect(panels.map((p) => p.label)).toEqual(Object.keys(prizeArt).map((k) => `prizeArt ${k}`));
    expect(toRows(panels[0]!.png)).toEqual([...prizeArt.honeyJar]);
  });

  test("name.key picks one entry", async () => {
    const [panel] = await load(`${prizeSource}:prizeArt.runningShoes`);
    expect(toRows(panel!.png)).toEqual([...prizeArt.runningShoes]);
  });

  test("an export with no rows is an error", async () => {
    await expect(load(`${prizeSource}:prizeRects`)).rejects.toThrow('exports no rows named "prizeRects"');
  });

  test("path.png#x,y,w,h is one area of the PNG", async () => {
    const [panel] = await load(`${icons}#0,0,9,9`);
    expect([panel!.png.width, panel!.png.height]).toEqual([9, 9]);
    expect(panel!.label).toBe("icons.png 0,0,9,9");
  });

  test("an area outside the PNG is an error", async () => {
    await expect(load(`${icons}#20,0,9,9`)).rejects.toThrow("is outside the 23x9 image");
  });
});

describe("sheets", () => {
  test("autoScale fits about 384 px, between 1x and 8x", () => {
    expect(autoScale(toPng(["k"]))).toBe(8);
    expect(autoScale(toPng(Array(192).fill("k".repeat(192))))).toBe(2);
    expect(autoScale(toPng(Array(500).fill("k")))).toBe(1);
  });

  test("a sheet holds every panel at its scale, with room for the labels", () => {
    const png = sheet([{ label: "a", png: toPng(["kk", "kk"]) }], 4);
    expect(png.width).toBeGreaterThanOrEqual(8 + 2 * 16);
    expect(png.height).toBeGreaterThan(8 + 2 * 16);
  });

  test("place draws over the base, and transparent pixels leave it", () => {
    const out = place(toPng(["yyy", "yyy"]), [{ png: toPng(["r.", ".r"]), x: 1, y: 0 }]);
    expect(toRows(out)).toEqual(["yry", "yyr"]);
  });
});
