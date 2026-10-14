import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { glyphHeight, glyphs, inks, logoLetters, titleCards, titleLetters } from "../src/ui/glyphs.ts";
import { employeeFrames, employeeHeight, employeeSheetRows, employeeWidth, half } from "../src/ui/employeeArt.ts";
import { deskRows } from "../src/ui/deskArt.ts";
import { deskRect } from "../src/arcade/desk.ts";
import { tickerGlyphHeight, tickerGlyphs, tickerSheetRows } from "../src/ui/tickerArt.ts";
import { icons } from "../src/ui/icons.ts";
import {
  cabinetArt,
  carpetTile,
  powerFrameHeight,
  powerFrames,
  powerFrameWidth,
  roomHeight,
  roomWidth,
  screenGlass,
} from "../src/ui/hubArt.ts";
import {
  playerFrameHeight,
  playerFrames,
  playerFramesFor,
  playerFrameWidth,
  playerSheetRows,
  right,
  sheetOrder,
  up,
  down,
} from "../src/ui/playerArt.ts";
import { newPlayer } from "../src/arcade/entity.ts";
import { images } from "../src/engine/assets.ts";
import { prizeArt } from "../src/ui/prizeArt.ts";
import { sweetie } from "../src/ui/sweetie16.ts";
import { prizes } from "../src/arcade/prizes.ts";
import {
  employeePath,
  fontPath,
  hubPowerRows,
  hubRoomRows,
  iconsPath,
  logoPath,
  playerPath,
  prizesPath,
  renderEmployee,
  renderFont,
  renderIcons,
  renderLogo,
  renderPlayer,
  renderPrizes,
  renderRoom,
  renderScreens,
  renderTicker,
  renderTitleCard,
  roomPath,
  screensPath,
  tickerPath,
  titleCardPath,
} from "./gen-ui-art.ts";
import { checkRows } from "./pixel-art.ts";

describe("UI art source", () => {
  test("every glyph is 7 rows of one width, made of # and .", () => {
    for (const [ch, rows] of Object.entries(glyphs))
      checkRows(`glyph "${ch}"`, rows, { h: glyphHeight }, { "#": inks.white });
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

  test("every scoreboard glyph is 5 rows of one width, made of # and .", () => {
    for (const [ch, rows] of Object.entries(tickerGlyphs))
      checkRows(`ticker glyph "${ch}"`, rows, { h: tickerGlyphHeight }, { "#": sweetie.w });
    const sheet = tickerSheetRows();
    expect([sheet[0]?.length, sheet.length]).toEqual([images.ticker.width, images.ticker.height]);
  });

  test("every employee frame is the player's 16x24 box, in Sweetie 16 letters and .", () => {
    checkRows("employee half", half, { w: employeeWidth / 2, h: employeeHeight });
    for (const [i, frame] of employeeFrames.entries())
      checkRows(`employee ${i}`, frame, { w: employeeWidth, h: employeeHeight });
    const sheet = employeeSheetRows();
    expect([sheet[0]?.length, sheet.length]).toEqual([images.employee.width, images.employee.height]);
  });

  test("the hub room is the hub image's size, in Sweetie 16 letters", () => {
    expect([roomWidth, roomHeight]).toEqual([images.arcade.width, images.arcade.height]);
    checkRows("room", hubRoomRows(), { w: roomWidth, h: roomHeight });
    checkRows("carpet tile", carpetTile, { w: 16, h: 16 });
    checkRows("desk", deskRows, { w: deskRect.w, h: deskRect.h });
    // The cabinet template's slots: `1` to `4` its colours, `S` its screen.
    checkRows("cabinet", cabinetArt, {}, { k: sweetie.k, 1: "", 2: "", 3: "", 4: "", S: "" });
  });

  test("screens.png is a row of power frames per cabinet, in Sweetie 16 letters and .", () => {
    checkRows("screen glass", screenGlass, { w: 8, h: 5 });
    const sheet = hubPowerRows();
    checkRows("screens", sheet, { w: powerFrames.length * powerFrameWidth, h: 3 * powerFrameHeight });
    expect([sheet[0]?.length, sheet.length]).toEqual([images.screens.width, images.screens.height]);
  });

  test("every player frame is the player's 16x24 box, in Sweetie 16 letters and .", () => {
    const p = newPlayer();
    expect([playerFrameWidth, playerFrameHeight, playerFrames]).toEqual([p.width, p.height, p.frameTotal]);
    // Sheet rows follow the player's frameDirection.
    expect(sheetOrder.map((d) => p.frameDirection[d])).toEqual([0, 1, 2, 3]);
    for (const [name, facing] of Object.entries({ up, down, right }))
      for (const pose of ["stand", "step", "otherStep"] as const)
        checkRows(`player ${name} ${pose}`, facing[pose], { w: playerFrameWidth, h: playerFrameHeight });
    for (const dir of sheetOrder) {
      for (const [i, frame] of playerFramesFor(dir).entries())
        checkRows(`player ${dir} ${i}`, frame, { w: playerFrameWidth, h: playerFrameHeight });
    }
    const sheet = playerSheetRows();
    expect([sheet[0]?.length, sheet.length]).toEqual([images.player.width, images.player.height]);
  });

  test("every prize decoration is rows of one width, in Sweetie 16 letters and ., and every prize has one", () => {
    expect(Object.keys(prizeArt).toSorted()).toEqual(prizes.map((p) => p.id).toSorted());
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

describe("committed PNGs match src/ui/glyphs.ts, icons.ts, tickerArt.ts, employeeArt.ts, prizeArt.ts, hubArt.ts and playerArt.ts (run `bun run art` after editing them)", () => {
  const pngs: [name: string, path: string, render: () => PNG][] = [
    ["font.png", fontPath, renderFont],
    ["logo.png", logoPath, renderLogo],
    ["icons.png", iconsPath, renderIcons],
    ["ticker.png", tickerPath, renderTicker],
    ["employee.png", employeePath, renderEmployee],
    ["arcade.png", roomPath, renderRoom],
    ["screens.png", screensPath, renderScreens],
    ["player.png", playerPath, renderPlayer],
    ["prizes.png", prizesPath, renderPrizes],
    ...titleCards.map((card): [string, string, () => PNG] => [
      card.file,
      titleCardPath(card.file),
      () => renderTitleCard(card),
    ]),
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
