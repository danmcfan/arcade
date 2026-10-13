// Build the UI pixel art from its ASCII source in src/ui/glyphs.ts:
//
//   bun run art      # writes src/assets/images/font.png, logo.png, icons.png, counter.png, prizes.png, arcade.png, screens.png, player.png and the retitled title cards
//
// font.png is one band of glyphs per ink colour (`inkOrder`), each band
// `bandRows` rows of `sheetColumns` cells. logo.png is "ARCADE" in the
// title-card display font with a drop shadow. icons.png is the HUD icons from
// src/ui/icons.ts. counter.png is the hub's prize counter from
// src/ui/counterArt.ts. prizes.png is the hub's prize decorations from
// src/ui/prizeArt.ts. arcade.png is the hub room with its cabinets
// (src/ui/hubArt.ts), screens.png their screens switching on and off, and player.png the player's sprite sheet
// (src/ui/playerArt.ts). Each of `titleCards` is its hub title card with the top
// line of lettering replaced by `text`. gen-ui-art.test.ts fails when the
// committed PNGs no longer match the source.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import {
  bandRows,
  cell,
  charset,
  fontSheetHeight,
  fontSheetWidth,
  glyphs,
  inkOrder,
  inks,
  logoBands,
  logoGap,
  logoHeight,
  logoLetters,
  logoShadow,
  logoShadowColor,
  logoWidth,
  logoWord,
  sheetColumns,
  titleCards,
  titleRows,
} from "../src/ui/glyphs.ts";
import { newMachines } from "../src/arcade/machine.ts";
import { counterArt } from "../src/ui/counterArt.ts";
import { powerSheetRows, roomRows, type CabinetPlace } from "../src/ui/hubArt.ts";
import { playerSheetRows } from "../src/ui/playerArt.ts";
import { mirroredPrizes, prizeArt, prizeRects, prizeSheetHeight, prizeSheetWidth } from "../src/ui/prizeArt.ts";
import { iconRects, icons, iconSheetHeight, iconSheetWidth } from "../src/ui/icons.ts";
import { sweetie } from "../src/ui/sweetie16.ts";
import { repoRoot } from "../test/parity/fixtures.ts";
import { blank, mirrorX, paint, plot, toPng } from "./pixel-art.ts";

function own<T extends object>(o: T, key: PropertyKey): key is keyof T {
  return Object.hasOwn(o, key);
}

/** Plots every `#` of `rows` at (ox, oy), each row in `colour(y)`. */
function plotLit(png: PNG, rows: readonly string[], ox: number, oy: number, colour: (y: number) => string): void {
  rows.forEach((row, y) => {
    row.split("").forEach((px, x) => {
      if (px === "#") plot(png, ox + x, oy + y, colour(y));
    });
  });
}

function glyphRows<K extends string>(table: Partial<Record<K, readonly string[]>>, ch: K): readonly string[] {
  const rows = table[ch];
  if (rows === undefined) throw new Error(`no glyph for ${JSON.stringify(ch)}`);
  return rows;
}

export function renderFont(): PNG {
  const png = blank(fontSheetWidth, fontSheetHeight);
  inkOrder.forEach((ink, band) => {
    charset.forEach((ch, i) => {
      const ox = (i % sheetColumns) * cell;
      const oy = (band * bandRows + Math.trunc(i / sheetColumns)) * cell;
      plotLit(png, glyphRows(glyphs, ch), ox, oy, () => inks[ink]);
    });
  });
  return png;
}

export function renderLogo(): PNG {
  const png = blank(logoWidth, logoHeight);
  const letter = (dx: number, dy: number, color: (y: number) => string): void => {
    let ox = 0;
    for (const ch of logoWord) {
      const rows = glyphRows(logoLetters, ch);
      plotLit(png, rows, ox + dx, dy, color);
      ox += (rows[0]?.length ?? 0) + logoGap;
    }
  };
  letter(logoShadow[0], logoShadow[1], () => logoShadowColor);
  letter(0, 0, (y) => {
    const band = logoBands.find((b) => y < b.until);
    if (band === undefined) throw new Error(`logo row ${y} is below every colour band`);
    return band.color;
  });
  return png;
}

