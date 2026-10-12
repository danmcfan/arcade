import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { glyphHeight, glyphs, logoLetters } from "../src/ui/glyphs.ts";
import { fontPath, logoPath, renderFont, renderLogo } from "./gen-ui-art.ts";

describe("UI art source", () => {
  test("every glyph is 7 rows of one width, made of # and .", () => {
    for (const [ch, rows] of Object.entries(glyphs)) {
      expect({ ch, rows: rows.length }).toEqual({ ch, rows: glyphHeight });
      for (const row of rows) {
        expect({ ch, row, ok: /^[#.]+$/.test(row) && row.length === rows[0]!.length }).toEqual({ ch, row, ok: true });
      }
    }
  });

  test("every logo letter is 14x15", () => {
    for (const [ch, rows] of Object.entries(logoLetters)) {
      expect({ ch, rows: rows.length, widths: [...new Set(rows.map((r) => r.length))] }).toEqual({
        ch,
        rows: 15,
        widths: [14],
      });
    }
  });
});

describe("committed PNGs match src/ui/glyphs.ts (run `bun run art` after editing it)", () => {
  for (const [name, path, render] of [
    ["font.png", fontPath, renderFont],
    ["logo.png", logoPath, renderLogo],
  ] as const) {
    test(name, () => {
      const onDisk = PNG.sync.read(readFileSync(path));
      const fresh = render();
      expect([onDisk.width, onDisk.height]).toEqual([fresh.width, fresh.height]);
      expect(Buffer.compare(onDisk.data, fresh.data)).toBe(0);
    });
  }
});
