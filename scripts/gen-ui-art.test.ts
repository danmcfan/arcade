import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { glyphHeight, glyphs, logoLetters, titleCards, titleLetters } from "../src/ui/glyphs.ts";
import { counterRect } from "../src/arcade/prizeCounter.ts";
import { counterArt, counterPalette } from "../src/ui/counterArt.ts";
import { iconPalette, icons } from "../src/ui/icons.ts";
import { cabinetArt, hubPalette, roomHeight, roomWidth } from "../src/ui/hubArt.ts";
import { sweetie16 } from "../src/ui/palette.ts";
import { playerFrameHeight, playerFrames, playerFramesFor, playerFrameWidth, playerPalette, playerSheetRows, sheetOrder } from "../src/ui/playerArt.ts";
import { newPlayer } from "../src/arcade/entity.ts";
import { images } from "../src/engine/assets.ts";
import {
  counterPath,
  fontPath,
  hubRoomRows,
  iconsPath,
  logoPath,
  playerPath,
  renderCounter,
  renderFont,
  renderIcons,
  renderLogo,
  renderPlayer,
  renderRoom,
  renderTitleCard,
  roomPath,
  titleCardPath,
} from "./gen-ui-art.ts";

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

  test("the prize counter is the size of its collision rect, in palette letters and .", () => {
    expect([counterArt[0]!.length, counterArt.length]).toEqual([counterRect.w, counterRect.h]);
    const allowed = new RegExp(`^[.${Object.keys(counterPalette).join("")}]+$`);
    for (const row of counterArt) expect({ row, ok: allowed.test(row) && row.length === counterRect.w }).toEqual({ row, ok: true });
  });

  test("the hub room is the hub image's size, in palette letters", () => {
    const rows = hubRoomRows();
    expect([rows[0]!.length, rows.length]).toEqual([roomWidth, roomHeight]);
    expect([roomWidth, roomHeight]).toEqual([images.arcade.width, images.arcade.height]);
    const allowed = new RegExp(`^[${Object.keys(hubPalette).join("")}]+$`);
    for (const row of rows) expect({ row, ok: allowed.test(row) && row.length === roomWidth }).toEqual({ row, ok: true });
    for (const row of cabinetArt) expect({ row, ok: /^[.k123]+$/.test(row) && row.length === cabinetArt[0]!.length }).toEqual({ row, ok: true });
  });

  test("every player frame is the player's 16x24 box, in palette letters and .", () => {
    const p = newPlayer();
    expect([playerFrameWidth, playerFrameHeight, playerFrames]).toEqual([p.width, p.height, p.frameTotal]);
    // Sheet rows follow the player's frameDirection.
    expect(sheetOrder.map((d) => p.frameDirection[d])).toEqual([0, 1, 2, 3]);
    const allowed = new RegExp(`^[.${Object.keys(playerPalette).join("")}]+$`);
    for (const dir of sheetOrder) {
      for (const [i, frame] of playerFramesFor(dir).entries()) {
        expect({ dir, i, rows: frame.length }).toEqual({ dir, i, rows: playerFrameHeight });
        for (const row of frame) expect({ dir, i, row, ok: allowed.test(row) && row.length === playerFrameWidth }).toEqual({ dir, i, row, ok: true });
      }
    }
    const sheet = playerSheetRows();
    expect([sheet[0]!.length, sheet.length]).toEqual([images.player.width, images.player.height]);
  });

  test("the generated art uses Sweetie 16 colours only", () => {
    for (const [name, palette] of Object.entries({ hubPalette, playerPalette, counterPalette, iconPalette })) {
      for (const [letter, colour] of Object.entries(palette)) {
        expect({ name, letter, colour, sweetie16: sweetie16.includes(colour) }).toEqual({ name, letter, colour, sweetie16: true });
      }
    }
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

describe("committed PNGs match src/ui/glyphs.ts, icons.ts, counterArt.ts, hubArt.ts and playerArt.ts (run `bun run art` after editing them)", () => {
  const pngs: [name: string, path: string, render: () => PNG][] = [
    ["font.png", fontPath, renderFont],
    ["logo.png", logoPath, renderLogo],
    ["icons.png", iconsPath, renderIcons],
    ["counter.png", counterPath, renderCounter],
    ["arcade.png", roomPath, renderRoom],
    ["player.png", playerPath, renderPlayer],
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
