import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./repo-root.ts";
import { isRecord } from "./pixel.ts";
import { sweetie } from "../src/ui/sweetie16.ts";
import { artSources, asRowsValue, fromSheet, toSheet, writeRows } from "./art-source.ts";
import { plot } from "./pixel-art.ts";

const fixture = `// A fixture art source.
import { mirrorX } from "./pixel-art.ts";

/** Two frames, per facing. */
export const walk: Readonly<Record<"down" | "up", readonly (readonly string[])[]>> = {
  down: [
    ["kk", "rr"],
    ["rr", "kk"],
  ],
  // up: "]" and "}" in a comment must not end the block
  up: [["ww", "ww"]],
};

export const pot: readonly string[] = [".y.", "oyo"];

export const derived = mirrorX(pot);

export const tail = ["k"];
`;

describe("writeRows", () => {
  test("replaces one record entry's frames and leaves the rest of the file byte-identical", () => {
    const out = writeRows(fixture, "walk", "down", [
      ["gg", "GG"],
      ["GG", "gg"],
    ]);
    const before = fixture.split('    ["kk"')[0] ?? "";
    expect(out.startsWith(before)).toBe(true);
    expect(out).toContain(`  down: [\n    ["gg", "GG"],\n    ["GG", "gg"],\n  ],\n  // up:`);
    expect(out.slice(out.indexOf("  // up:"))).toBe(fixture.slice(fixture.indexOf("  // up:")));
  });

  test("replaces a plain rows export", () => {
    const out = writeRows(fixture, "pot", undefined, ["...", "ooo"]);
    expect(out).toBe(fixture.replace(`[".y.", "oyo"]`, `["...", "ooo"]`));
  });

  test("round-trips: writing back the same rows changes nothing", () => {
    expect(writeRows(fixture, "pot", undefined, [".y.", "oyo"])).toBe(fixture);
  });

  test("refuses an export that is not a literal of rows", () => {
    expect(() => writeRows(fixture, "derived", undefined, ["..."])).toThrow(/not a literal/u);
  });

  test("refuses a missing export or key", () => {
    expect(() => writeRows(fixture, "nope", undefined, ["k"])).toThrow(/no export/u);
    expect(() => writeRows(fixture, "walk", "left", [["k"]])).toThrow(/no entry "left"/u);
  });
});

describe("writeRows on the real art sources", () => {
  // Computed exports (`Object.keys(...)`, `mirrorX(...)`) are refused, not art to save into.
  const computed = new Set(["charset", "inkOrder"]);
  test.each(artSources)("writing back %s's own rows changes nothing", async (file) => {
    const path = join(repoRoot, file);
    const source = readFileSync(path, "utf8");
    const mod: unknown = await import(path);
    if (!isRecord(mod)) throw new Error(`${file} did not import`);
    let written = 0;
    for (const [name, value] of Object.entries(mod)) {
      const entries: [string | undefined, unknown][] =
        isRecord(value) && !Array.isArray(value) ? Object.entries(value) : [[undefined, value]];
      for (const [key, rows] of entries) {
        const saved = asRowsValue(rows);
        if (saved === undefined || computed.has(name)) continue;
        expect(writeRows(source, name, key, saved)).toBe(source);
        written++;
      }
    }
    expect(written).toBeGreaterThan(0);
  });
});

describe("toSheet and fromSheet", () => {
  const walk = {
    label: "walk",
    value: [
      ["k.", "rr"],
      ["rr", ".k"],
    ],
  };
  const pot = { label: "pot", value: ["yo"] };

  test("a sheet read back with no edits gives the same rows", () => {
    const png = toSheet([walk, pot]);
    expect([png.width, png.height]).toEqual([4, 3]);
    expect(fromSheet(png, [walk, pot])).toEqual([walk.value, pot.value]);
  });

  test("an edit to one frame changes only that frame", () => {
    const png = toSheet([walk, pot]);
    plot(png, 3, 0, sweetie.g);
    expect(fromSheet(png, [walk, pot])).toEqual([
      [
        ["k.", "rr"],
        ["rg", ".k"],
      ],
      pot.value,
    ]);
  });

  test("glyph rows go out in white and come back as #", () => {
    const glyph = { label: "A", value: ["#.", ".#"] };
    expect(fromSheet(toSheet([glyph]), [glyph])).toEqual([glyph.value]);
  });

  test("refuses a sheet of the wrong size", () => {
    expect(() => fromSheet(toSheet([pot]), [walk])).toThrow(/is 4x2; the PNG is 2x1/u);
  });

  test("refuses a colour outside Sweetie 16", () => {
    const png = toSheet([walk]);
    plot(png, 1, 1, "#123456");
    expect(() => fromSheet(png, [walk])).toThrow(/walk frame 0: .*#123456, not in the palette/u);
  });

  test("refuses a pixel drawn outside every frame", () => {
    const png = toSheet([walk, pot]);
    plot(png, 3, 2, sweetie.k);
    expect(() => fromSheet(png, [walk, pot])).toThrow(/\(3, 2\) is outside every frame/u);
  });
});
