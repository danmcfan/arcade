// Build every minigame's cabinet strip from the Sweet Sam one:
//
//   bun run art      # also writes the cabinet PNGs in src/assets/images
//
// Sources, in art/: cabinet.png (Sweet Sam's strip, exported from
// cabinet.ase) and cabinets.json (per cabinet its output file, a palette map,
// and the hub title art to letter its marquee with). Each strip is
// art/cabinet.png with every colour swapped through the palette, and the
// hand-drawn "SWEET SAM" marquee replaced by the title art's top line of
// lettering at 2x with a one-pixel (2 px) drop shadow. Each cabinet's
// `bevel` gives it a lit and a shaded edge (`bevelColour`). Recolouring later
// (#18, #19) means editing cabinets.json or the title art and rerunning.
// gen-cabinets.test.ts fails when the committed PNGs drift from the sources.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { repoRoot } from "../test/parity/fixtures.ts";

export interface CabinetSource {
  /** Software name. */
  name: string;
  /** Output file in src/assets/images. */
  file: string;
  /** Hub title art in src/assets/images whose lettering goes on the marquee. */
  title: string;
  /** Source colour (hex, no #) → replacement, for every colour in cabinet.png. */
  palette: Record<string, string>;
  /** Bevelled edges on the body: the lit and shaded colours (hex, no #). */
  bevel: Bevel;
}

export interface Bevel {
  light: string;
  dark: string;
}

const imagesDir = join(repoRoot, "src/assets/images");
/** The hub's old title cards, kept as the source of each marquee's lettering. */
const titleCardsDir = join(repoRoot, "art/title-cards");

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isBevel(v: unknown): v is Bevel {
  return isRecord(v) && typeof v["light"] === "string" && typeof v["dark"] === "string";
}

function isCabinetSource(v: unknown): v is CabinetSource {
  return (
    isRecord(v) &&
    typeof v["name"] === "string" &&
    typeof v["file"] === "string" &&
    typeof v["title"] === "string" &&
    isRecord(v["palette"]) &&
    Object.values(v["palette"]).every((to) => typeof to === "string") &&
    isBevel(v["bevel"])
  );
}

function parseCabinets(json: unknown): CabinetSource[] {
  if (!isRecord(json) || !Array.isArray(json["cabinets"])) throw new Error("art/cabinets.json: no cabinets array");
  const list: unknown[] = json["cabinets"];
  return list.map((c, i) => {
    if (!isCabinetSource(c)) throw new Error(`art/cabinets.json: cabinet ${i} is malformed`);
    return c;
  });
}

export const cabinets: CabinetSource[] = parseCabinets(
  JSON.parse(readFileSync(join(repoRoot, "art/cabinets.json"), "utf8")),
);

export const frameWidth = 336;
const frameHeight = 428;
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

/** The screen's dark glass, inclusive, in frame coordinates. */
const screen = { x0: 54, y0: 54, x1: 281, y1: 345 };
const bevelWidth = 3;

/**
 * The bevel colour for body pixel (x, y) of a frame, or undefined off the
 * bevel: the cabinet's edge is lit on its top and left and shaded on its
 * bottom and right; the lip round the screen is the other way round, so the
 * screen sits in.
 */
export function bevelColour(bevel: Bevel, x: number, y: number): string | undefined {
  if (x < bevelWidth || y < bevelWidth) return bevel.light;
  if (x >= frameWidth - bevelWidth || y >= frameHeight - bevelWidth) return bevel.dark;
  const w = bevelWidth;
  const inLip = x >= screen.x0 - w && x <= screen.x1 + w && y >= screen.y0 - w && y <= screen.y1 + w;
  if (!inLip) return undefined;
  return x < screen.x0 || y < screen.y0 ? bevel.dark : bevel.light;
}

export function cabinetPath(c: CabinetSource): string {
  return join(imagesDir, c.file);
}

export function sourceCabinet(): PNG {
  return PNG.sync.read(readFileSync(join(repoRoot, "art/cabinet.png")));
}

function byteAt(png: PNG, i: number): number {
  const b = png.data[i];
  if (b === undefined) throw new Error(`byte ${i} is outside the ${png.width}x${png.height} image`);
  return b;
}

export function hexAt(png: PNG, i: number): string {
  return [0, 1, 2]
    .map((j) =>
      byteAt(png, i + j)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
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
  for (let i = 0; i < png.data.length; i += 4) if (byteAt(png, i + 3) > 0) out.add(hexAt(png, i));
  return [...out];
}

interface Lettering {
  w: number;
  h: number;
  on: (x: number, y: number) => boolean;
}

/** The opaque pixels of the title art's top line of lettering, cropped to their bounds. */
function titleLettering(file: string): Lettering {
  const png = PNG.sync.read(readFileSync(join(titleCardsDir, file)));
  const lit = (x: number, y: number): boolean => byteAt(png, (y * png.width + x) * 4 + 3) > 0;
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

export function renderCabinet(c: CabinetSource): PNG {
  const png = sourceCabinet();
  const map = (hex: string): string => {
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
      const bevel = hex === bodyColour ? bevelColour(c.bevel, x % frameWidth, y) : undefined;
      setHex(png, x, y, bevel ?? map(hex));
    }
  }

  const word = titleLettering(c.title);
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