export function renderIcons(): PNG {
  const png = blank(iconSheetWidth, iconSheetHeight);
  for (const [name, rows] of Object.entries(icons)) {
    if (!own(iconRects, name)) throw new Error(`icon ${name} has no sheet rect`);
    paint(png, rows, sweetie, iconRects[name].x, 0);
  }
  return png;
}

export function renderPrizes(): PNG {
  const png = blank(prizeSheetWidth, prizeSheetHeight);
  for (const [id, rows] of Object.entries(prizeArt)) {
    if (!own(prizeRects, id)) throw new Error(`prize ${id} has no sheet rect`);
    paint(png, mirroredPrizes.has(id) ? mirrorX(rows) : rows, sweetie, prizeRects[id].x, 0);
  }
  return png;
}

export function renderCounter(): PNG {
  return toPng(counterArt);
}

/** Where the hub's machines stand, in their order. */
function hubCabinets(): CabinetPlace[] {
  const machines = newMachines(() => {
    throw new Error("the room art builds no software");
  });
  return machines.map((m) => ({ title: m.title, rect: m.rect }));
}

/** The hub room, its cabinets where the hub's machines stand. */
export function hubRoomRows(): string[] {
  return roomRows(hubCabinets());
}

export function renderRoom(): PNG {
  return toPng(hubRoomRows());
}

/** The hub's cabinets switching on and off, one row per machine. */
export function hubPowerRows(): string[] {
  return powerSheetRows(hubCabinets());
}

export function renderScreens(): PNG {
  return toPng(hubPowerRows());
}

export function renderPlayer(): PNG {
  return toPng(playerSheetRows());
}

/** Title cards letter their name on rows 5..19; nothing else sits above row 21. */
const titleTop = 5;
const titleClearRows = 21;

export function titleCardPath(file: string): string {
  return join(repoRoot, "src/assets/images", file);
}

export function renderTitleCard(card: (typeof titleCards)[number]): PNG {
  const png = PNG.sync.read(readFileSync(titleCardPath(card.file)));
  png.data.fill(0, 0, titleClearRows * png.width * 4);
  const rows = titleRows(card.text);
  const left = Math.trunc((png.width - (rows[0]?.length ?? 0)) / 2);
  plotLit(png, rows, left, titleTop, () => card.color);
  return png;
}

export const fontPath = join(repoRoot, "src/assets/images/font.png");
export const logoPath = join(repoRoot, "src/assets/images/logo.png");
export const iconsPath = join(repoRoot, "src/assets/images/icons.png");
export const counterPath = join(repoRoot, "src/assets/images/counter.png");
export const prizesPath = join(repoRoot, "src/assets/images/prizes.png");
export const roomPath = join(repoRoot, "src/assets/images/arcade.png");
export const screensPath = join(repoRoot, "src/assets/images/screens.png");
export const playerPath = join(repoRoot, "src/assets/images/player.png");

if (import.meta.main) {
  writeFileSync(fontPath, PNG.sync.write(renderFont()));
  writeFileSync(logoPath, PNG.sync.write(renderLogo()));
  writeFileSync(iconsPath, PNG.sync.write(renderIcons()));
  writeFileSync(counterPath, PNG.sync.write(renderCounter()));
  writeFileSync(prizesPath, PNG.sync.write(renderPrizes()));
  writeFileSync(roomPath, PNG.sync.write(renderRoom()));
  writeFileSync(screensPath, PNG.sync.write(renderScreens()));
  writeFileSync(playerPath, PNG.sync.write(renderPlayer()));
  for (const card of titleCards) {
    writeFileSync(titleCardPath(card.file), PNG.sync.write(renderTitleCard(card)));
    console.log(`wrote ${titleCardPath(card.file)} ("${card.text}")`);
  }
  console.log(
    `wrote ${fontPath} (${fontSheetWidth}x${fontSheetHeight}), ${logoPath} (${logoWidth}x${logoHeight}) ${iconsPath} (${iconSheetWidth}x${iconSheetHeight}), ${counterPath}, ${prizesPath} (${prizeSheetWidth}x${prizeSheetHeight}), ${roomPath}, ${screensPath} and ${playerPath}`,
  );
}
