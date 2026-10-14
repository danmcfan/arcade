import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "../test/parity/fixtures.ts";
import { isRecord } from "./pixel.ts";
import { artSources, asRowsValue, writeRows } from "./studio-source.ts";

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
  // Their rows are private consts, so these export no rows to save into.
  const noRows = new Set(["src/ui/deskArt.ts", "src/ui/employeeArt.ts"]);

  test.each(artSources.filter((f) => !noRows.has(f)))("writing back %s's own rows changes nothing", async (file) => {
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
