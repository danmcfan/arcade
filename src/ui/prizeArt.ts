// Pixel-art source for the prize decorations in the hub (ADR 0006): what an
// owned prize looks like, standing by the cabinet of the minigame it helps.
// Rows of Sweetie 16 letters (`sweetie` in src/ui/sweetie16.ts, `.` is
// blank). scripts/gen-ui-art.ts packs them left to right, 1 px apart, into
// src/assets/images/prizes.png; the runtime reads each decoration's place in
// the sheet from here (src/arcade/prizes.ts).

import type { PrizeId } from "../arcade/prizes.ts";
import { stripRects } from "./strip.ts";

export const prizeArt = {
  /** A jar of honey with a red lid: stands on the floor left of the Sweet Sam cabinet. */
  honeyJar: [
    ".kkkkkk.",
    "krrrrrrk",
    "kkkkkkkk",
    "kywyyyok",
    "kwyyyyok",
    "kyyyyyok",
    "kyyyyyok",
    "kyyyyook",
    ".kkkkkk.",
  ],
  /** A red running shoe with a white sole: stands on the floor right of the Sweet Sam cabinet. */
  runningShoes: [".kkkk....", "krwrrk...", "krwrrkkk.", "krrrrrrrk", "kwwwwwwwk", ".kkkkkkk."],
  /** A framed picture of a bee asleep under a "z": hangs on the wall above the Sweet Sam cabinet. */
  sleepyBees: [
    "kkkkkkkkkkkk",
    "kooooooooook",
    "konnnnnnwwok",
    "konnnnnnnwok",
    "konnllnnwwok",
    "konnllnnnnok",
    "konykykknnok",
    "kokykykkknok",
    "konnnnnnnnok",
    "kooooooooook",
    "kkkkkkkkkkkk",
  ],
  /** A brass storm lantern on a wall bracket, its flame lit: hangs on the wall right of the Firefly cabinet. */
  lantern: [
    "kk......",
    "kmmmk...",
    "kk..k...",
    "...kk...",
    "..k..k..",
    ".kkkkkk.",
    "kmyyyymk",
    "kygwwgyk",
    "kygwwgyk",
    "kmyyyymk",
    ".kkkkkk.",
  ],
  /** A cyan glow stick on a hook: hangs on the wall left of the Firefly cabinet. */
  glowStick: [".k.", "k.k", ".k.", "kck", "kwk", "kck", "kck", "kck", "kck", ".k."],
  /**
   * A pair of firefly wings mounted bare: hangs on the wall above the Firefly
   * cabinet. The left half; the generator mirrors it into the right
   * (`mirroredPrizes`).
   */
  wings: [".kk...", "kcBk..", "kccBk.", ".kccBk", "..kcck", "...kky", "....ky", ".....k"],
  /** A squat brass oil can with a red label, on a wall shelf left of the Brass Monkey cabinet. */
  oilCan: [
    ".....k......",
    "....kok.....",
    "...kkkkk..k.",
    "..kyyyyokkk.",
    ".kywyyyyok..",
    ".kyrrrryok..",
    ".kyyyyyyok..",
    ".kkkkkkkkk..",
    "kkkkkkkkkkkk",
    "kooooooooook",
    ".k........k.",
  ],
  /** A red boot with a white sole on a brass spring, hung from a peg on the wall above the Brass Monkey cabinet. */
  springBoots: [
    ".m........",
    ".k........",
    "kkkk......",
    "krrk......",
    "krrk......",
    "krrrkkkk..",
    "krrrrrrrk.",
    "kwwwwwwwk.",
    "kkkkkkkkk.",
    "..kyyk....",
    ".kyyk.....",
    "..kkkk....",
  ],
  /** A brass gear-edged pocket watch, hung from a peg on the wall above and right of the Brass Monkey cabinet. */
  pocketWatch: [
    "....m....",
    "....k....",
    ".k.kkk.k.",
    "kokooooko",
    ".koyyyok.",
    "koywkwyok",
    "koywkwyok",
    "koywkkyok",
    ".koyyyok.",
    "kokooooko",
    ".k.kkk.k.",
  ],
} as const satisfies Record<PrizeId, readonly string[]>;

/** Decorations drawn as their left half: the sheet holds them mirrored, twice as wide. */
const mirrored: readonly PrizeId[] = ["wings"];
export const mirroredPrizes: ReadonlySet<string> = new Set(mirrored);

/** Each decoration's rows as the sheet's size needs them: a mirrored one twice as wide. */
const sheetSizes: Record<PrizeId, readonly string[]> = { ...prizeArt };
for (const id of mirrored) sheetSizes[id] = prizeArt[id].map((r) => r.repeat(2));

/** Gap between decorations in the sheet. */
const prizeGap = 1;

/** Each decoration's rectangle in prizes.png (top row 0). */
export const prizeRects: Readonly<Record<PrizeId, { x: number; w: number; h: number }>> = stripRects(
  sheetSizes,
  prizeGap,
);

export const prizeSheetWidth = Object.values(prizeRects).reduce((w, r) => Math.max(w, r.x + r.w), 0);
export const prizeSheetHeight = Math.max(...Object.values(prizeRects).map((r) => r.h));
