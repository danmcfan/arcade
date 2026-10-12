// Build the UI pixel art from its ASCII source in src/ui/glyphs.ts:
//
//   bun run art      # writes src/assets/images/font.png, logo.png, icons.png and the retitled title cards
//
// font.png is one band of glyphs per ink colour (`inkOrder`), each band
// `bandRows` rows of `sheetColumns` cells. logo.png is "ARCADE" in the
// title-card display font with a drop shadow. icons.png is the HUD icons from
// src/ui/icons.ts. Each of `titleCards` is its hub title card with the top
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
import { iconPalette, iconRects, icons, iconSheetHeight, iconSheetWidth, type IconName } from "../src/ui/icons.ts";
import { repoRoot } from "../test/parity/fixtures.ts";

function hex(css: string): [number, number, number] {
  const n = Number.parseInt(css.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function plot(png: PNG, x: number, y: number, css: string): void {
  const i = (y * png.width + x) * 4;
  const [r, g, b] = hex(css);
  png.data[i] = r;
  png.data[i + 1] = g;
  png.data[i + 2] = b;
  png.data[i + 3] = 255;
}

function blank(width: number, height: number): PNG {
  const png = new PNG({ width, height });
  png.data.fill(0);
  return png;
}

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
  const paint = (dx: number, dy: number, color: (y: number) => string): void => {
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
  paint(logoShadow[0], logoShadow[1], () => logoShadowColor);
  paint(0, 0, (y) => logoBands.find((b) => y < b.until)!.color);
  return png;
}

export function renderIcons(): PNG {
  const png = blank(iconSheetWidth, iconSheetHeight);
  for (const [name, rows] of Object.entries(icons) as [IconName, readonly string[]][]) {
    rows.forEach((row, y) => {
      [...row].forEach((px, x) => {
        if (px !== ".") plot(png, iconRects[name].x + x, y, iconPalette[px]!);
      });
    });
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

if (import.meta.main) {
  writeFileSync(fontPath, PNG.sync.write(renderFont()));
  writeFileSync(logoPath, PNG.sync.write(renderLogo()));
  writeFileSync(iconsPath, PNG.sync.write(renderIcons()));
  for (const card of titleCards) {
    writeFileSync(titleCardPath(card.file), PNG.sync.write(renderTitleCard(card)));
    console.log(`wrote ${titleCardPath(card.file)} ("${card.text}")`);
  }
  console.log(
    `wrote ${fontPath} (${fontSheetWidth}x${fontSheetHeight}), ${logoPath} (${logoWidth}x${logoHeight}) and ${iconsPath} (${iconSheetWidth}x${iconSheetHeight})`,
  );
}
