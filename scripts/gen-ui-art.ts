// Build the UI pixel art from its ASCII source in src/ui/glyphs.ts:
//
//   bun run art      # writes src/assets/images/font.png, logo.png, icons.png, counter.png, prizes.png and the retitled title cards
//
// font.png is one band of glyphs per ink colour (`inkOrder`), each band
// `bandRows` rows of `sheetColumns` cells. logo.png is "ARCADE" in the
// title-card display font with a drop shadow. icons.png is the HUD icons from
// src/ui/icons.ts. counter.png is the hub's prize counter from
// src/ui/counterArt.ts. prizes.png is the hub's prize decorations from
// src/ui/prizeArt.ts. Each of `titleCards` is its hub title card with the top
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
import { counterArt, counterPalette } from "../src/ui/counterArt.ts";
import { prizeArt, prizePalette, prizeRects, prizeSheetHeight, prizeSheetWidth } from "../src/ui/prizeArt.ts";
import type { PrizeId } from "../src/arcade/prizes.ts";
import { iconPalette, iconRects, icons, iconSheetHeight, iconSheetWidth, type IconName } from "../src/ui/icons.ts";
import { repoRoot } from "../test/parity/fixtures.ts";
import { blank, paint, plot } from "./pixel-art.ts";

export function renderFont(): PNG {
  const png = blank(fontSheetWidth, fontSheetHeight);
  inkOrder.forEach((ink, band) => {
    charset.forEach((ch, i) => {
      const ox = (i % sheetColumns) * cell;
      const oy = (band * bandRows + Math.trunc(i / sheetColumns)) * cell;
      glyphs[ch]!.forEach((row, y) => {
        [...row].forEach((px, x) => {
          if (px === "#") plot(png, ox + x, oy + y, inks[ink]);
        });
      });
    });
  });
  return png;
}

export function renderLogo(): PNG {
  const png = blank(logoWidth, logoHeight);
  const letter = (dx: number, dy: number, color: (y: number) => string): void => {
    let ox = 0;
    for (const ch of logoWord) {
      const rows = logoLetters[ch]!;
      rows.forEach((row, y) => {
        [...row].forEach((px, x) => {
          if (px === "#") plot(png, ox + x + dx, y + dy, color(y));
        });
      });
      ox += rows[0]!.length + logoGap;
    }
  };
  letter(logoShadow[0], logoShadow[1], () => logoShadowColor);
  letter(0, 0, (y) => logoBands.find((b) => y < b.until)!.color);
  return png;
}

export function renderIcons(): PNG {
  const png = blank(iconSheetWidth, iconSheetHeight);
  for (const [name, rows] of Object.entries(icons) as [IconName, readonly string[]][]) {
    paint(png, rows, iconPalette, iconRects[name].x, 0);
  }
  return png;
}

export function renderCounter(): PNG {
  const png = blank(counterArt[0]!.length, counterArt.length);
  paint(png, counterArt, counterPalette);
  return png;
}

export function renderPrizes(): PNG {
  const png = blank(prizeSheetWidth, prizeSheetHeight);
  for (const [id, rows] of Object.entries(prizeArt) as [PrizeId, readonly string[]][]) {
    paint(png, rows, prizePalette, prizeRects[id].x, 0);
  }
  return png;
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
  const left = Math.trunc((png.width - rows[0]!.length) / 2);
  rows.forEach((row, y) => {
    [...row].forEach((px, x) => {
      if (px === "#") plot(png, left + x, titleTop + y, card.color);
    });
  });
  return png;
}

export const fontPath = join(repoRoot, "src/assets/images/font.png");
export const logoPath = join(repoRoot, "src/assets/images/logo.png");
export const iconsPath = join(repoRoot, "src/assets/images/icons.png");
export const counterPath = join(repoRoot, "src/assets/images/counter.png");
export const prizesPath = join(repoRoot, "src/assets/images/prizes.png");

if (import.meta.main) {
  writeFileSync(fontPath, PNG.sync.write(renderFont()));
  writeFileSync(logoPath, PNG.sync.write(renderLogo()));
  writeFileSync(iconsPath, PNG.sync.write(renderIcons()));
  writeFileSync(counterPath, PNG.sync.write(renderCounter()));
  writeFileSync(prizesPath, PNG.sync.write(renderPrizes()));
  for (const card of titleCards) {
    writeFileSync(titleCardPath(card.file), PNG.sync.write(renderTitleCard(card)));
    console.log(`wrote ${titleCardPath(card.file)} ("${card.text}")`);
  }
  console.log(
    `wrote ${fontPath} (${fontSheetWidth}x${fontSheetHeight}), ${logoPath} (${logoWidth}x${logoHeight}) ${iconsPath} (${iconSheetWidth}x${iconSheetHeight}), ${counterPath} and ${prizesPath} (${prizeSheetWidth}x${prizeSheetHeight})`,
  );
}
