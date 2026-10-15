// Pixel-art source for the hub's LED scoreboard (#72), framed as a theatre
// marquee (#92): the board on the wall under the ceiling's neon tube, its
// ring of bulbs and its lettering. The board's frame, unlit bulbs and unlit
// dots are part of the room (src/ui/hubArt.ts draws them into arcade.png);
// the lit letters change as the counts do, so they come from ticker.png, one
// band per ink. src/arcade/ticker.ts lays out what the board says and lights
// the bulbs. Glyphs are rows of `#` (lit) and `.`, 5 rows tall.

/** The board, in hub-image coordinates: a red marquee frame ringed with bulbs round a dot-matrix face. */
export const tickerRect = { x: 2, y: 5, w: 156, h: 15 } as const;
/** The dot-matrix face inside the frame, its top row in the frame's shadow. */
export const tickerFace = {
  x: tickerRect.x + 3,
  y: tickerRect.y + 3,
  w: tickerRect.w - 6,
  h: tickerRect.h - 6,
} as const;
/** Top of the lettering: 2 rows below the face's top. */
export const tickerTextY = tickerFace.y + 2;
/** Left and right ends of the lettering, 4 px in from the face's sides. */
export const tickerLeft = tickerFace.x + 4;
export const tickerRight = tickerFace.x + tickerFace.w - 5;
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
  H: ["#.#", "#.#", "###", "#.#", "#.#"],
  /** The gold star of a beaten machine (#148). */
  "*": ["..#..", "#####", ".###.", ".#.#.", "#...#"],
};

/** Width of a space between words. */
export const tickerSpace = 2;
/** Gap between glyphs. */
export const tickerGap = 1;

/** The board's inks: Sweetie 16 letters (src/ui/sweetie16.ts), one band of ticker.png each. */
export const tickerInks = {
  /** Labels, and FREE PLAY. */
  orange: "o",
  /** Counts, and a beaten machine's star. */
  yellow: "y",
  /** PRESS SPACE TO PLAY, and HI. */
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

/** The bulbs' colours: unlit in the room image, lit by the scoreboard. */
const bulbUnlit = "o";
export const bulbLit = "y";

/** One of the marquee's bulbs, in hub-image coordinates. */
export interface Bulb {
  x: number;
  y: number;
}

/**
 * The marquee's bulbs, one every 3 px round the ring 1 px inside the frame's
 * edge, clockwise from the top-left corner.
 */
export const tickerBulbs: readonly Bulb[] = (() => {
  const r = tickerRect;
  const [x0, y0, x1, y1] = [r.x + 1, r.y + 1, r.x + r.w - 2, r.y + r.h - 2];
  const ring: Bulb[] = [];
  for (let x = x0; x <= x1; x++) ring.push({ x, y: y0 });
  for (let y = y0 + 1; y <= y1; y++) ring.push({ x: x1, y });
  for (let x = x1 - 1; x >= x0; x--) ring.push({ x, y: y1 });
  for (let y = y1 - 1; y > y0; y--) ring.push({ x: x0, y });
  return ring.filter((_, i) => i % 3 === 0);
})();

const bulbAt: ReadonlySet<string> = new Set(tickerBulbs.map((b) => `${b.x},${b.y}`));

/**
 * The board at (x, y) in hub-image coordinates, or null off it: a purple
 * edge, a red frame with its bulbs unlit, then the face, dark with an unlit
 * LED on every other pixel under a row of the frame's shadow. The board casts
 * a 1 px shadow on the wall below it.
 */
export function tickerBoardPixel(x: number, y: number): string | null {
  const r = tickerRect;
  const [x1, y1] = [r.x + r.w - 1, r.y + r.h - 1];
  if (y === y1 + 1 && x > r.x && x <= x1) return "k";
  if (x < r.x || x > x1 || y < r.y || y > y1) return null;
  if (x === r.x || y === r.y || x === x1 || y === y1) return "p";
  if (bulbAt.has(`${x},${y}`)) return bulbUnlit;
  const f = tickerFace;
  if (x < f.x || x >= f.x + f.w || y < f.y || y >= f.y + f.h) return "r";
  if (y === f.y) return "p";
  return (x + y) % 2 === 0 ? "d" : "k";
}
