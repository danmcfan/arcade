// Build every minigame's cabinet outline from the Sweet Sam cabinet strip:
//
//   bun run art      # also writes the cabinet PNGs in src/assets/images
//
// Sources, in art/: cabinet.png (Sweet Sam's strip, exported from
// cabinet.ase) and cabinets.json (per cabinet its output file and a palette
// map). Each outline is the 8 px of art/cabinet.png round the screen (#113):
// its first frame cropped to the 240x304 box at (48, 48), with every colour
// swapped through the palette. Each cabinet's `bevel` gives the screen's lip a
// shaded and a lit edge (`bevelColour`), so the screen sits in. The marquee
// and the joystick fall outside the crop. Recolouring later means editing
// cabinets.json and rerunning. gen-art.test.ts fails when the committed PNGs
// drift from the sources.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { cabinetHeight, cabinetWidth } from "../src/ui/cabinet.ts";
import { repoRoot } from "./repo-root.ts";
import { imageOutput, type ImageOutput } from "./image-outputs.ts";

export interface CabinetSource {
  /** Software name. */
  name: string;
  /** Output file in src/assets/images. */
  file: string;
  /** Source colour (hex, no #) → replacement, for every colour in cabinet.png. */
  palette: Record<string, string>;
  /** Bevelled edges on the body: the lit and shaded colours (hex, no #). */
  bevel: Bevel;
}

export interface Bevel {
  light: string;
  dark: string;
}

const imagesDir = "src/assets/images";

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

/** One joystick frame of art/cabinet.png. */
export const frameWidth = 336;
/** The crop of a frame each outline is: the screen and 8 px round it. */
export const outline = { x: 48, y: 48, w: 240, h: 304 };

/** Sweet Sam's hand-drawn marquee letters and their shadow, painted over with the body where the crop reaches them. */
const letterColour = "ffcd75";
const shadowColour = "ef7d57";
const bodyColour = "b13e53";

/** The screen's dark glass, inclusive, in frame coordinates. */
const screen = { x0: 54, y0: 54, x1: 281, y1: 345 };
const bevelWidth = 3;

/**
 * The bevel colour for body pixel (x, y) of a frame, or undefined off the
 * bevel: the lip round the screen is shaded on its top and left and lit on
 * its bottom and right, so the screen sits in.
 */
export function bevelColour(bevel: Bevel, x: number, y: number): string | undefined {
  const w = bevelWidth;
  const inLip = x >= screen.x0 - w && x <= screen.x1 + w && y >= screen.y0 - w && y <= screen.y1 + w;
  if (!inLip) return undefined;
  return x < screen.x0 || y < screen.y0 ? bevel.dark : bevel.light;
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

export function renderCabinet(c: CabinetSource): PNG {
  const src = sourceCabinet();
  const out = new PNG({ width: outline.w, height: outline.h });
  const map = (hex: string): string => {
    const to = c.palette[hex];
    if (to === undefined) throw new Error(`${c.name}: palette has no entry for ${hex}`);
    return to;
  };
  for (let y = 0; y < outline.h; y++) {
    for (let x = 0; x < outline.w; x++) {
      const [fx, fy] = [outline.x + x, outline.y + y];
      const i = (fy * src.width + fx) * 4;
      if (src.data[i + 3] === 0) continue;
      let hex = hexAt(src, i);
      if (hex === letterColour || hex === shadowColour) hex = bodyColour;
      const bevel = hex === bodyColour ? bevelColour(c.bevel, fx, fy) : undefined;
      setHex(out, x, y, bevel ?? map(hex));
    }
  }
  return out;
}

/** Every cabinet outline: its file, its size (the crop) and how to draw it. */
export const cabinetFiles: readonly ImageOutput[] = cabinets.map((c) =>
  imageOutput(join(imagesDir, c.file), cabinetWidth, cabinetHeight, () => renderCabinet(c)),
);
