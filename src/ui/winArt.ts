// Pixel-art source for the arcade win (#143, #197): the cake, the gold trophy
// and two bunches of balloons that stand on the prize desk for good, and the
// frames one piece of confetti tumbles through. Rows of Sweetie 16 letters
// (`sweetie` in src/ui/sweetie16.ts, `.` is blank). scripts/gen-ui-art.ts packs
// the pieces left to right, 1 px apart, into src/assets/images/win.png, and
// under them each confetti frame once per colour; the runtime reads each
// one's place in the sheet from here (src/arcade/arcadeWin.ts).

import { stripRects } from "./strip.ts";
import type { SweetieLetter } from "./sweetie16.ts";

export const winArt = {
  /** A two-tier cake with one candle: left of the employee on the desk's back run. */
  cake: [
    ".....o......",
    ".....w......",
    "...kkkkkk...",
    "..kwwwwwwk..",
    "..kryrryrk..",
    "..krrrrrrk..",
    ".kkkkkkkkkk.",
    "kwwwwwwwwwwk",
    "kwrwwrwwrwwk",
    "krrrrrrrrrrk",
    "kyyyyyyyyyyk",
    ".kkkkkkkkkk.",
  ],
  /** A gold cup with two handles: right of the employee. */
  trophy: [
    "..kkkkkkk..",
    "kkkwyyyokkk",
    "k.kwyyyok.k",
    "k.kwyyyok.k",
    ".kkwyyyokk.",
    "..kyyyyok..",
    "...kyyok...",
    "....kok....",
    "....kyk....",
    "...kkkkk...",
    "..kyyyyok..",
    "..kkkkkkk..",
  ],
  /** A red and a blue balloon, their strings tied at the desk's left end. */
  balloonsLeft: [
    "..kkk........",
    ".kwrrk.......",
    "kwrrrpk......",
    "krrrrpk.kkk..",
    "krrrppkkwBBk.",
    ".kpppkkwBBBbk",
    "..kkk.kBBBBbk",
    "...k..kBBBbbk",
    "...l...kbbbk.",
    "...l....kkk..",
    "...l.....k...",
    "....l....l...",
    "....l....l...",
    "....l...l....",
    "....l...l....",
    ".....l..l....",
    ".....l..l....",
    ".....l.l.....",
    ".....l.l.....",
    "......ll.....",
    "......l......",
    "......l......",
  ],
  /** A yellow and a green balloon, tied at the desk's right end. */
  balloonsRight: [
    "..kkk........",
    ".kwyyk.......",
    "kwyyyok......",
    "kyyyyok.kkk..",
    "kyyyookkwggk.",
    ".koookkwgggGk",
    "..kkk.kggggGk",
    "...k..kgggGGk",
    "...l...kGGGk.",
    "...l....kkk..",
    "...l.....k...",
    "....l....l...",
    "....l....l...",
    "....l...l....",
    "....l...l....",
    ".....l..l....",
    ".....l..l....",
    ".....l.l.....",
    ".....l.l.....",
    "......ll.....",
    "......l......",
    "......l......",
  ],
} as const satisfies Record<string, readonly string[]>;

export type WinPiece = keyof typeof winArt;

/** Gap between pieces in the sheet. */
const winGap = 1;

/** Each piece's rectangle in win.png (top row 0). */
export const winRects = stripRects(winArt, winGap);

/** A 2 px strip of confetti tumbling end over end, drawn in `w`; each frame is `confettiSize` square. */
export const confettiFrames: readonly (readonly string[])[] = [
  ["ww", ".."],
  ["w.", ".w"],
  ["w.", "w."],
  [".w", "w."],
];
export const confettiSize = 2;

/** The colours confetti comes in, each a row of frames under the pieces. */
export const confettiLetters: readonly SweetieLetter[] = ["r", "y", "g", "B", "c", "o"];

/** The top of the confetti frames in win.png: the first row below the pieces. */
export const confettiSheetY = Math.max(...Object.values(winRects).map((r) => r.h)) + winGap;

const stripWidth = Object.values(winRects).reduce((w, r) => Math.max(w, r.x + r.w), 0);
export const winSheetWidth = Math.max(stripWidth, confettiFrames.length * confettiSize);
export const winSheetHeight = confettiSheetY + confettiLetters.length * confettiSize;
