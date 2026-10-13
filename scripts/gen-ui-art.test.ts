import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { glyphHeight, glyphs, inks, logoLetters, titleCards, titleLetters } from "../src/ui/glyphs.ts";
import { counterRect } from "../src/arcade/prizeCounter.ts";
import { counterArt } from "../src/ui/counterArt.ts";
import { icons } from "../src/ui/icons.ts";
import { prizeArt } from "../src/ui/prizeArt.ts";
import { prizes } from "../src/arcade/prizes.ts";
import {
  counterPath,
  fontPath,
  iconsPath,
  logoPath,
  prizesPath,
  renderCounter,
  renderFont,
  renderIcons,
  renderLogo,
  renderPrizes,
  renderTitleCard,
  titleCardPath,
} from "./gen-ui-art.ts";
import { checkRows } from "./pixel-art.ts";

describe("UI art source", () => {
  test("every glyph is 7 rows of one width, made of # and .", () => {
    for (const [ch, rows] of Object.entries(glyphs)) checkRows(`glyph "${ch}"`, rows, { h: glyphHeight }, { "#": inks.white });
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

  test("every icon is rows of one width, in Sweetie 16 letters and .", () => {
    for (const [name, rows] of Object.entries(icons)) checkRows(name, rows);
  });

  test("the prize counter is the size of its collision rect, in Sweetie 16 letters and .", () => {
    checkRows("counter", counterArt, { w: counterRect.w, h: counterRect.h });
  });

  test("every prize decoration is rows of one width, in Sweetie 16 letters and ., and every prize has one", () => {
    expect(Object.keys(prizeArt).sort()).toEqual(prizes.map((p) => p.id).sort());
    for (const [id, rows] of Object.entries(prizeArt)) checkRows(id, rows);
  });

  test("every title letter is 11x15 (the space only sets a width)", () => {
    for (const [ch, rows] of Object.entries(titleLetters)) {
      if (ch === " ") continue;
      expect({ ch, rows: rows.length, widths: [...new Set(rows.map((r) => r.length))] }).toEqual({
        ch,
        rows: 15,
        widths: [11],
      });
    }
  });
});

describe("committed PNGs match src/ui/glyphs.ts, icons.ts, counterArt.ts and prizeArt.ts (run `bun run art` after editing them)", () => {
  const pngs: [name: string, path: string, render: () => PNG][] = [
    ["font.png", fontPath, renderFont],
    ["logo.png", logoPath, renderLogo],
    ["icons.png", iconsPath, renderIcons],
    ["counter.png", counterPath, renderCounter],
    ["prizes.png", prizesPath, renderPrizes],
    ...titleCards.map((card): [string, string, () => PNG] => [card.file, titleCardPath(card.file), () => renderTitleCard(card)]),
  ];
  for (const [name, path, render] of pngs) {
    test(name, () => {
      const onDisk = PNG.sync.read(readFileSync(path));
      const fresh = render();
      expect([onDisk.width, onDisk.height]).toEqual([fresh.width, fresh.height]);
      expect(Buffer.compare(onDisk.data, fresh.data)).toBe(0);
    });
  }
});
