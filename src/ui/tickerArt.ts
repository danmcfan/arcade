// Pixel-art source for the hub's LED scoreboard (#72): the board on the wall
// under the ceiling's neon tube, and its lettering. The board's frame and
// unlit dots are part of the room (src/ui/hubArt.ts draws them into
// arcade.png); the lit letters change as the counts do, so they come from
// ticker.png, one band per ink. src/arcade/ticker.ts lays out what the board
// says. Glyphs are rows of `#` (lit) and `.`, 5 rows tall.

/** The board, in hub-image coordinates: a 1 px grey frame round a dot-matrix face. */
export const tickerRect = { x: 3, y: 5, w: 154, h: 11 } as const;
/** Top of the lettering: 3 rows below the board's top edge. */
export const tickerTextY = tickerRect.y + 3;
/** Left and right ends of the lettering, 4 px in from the board's edges. */
export const tickerLeft = tickerRect.x + 4;
export const tickerRight = tickerRect.x + tickerRect.w - 4;
/** Height of a glyph. */
export const tickerGlyphHeight = 5;

/** The LED glyphs: what the board can say. */
export const tickerGlyphs: Readonly<Record<string, readonly string[]>> = {
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["###", "..#", "###", "#..", "###"],
  "3": ["###", "..#", ".##", "..#", "###"],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "###", "..#", "###"],
  "6": ["###", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", ".#.", ".#.", ".#."],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "###"],
  A: [".#.", "#.#", "###", "#.#", "#.#"],
  B: ["##.", "#.#", "##.", "#.#", "##."],
  C: ["###", "#..", "#..", "#..", "###"],
  E: ["###", "#..", "##.", "#..", "###"],
  F: ["###", "#..", "##.", "#..", "#.."],
  I: ["###", ".#.", ".#.", ".#.", "###"],
  K: ["#.#", "#.#", "##.", "#.#", "#.#"],
  L: ["#..", "#..", "#..", "#..", "###"],
  M: ["#...#", "##.##", "#.#.#", "#...#", "#...#"],
  N: ["##.", "#.#", "#.#", "#.#", "#.#"],
  O: [".#.", "#.#", "#.#", "#.#", ".#."],
  P: ["###", "#.#", "###", "#..", "#.."],
  R: ["##.", "#.#", "##.", "#.#", "#.#"],
  S: [".##", "#..", ".#.", "..#", "##."],
  T: ["###", ".#.", ".#.", ".#.", ".#."],
  W: ["#...#", "#...#", "#.#.#", "##.##", "#...#"],
  Y: ["#.#", "#.#", ".#.", ".#.", ".#."],
};

/** Width of a space between words. */
export const tickerSpace = 2;
/** Gap between glyphs. */
export const tickerGap = 1;

/** The board's inks: Sweetie 16 letters (src/ui/sweetie16.ts), one band of ticker.png each. */
export const tickerInks = {
  /** Labels, and FREE PLAY. */
  orange: "o",
  /** Counts. */
  yellow: "y",
  /** PRESS SPACE TO PLAY. */
  white: "w",
  /** The cabinets' names, in their lit colours (src/ui/hubArt.ts `cabinetColours`). */
  green: "g",
  cyan: "c",
} as const;
export type TickerInk = keyof typeof tickerInks;
export const tickerInkOrder: readonly TickerInk[] = ["orange", "yellow", "white", "green", "cyan"];

/** Each glyph's column in ticker.png, left to right with a 1 px gap. */
export const tickerGlyphX: Readonly<Record<string, number>> = (() => {
  const out: Record<string, number> = {};
  let x = 0;
  for (const [ch, rows] of Object.entries(tickerGlyphs)) {
    out[ch] = x;
    x += (rows[0]?.length ?? 0) + 1;
  }
  return out;
})();

/** ticker.png: every glyph in each ink, a band of `tickerGlyphHeight` rows per ink. */
export function tickerSheetRows(): string[] {
  return tickerInkOrder.flatMap((ink) =>
    Array.from({ length: tickerGlyphHeight }, (_, y) =>
      Object.values(tickerGlyphs)
        .map((rows) => (rows[y] ?? "").replaceAll("#", tickerInks[ink]))
        .join("."),
    ),
  );
}

/** The board's face: dark, with an unlit LED on every other pixel, in a grey frame. */
export function tickerBoardPixel(x: number, y: number): string {
  const r = tickerRect;
  const edge = x === r.x || y === r.y || x === r.x + r.w - 1 || y === r.y + r.h - 1;
  if (edge) return "m";
  return (x + y) % 2 === 0 ? "d" : "k";
}
