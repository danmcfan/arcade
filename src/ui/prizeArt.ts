// Pixel-art source for the prize decorations in the hub (ADR 0006): what an
// owned prize looks like, standing by the cabinet of the minigame it helps.
// Rows of palette letters (`.` is blank). scripts/gen-ui-art.ts packs them
// left to right, 1 px apart, into src/assets/images/prizes.png; the runtime
// reads each decoration's place in the sheet from here (src/arcade/prizes.ts).

import type { PrizeId } from "../arcade/prizes.ts";

/** Sweetie 16 colours, keyed by the letter the rows use. */
export const prizePalette: Readonly<Record<string, string>> = {
  k: "#1a1c2c",
  y: "#ffcd75",
  o: "#ef7d57",
  r: "#b13e53",
  n: "#29366f",
  l: "#94b0c2",
  w: "#f4f4f4",
};

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
  runningShoes: [
    ".kkkk....",
    "krwrrk...",
    "krwrrkkk.",
    "krrrrrrrk",
    "kwwwwwwwk",
    ".kkkkkkk.",
  ],
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
} as const satisfies Record<PrizeId, readonly string[]>;

/** Gap between decorations in the sheet. */
const prizeGap = 1;

/** Each decoration's rectangle in prizes.png (top row 0). */
export const prizeRects: Readonly<Record<PrizeId, { x: number; w: number; h: number }>> = (() => {
  let x = 0;
  const rects = {} as Record<PrizeId, { x: number; w: number; h: number }>;
  for (const [id, rows] of Object.entries(prizeArt) as [PrizeId, readonly string[]][]) {
    rects[id] = { x, w: rows[0]!.length, h: rows.length };
    x += rows[0]!.length + prizeGap;
  }
  return rects;
})();

export const prizeSheetWidth = Object.values(prizeRects).reduce((w, r) => Math.max(w, r.x + r.w), 0);
export const prizeSheetHeight = Math.max(...Object.values(prizeRects).map((r) => r.h));
