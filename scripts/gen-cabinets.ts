// Build every minigame's cabinet strip from the Sweet Sam one:
//
//   bun run art      # also writes the cabinet PNGs in src/assets/images
//
// Sources, in art/: cabinet.png (Sweet Sam's strip, exported from
// cabinet.ase) and cabinets.json (per cabinet its output file, a palette map,
// and what to letter its marquee with). Each strip is art/cabinet.png with
// every colour swapped through the palette, and the hand-drawn "SWEET SAM"
// marquee replaced by lettering at 2x with a one-pixel (2 px) drop shadow:
// the hub title art's top line (`title`), or `text` in the marquee letters of
// src/ui/glyphs.ts for a name with no title art yet. Recolouring later
// (#18, #19) means editing cabinets.json or the title art and rerunning.
// gen-cabinets.test.ts fails when the committed PNGs drift from the sources.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { marqueeGap, marqueeLetters } from "../src/ui/glyphs.ts";
import { repoRoot } from "../test/parity/fixtures.ts";

export interface CabinetSource {
  /** Software name. */
  name: string;
  /** Output file in src/assets/images. */
  file: string;
  /** Hub title art in src/assets/images whose lettering goes on the marquee. */
  title?: string;
  /** Marquee text in `marqueeLetters`, when there is no title art to letter it from. */
  text?: string;
  /** Source colour (hex, no #) → replacement, for every colour in cabinet.png. */
  palette: Record<string, string>;
}

const imagesDir = join(repoRoot, "src/assets/images");

export const cabinets: CabinetSource[] = (
  JSON.parse(readFileSync(join(repoRoot, "art/cabinets.json"), "utf8")) as { cabinets: CabinetSource[] }
).cabinets;

export const frameWidth = 336;
/** Rows 0..53 are the marquee; the screen starts at row 54. */
export const marqueeHeight = 54;
/** Title-art rows searched for the lettering ("PRESS SPACE TO PLAY" sits far below). */
const titleRows = 40;
/** Sweet Sam's marquee letters span rows 2..49; centre the new lettering on the same line. */
const marqueeCentreY = 26;
const scale = 2;

const letterColour = "ffcd75";
const shadowColour = "ef7d57";
const bodyColour = "b13e53";

export function cabinetPath(c: CabinetSource): string {
  return join(imagesDir, c.file);
}

export function sourceCabinet(): PNG {
  return PNG.sync.read(readFileSync(join(repoRoot, "art/cabinet.png")));
}

function hexAt(png: PNG, i: number): string {
  return [0, 1, 2].map((j) => png.data[i + j]!.toString(16).padStart(2, "0")).join("");
}

function setHex(png: PNG, x: number, y: number, hex: string): void {
  const i = (y * png.width + x) * 4;
  const n = Number.parseInt(hex, 16);
  png.data[i] = (n >> 16) & 255;
  png.data[i + 1] = (n >> 8) & 255;
  png.data[i + 2] = n & 255;
  png.data[i + 3] = 255;
}

/** Distinct opaque colours, as hex. */
export function colours(png: PNG): string[] {
  const out = new Set<string>();
  for (let i = 0; i < png.data.length; i += 4) if (png.data[i + 3]! > 0) out.add(hexAt(png, i));
  return [...out];
}

interface Lettering {
  w: number;
  h: number;
  on: (x: number, y: number) => boolean;
}

/** The opaque pixels of the title art's top line of lettering, cropped to their bounds. */
function titleLettering(file: string): Lettering {
  const png = PNG.sync.read(readFileSync(join(imagesDir, file)));
  const lit = (x: number, y: number) => png.data[(y * png.width + x) * 4 + 3]! > 0;
  let [x0, y0, x1, y1] = [png.width, titleRows, -1, -1];
  for (let y = 0; y < titleRows; y++) {
    for (let x = 0; x < png.width; x++) {
      if (!lit(x, y)) continue;
      [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
    }
  }
  if (x1 < 0) throw new Error(`${file}: no lettering in the top ${titleRows} rows`);
  return { w: x1 - x0 + 1, h: y1 - y0 + 1, on: (x, y) => lit(x0 + x, y0 + y) };
}

/** `text` set in `marqueeLetters`, `marqueeGap` apart. */
function textLettering(text: string): Lettering {
  const rows: string[] = [];
  for (const [i, ch] of [...text].entries()) {
    const glyph = marqueeLetters[ch];
    if (glyph === undefined) throw new Error(`marquee text: no letter for ${JSON.stringify(ch)}`);
    const w = glyph[0]!.length;
    for (let y = 0; y < 15; y++) rows[y] = (rows[y] ?? "") + (i > 0 ? ".".repeat(marqueeGap) : "") + (glyph[y] ?? ".".repeat(w));
  }
  return { w: rows[0]!.length, h: rows.length, on: (x, y) => rows[y]![x] === "#" };
}

function lettering(c: CabinetSource): Lettering {
  if (c.text !== undefined) return textLettering(c.text);
  if (c.title !== undefined) return titleLettering(c.title);
  throw new Error(`${c.name}: needs a title or text for its marquee`);
}

export function renderCabinet(c: CabinetSource): PNG {
  const png = sourceCabinet();
  const map = (hex: string) => {
    const to = c.palette[hex];
    if (to === undefined) throw new Error(`${c.name}: palette has no entry for ${hex}`);
    return to;
  };

  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      if (png.data[i + 3] === 0) continue;
      let hex = hexAt(png, i);
      // Sweet Sam's lettering comes off the marquee.
      if (y < marqueeHeight && (hex === letterColour || hex === shadowColour)) hex = bodyColour;
      setHex(png, x, y, map(hex));
    }
  }

  const word = lettering(c);
  const left = Math.trunc((frameWidth - (word.w + 1) * scale) / 2);
  const top = marqueeCentreY - Math.trunc(((word.h + 1) * scale) / 2);
  const frames = png.width / frameWidth;
  for (const [dx, colour] of [
    [scale, map(shadowColour)],
    [0, map(letterColour)],
  ] as const) {
    for (let f = 0; f < frames; f++) {
      for (let y = 0; y < word.h; y++) {
        for (let x = 0; x < word.w; x++) {
          if (!word.on(x, y)) continue;
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              setHex(png, f * frameWidth + left + x * scale + sx + dx, top + y * scale + sy + dx, colour);
            }
          }
        }
      }
    }
  }
  return png;
}

if (import.meta.main) {
  for (const c of cabinets) {
    writeFileSync(cabinetPath(c), PNG.sync.write(renderCabinet(c)));
    console.log(`wrote ${cabinetPath(c)}`);
  }
}
