import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { glyphHeight, glyphs, logoLetters } from "../src/ui/glyphs.ts";
import { iconPalette, icons } from "../src/ui/icons.ts";
import { fontPath, iconsPath, logoPath, renderFont, renderIcons, renderLogo } from "./gen-ui-art.ts";

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

  test("every icon is rows of one width, in palette letters and .", () => {
    const allowed = new RegExp(`^[.${Object.keys(iconPalette).join("")}]+$`);
    for (const [name, rows] of Object.entries(icons)) {
      for (const row of rows) {
        expect({ name, row, ok: allowed.test(row) && row.length === rows[0]!.length }).toEqual({ name, row, ok: true });
      }
    }
  });
});

describe("committed PNGs match src/ui/glyphs.ts and icons.ts (run `bun run art` after editing them)", () => {
  for (const [name, path, render] of [
    ["font.png", fontPath, renderFont],
    ["logo.png", logoPath, renderLogo],
    ["icons.png", iconsPath, renderIcons],
  ] as const) {
    test(name, () => {
      const onDisk = PNG.sync.read(readFileSync(path));
      const fresh = render();
      expect([onDisk.width, onDisk.height]).toEqual([fresh.width, fresh.height]);
      expect(Buffer.compare(onDisk.data, fresh.data)).toBe(0);
    });
  }
});
