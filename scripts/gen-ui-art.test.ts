import { describe, expect, test } from "bun:test";
import { glyphHeight, glyphs, inks, titleLetters } from "../src/ui/glyphs.ts";
import { employeeHalf, employeeHeight, employeeWidth } from "../src/ui/employeeArt.ts";
import { deskRows } from "../src/ui/deskArt.ts";
import { deskRect } from "../src/arcade/desk.ts";
import { tickerGlyphHeight, tickerGlyphs, tickerSheetRows } from "../src/ui/tickerArt.ts";
import { icons } from "../src/ui/icons.ts";
import { bonusLabelArt, hudSheetRows, hudSheetWidth, loopLabelArt } from "../src/ui/hudArt.ts";
import { cardArt, cardCorner, panelCorner, panelFrame } from "../src/ui/panelArt.ts";
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
import { employeeRows, hubPowerRows, hubRoomRows } from "./gen-ui-art.ts";
import { checkRows } from "./pixel-art.ts";
import {
  titleBar,
  letterSide,
  titleCabinet,
  titleLogoHeight,
  titleLogoWidth,
  titleScreenFrames,
  titleScreenHeight,
  titleScreenWidth,
  titleWord,
} from "../src/ui/titleArt.ts";

describe("UI art source", () => {
  test("every glyph is 7 rows of one width, made of # and .", () => {
    for (const [ch, rows] of Object.entries(glyphs))
      checkRows(`glyph "${ch}"`, rows, { h: glyphHeight }, { "#": inks.white });
  });

  test("BONUS and LOOP are white thick letters on 8 px tiles, and hud.png holds them under the score labels", () => {
    checkRows("BONUS", bonusLabelArt, { w: 40, h: 7 });
    checkRows("LOOP", loopLabelArt, { w: 32, h: 7 });
    // L is an upright with a foot, as wide as the labels' E.
    expect(loopLabelArt.map((r) => r.slice(0, 7))).toEqual([
      "ww.....",
      "ww.....",
      "ww.....",
      "ww.....",
      "ww.....",
      "ww.....",
      "wwwwww.",
    ]);
    checkRows("hud", hudSheetRows, { w: hudSheetWidth, h: 24 });
    expect(hudSheetRows[8]?.startsWith("wwwwww...")).toBe(true);
  });

  test("every icon is rows of one width, in Sweetie 16 letters and .", () => {
    for (const [name, rows] of Object.entries(icons)) checkRows(name, rows);
  });

  test("the panel and card frames are Sweetie 16 rows with a middle between their corners", () => {
    checkRows("panelFrame", panelFrame, { w: panelFrame.length });
    expect(panelFrame.length).toBeGreaterThan(2 * panelCorner);
    for (const [look, rows] of Object.entries(cardArt)) {
      checkRows(`card ${look}`, rows);
      expect(Math.min(rows.length, rows[0]?.length ?? 0)).toBeGreaterThan(2 * cardCorner);
    }
  });

  test("every scoreboard glyph is 5 rows of one width, made of # and .", () => {
    for (const [ch, rows] of Object.entries(tickerGlyphs))
      checkRows(`ticker glyph "${ch}"`, rows, { h: tickerGlyphHeight }, { "#": sweetie.w });
    const sheet = tickerSheetRows();
    expect([sheet[0]?.length, sheet.length]).toEqual([images.ticker.width, images.ticker.height]);
  });

  test("the employee is one frame in the player's 16x24 box, in Sweetie 16 letters and .", () => {
    checkRows("employee half", employeeHalf, { w: employeeWidth / 2, h: employeeHeight });
    checkRows("employee", employeeRows(), { w: employeeWidth, h: employeeHeight });
    expect([employeeWidth, employeeHeight]).toEqual([images.employee.width, images.employee.height]);
  });

  test("the hub room is the hub image's size, in Sweetie 16 letters", () => {
    expect([roomWidth, roomHeight]).toEqual([images.arcade.width, images.arcade.height]);
    checkRows("room", hubRoomRows(), { w: roomWidth, h: roomHeight });
    checkRows("carpet tile", carpetTile, { w: 16, h: 16 });
    checkRows("desk", deskRows, { w: deskRect.w, h: deskRect.h });
    // The cabinet template's slots: `1` to `4` its colours, `S` its screen; `k` and `w` are fixed.
    checkRows("cabinet", cabinetArt, {}, { k: sweetie.k, w: sweetie.w, 1: "", 2: "", 3: "", 4: "", S: "" });
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
      for (const [i, frame] of facing.entries())
        checkRows(`player ${name} ${i}`, frame, { w: playerFrameWidth, h: playerFrameHeight });
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

  test("every title logo layer fits the logo, and every screen frame is the screen's size, in Sweetie 16 letters", () => {
    for (const [name, layer] of Object.entries({ titleCabinet, titleBar, titleWord })) {
      checkRows(name, layer.rows);
      expect(layer.x + (layer.rows[0]?.length ?? 0)).toBeLessThanOrEqual(titleLogoWidth);
      expect(layer.y + layer.rows.length).toBeLessThanOrEqual(titleLogoHeight);
    }
    titleScreenFrames.forEach((frame, i) => {
      checkRows(`title screen ${i}`, frame, { w: titleScreenWidth, h: titleScreenHeight });
    });
  });

  test("ARCADE's letters are evenly spaced, each block side showing, and the word is centred in the logo", () => {
    const spans = faceSpans(titleWord.rows).map(([l, r]) => [titleWord.x + l, titleWord.x + r] as const);
    expect(spans).toHaveLength(6);
    const gaps = spans.slice(1).map(([l], i) => l - (spans[i]?.[1] ?? 0) - 1);
    // Each face casts a 3-pixel side (two purple, one dark) to its right: a gap that wide shows it all.
    expect(gaps).toEqual(gaps.map(() => letterSide));
    const margin = { left: spans[0]?.[0] ?? 0, right: titleLogoWidth - 1 - ((spans[5]?.[1] ?? 0) + letterSide) };
    expect(Math.abs(margin.left - margin.right)).toBeLessThanOrEqual(1);
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

/** Each letter face's [left, right] columns in `rows`: runs of columns holding face colours (y, o, r), left to right. */
function faceSpans(rows: readonly string[]): [number, number][] {
  const width = rows[0]?.length ?? 0;
  const face = (x: number): boolean => rows.some((row) => "yor".includes(row[x] ?? "."));
  const spans: [number, number][] = [];
  for (let x = 0; x < width; x++) {
    if (!face(x)) continue;
    const last = spans.at(-1);
    if (last !== undefined && last[1] === x - 1) last[1] = x;
    else spans.push([x, x]);
  }
  return spans;
}
