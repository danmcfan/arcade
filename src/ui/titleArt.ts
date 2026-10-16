// Pixel-art source for the title screen's logo (#145): the ARCADE logo
// letters (src/ui/glyphs.ts) doubled into blocks that trail back and up to
// the right, a cabinet poking out from behind them and a chunky blue bar
// beneath. scripts/gen-ui-art.ts draws the layers, back to front, into
// title-logo.png; src/title/draw.ts animates on top of them: the sheen on the
// letter faces, the pulse along the bar, the game on the cabinet's screen and
// its blinking lights.

/** One layer of the title logo: Sweetie 16 rows, placed at (x, y) in the logo. */
export interface TitleLayer {
  x: number;
  y: number;
  rows: readonly string[];
}

export const titleLogoWidth = 192;
export const titleLogoHeight = 72;

/** The cabinet behind the letters, seen from the front left; its screen is left dark for `titleScreenFrames`. */
export const titleCabinet: TitleLayer = {
  x: 16,
  y: 0,
  rows: [
    ".......kkkkkkkkkkkkkkkkkkkkkkk..",
    ".....kk.........................",
    "...kknn.........................",
    "kkknnnnkkkkkkkkkkkkkkkkkkkkkkkk.",
    "knnnnnnkbbbbbbbbbbbbbbbbbbbbbbk.",
    "knnnnnnkbkkkkkkkkkkkkkkkkkkkkbk.",
    "knnnnnnkbBBBBBBBBBBBBBBBBBBBBbk.",
    "knnnnnnkbBByByByByByByByByBBBbk.",
    "knnnnnnkbBBBBBBBBBBBBBBBBBBBBbk.",
    "knnnnnnkbkkkkkkkkkkkkkkkkkkkkbk.",
    "knnnnnnkbbbbbbbbbbbbbbbbbbbbbbk.",
    "knnnnnnkbkkkkkkkkkkkkkkkkkkkkbk.",
    "knnnnnnkbkkkkkkkkkkkkkkkkkkkkbk.",
    "knnnnnnkbkknnnnnnnnnnnnnnnkkkbk.",
    "knnnnnnkbkknnnnnnnnnnnnnnnkkkbk.",
    "knnnnnnkbkknnnnnnnnnnnnnnnkkkbk.",
    "knnnnnnkbkknnnnnnnnnnnnnnnkkkbk.",
    "knnnnnnkbkknnnnnnnnnnnnnnnkkkbk.",
    "knnnnnnkbkknnnnnnnnnnnnnnnkkkbk.",
    "knnnnnnkbkknnnnnnnnnnnnnnnkkkbk.",
    "knnnnnnkbkknnnnnnnnnnnnnnnkkkbk.",
    "knnnnnnkbkkGGGGGGGGGGGGGGGkkkbk.",
    "knnnnnnkbkkkkkkkkkkkkkkkkkkkkbk.",
    "knnnnnnkbkkkkkkkkkkkkkkkkkkkkbk.",
    "knnnnnnkbkkkkkkkkkkkkkkkkkkkkbk.",
    "knnnnnnkbbbbbbbbbbbbbbbbbbbbbbk.",
    "knnnnnkkkkkkkkkkkkkkkkkkkkkkkkkk",
    "knnnnnBBBBBBBBBBBBBBBBBBBBBBBBBB",
    "knnnnnBBBBBBByBBBwBByBBBBBBBBBBB",
    "knnnnnBBBBBBBBBBBBBBBBBBBBBBBBBB",
    "knnnnnkkkkkkkkkkkkkkkkkkkkkkkkkk",
    "knnnnnnkbbbbbbbbbbbbbbbbbbbbbbk.",
    "knnnnnnkbbbbbbbbbbbbbbbbbbbbbbk.",
    "knnnnnnkbbbbbbbbbbbbbbbbbbbbbbk.",
    "knnnnnnkbbbbbbbbbbbbbbbbbbbbbbk.",
    "knnnnnnkbbbbbbbbbbbbbbbbbbbbbbk.",
    "knnnnnnkbbbbbbbbbbbbbbbbbbbbbbk.",
    "knnnnnnkbbbbbbbbbbbbbbbbbbbbbbk.",
    "knnnnnnkbbbbbbbbbbbbbbbbbbbbbbk.",
    "knnnnnnkbbbbbbbbbbbbbbbbbbbbbbk.",
    "knnnnnnkbbbbbbbbbbbbbbbbbbbbbbk.",
    "knnnnnnkbbbbbbbbbbbbbbbbbbbbbbk.",
    "knnnnnnkbbbbbbbbbbbbbbbbbbbbbbk.",
    "knnnnnnkbbbbbbbbbbbbbbbbbbbbbbk.",
    ".......kbbbbbbbbbbbbbbbbbbbbbbk.",
    ".......kbbbbbbbbbbbbbbbbbbbbbbk.",
    ".......kbbbbbbbbbbbbbbbbbbbbbbk.",
  ],
};

/** The bar under the word, rising with it: cyan on top, navy below. */
export const titleBar: TitleLayer = {
  x: 9,
  y: 47,
  rows: [
    ".............................................................................................................................................................................kkk",
    "....................................................................................................................................................................kkkkkkkkkccc",
    "...........................................................................................................................................................kkkkkkkkkcccccccccBBB",
    "..................................................................................................................................................kkkkkkkkkcccccccccBBBBBBBwBBBB",
    ".........................................................................................................................................kkkkkkkkkcccccccccBBBBBBBwBBBBBBBBBBbbb",
    "................................................................................................................................kkkkkkkkkcccccccccBBBBBBBwBBBBBBBBBBbbbbbbbbbnnn",
    "........................................................................................................................kkkkkkkkcccccccccBBBBBBBwBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkk",
    "...............................................................................................................kkkkkkkkkccccccccBBBBBBBwBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkkk...",
    "......................................................................................................kkkkkkkkkcccccccccBBBBBBwBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkkk............",
    ".............................................................................................kkkkkkkkkcccccccccBBBBBBwBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkkk.....................",
    "....................................................................................kkkkkkkkkcccccccccBBBBBBwBBBBBBBBBBBbbbbbbbbnnnnnnnnnkkkkkkkkk..............................",
    "...........................................................................kkkkkkkkkcccccccccBBBBBBwBBBBBBBBBBBbbbbbbbbbnnnnnnnnkkkkkkkkk.......................................",
    "..................................................................kkkkkkkkkcccccccccBBBBBBwBBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkk................................................",
    ".........................................................kkkkkkkkkcccccccccBBBBBBwBBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkkk........................................................",
    "................................................kkkkkkkkkcccccccccBBBBBBwBBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkkk.................................................................",
    "........................................kkkkkkkkcccccccccBBBBBBwBBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkkk..........................................................................",
    "...............................kkkkkkkkkccccccccBBBBBBwBBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkkk...................................................................................",
    "......................kkkkkkkkkcccccccccBBBBBwBBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkkk............................................................................................",
    ".............kkkkkkkkkcccccccccBBBBBwBBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkkk.....................................................................................................",
    "....kkkkkkkkkcccccccccBBBBBwBBBBBBBBBBBBbbbbbbbbnnnnnnnnnkkkkkkkkk..............................................................................................................",
    "kkkkcccccccccBBBBBwBBBBBBBBBBBBbbbbbbbbbnnnnnnnnkkkkkkkkk.......................................................................................................................",
    "ccccBBBBBwBBBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkk................................................................................................................................",
    "wBBBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkkk........................................................................................................................................",
    "BBBBbbbbbbbbbnnnnnnnnnkkkkkkkkk.................................................................................................................................................",
    "bbbbnnnnnnnnnkkkkkkkkk..........................................................................................................................................................",
  ],
};

/** The face of each of ARCADE's letters, in the logo's yellow, orange and red bands: a 14x15 letter doubled. */
export const titleLetterFaces: Readonly<Record<string, readonly string[]>> = {
  A: [
    "....yyyyyyyyyyyyyyyyyyyy....",
    "....yyyyyyyyyyyyyyyyyyyy....",
    "..yyyyyyyyyyyyyyyyyyyyyyyy..",
    "..yyyyyyyyyyyyyyyyyyyyyyyy..",
    "yyyyyyyy............yyyyyyyy",
    "yyyyyyyy............yyyyyyyy",
    "yyyyyy................yyyyyy",
    "yyyyyy................yyyyyy",
    "yyyyyy................yyyyyy",
    "yyyyyy................yyyyyy",
    "oooooo................oooooo",
    "oooooo................oooooo",
    "oooooooo............oooooooo",
    "oooooooo............oooooooo",
    "oooooooooooooooooooooooooooo",
    "oooooooooooooooooooooooooooo",
    "oooooooooooooooooooooooooooo",
    "oooooooooooooooooooooooooooo",
    "oooooooooooooooooooooooooooo",
    "oooooooooooooooooooooooooooo",
    "rrrrrr................rrrrrr",
    "rrrrrr................rrrrrr",
    "rrrrrr................rrrrrr",
    "rrrrrr................rrrrrr",
    "rrrrrr................rrrrrr",
    "rrrrrr................rrrrrr",
    "rrrrrr................rrrrrr",
    "rrrrrr................rrrrrr",
    "rrrr....................rrrr",
    "rrrr....................rrrr",
  ],
  R: [
    "yyyyyyyyyyyyyyyyyyyyyyyy....",
    "yyyyyyyyyyyyyyyyyyyyyyyy....",
    "yyyyyyyyyyyyyyyyyyyyyyyyyy..",
    "yyyyyyyyyyyyyyyyyyyyyyyyyy..",
    "yyyyyyyyyyyyyyyyyyyyyyyyyyyy",
    "yyyyyyyyyyyyyyyyyyyyyyyyyyyy",
    "yyyyyy..............yyyyyyyy",
    "yyyyyy..............yyyyyyyy",
    "yyyyyy..............yyyyyyyy",
    "yyyyyy..............yyyyyyyy",
    "oooooo..............oooooooo",
    "oooooo..............oooooooo",
    "oooooooooooooooooooooooooo..",
    "oooooooooooooooooooooooooo..",
    "oooooooooooooooooooooooo....",
    "oooooooooooooooooooooooo....",
    "oooooo........oooooo........",
    "oooooo........oooooo........",
    "oooooo..........oooooo......",
    "oooooo..........oooooo......",
    "rrrrrr..........rrrrrr......",
    "rrrrrr..........rrrrrr......",
    "rrrrrr............rrrrrr....",
    "rrrrrr............rrrrrr....",
    "rrrrrr............rrrrrr....",
    "rrrrrr............rrrrrr....",
    "rrrrrr..............rrrrrr..",
    "rrrrrr..............rrrrrr..",
    "rrrrrr..............rrrrrr..",
    "rrrrrr..............rrrrrr..",
  ],
  C: [
    "..yyyyyyyyyyyyyyyyyyyyyyyy..",
    "..yyyyyyyyyyyyyyyyyyyyyyyy..",
    "yyyyyyyyyyyyyyyyyyyyyyyyyyyy",
    "yyyyyyyyyyyyyyyyyyyyyyyyyyyy",
    "yyyyyyyyyyyyyyyyyyyyyyyyyyyy",
    "yyyyyyyyyyyyyyyyyyyyyyyyyyyy",
    "yyyyyy................yyyyyy",
    "yyyyyy................yyyyyy",
    "yyyyyy......................",
    "yyyyyy......................",
    "oooooo......................",
    "oooooo......................",
    "oooooo......................",
    "oooooo......................",
    "oooooo......................",
    "oooooo......................",
    "oooooo......................",
    "oooooo......................",
    "oooooo......................",
    "oooooo......................",
    "rrrrrr......................",
    "rrrrrr......................",
    "rrrrrr................rrrrrr",
    "rrrrrr................rrrrrr",
    "rrrrrrrrrrrrrrrrrrrrrrrrrrrr",
    "rrrrrrrrrrrrrrrrrrrrrrrrrrrr",
    "rrrrrrrrrrrrrrrrrrrrrrrrrrrr",
    "rrrrrrrrrrrrrrrrrrrrrrrrrrrr",
    "..rrrrrrrrrrrrrrrrrrrrrrrr..",
    "..rrrrrrrrrrrrrrrrrrrrrrrr..",
  ],
  D: [
    "yyyyyyyyyyyyyyyyyyyyyy......",
    "yyyyyyyyyyyyyyyyyyyyyy......",
    "yyyyyyyyyyyyyyyyyyyyyyyyyy..",
    "yyyyyyyyyyyyyyyyyyyyyyyyyy..",
    "yyyyyyyyyyyyyyyyyyyyyyyyyy..",
    "yyyyyyyyyyyyyyyyyyyyyyyyyy..",
    "yyyyyy..............yyyyyyyy",
    "yyyyyy..............yyyyyyyy",
    "yyyyyy................yyyyyy",
    "yyyyyy................yyyyyy",
    "oooooo................oooooo",
    "oooooo................oooooo",
    "oooooo................oooooo",
    "oooooo................oooooo",
    "oooooo................oooooo",
    "oooooo................oooooo",
    "oooooo................oooooo",
    "oooooo................oooooo",
    "oooooo................oooooo",
    "oooooo................oooooo",
    "rrrrrr................rrrrrr",
    "rrrrrr................rrrrrr",
    "rrrrrr..............rrrrrrrr",
    "rrrrrr..............rrrrrrrr",
    "rrrrrrrrrrrrrrrrrrrrrrrrrr..",
    "rrrrrrrrrrrrrrrrrrrrrrrrrr..",
    "rrrrrrrrrrrrrrrrrrrrrrrrrr..",
    "rrrrrrrrrrrrrrrrrrrrrrrrrr..",
    "rrrrrrrrrrrrrrrrrrrrrr......",
    "rrrrrrrrrrrrrrrrrrrrrr......",
  ],
  E: [
    "....yyyyyyyyyyyyyyyyyyyy....",
    "....yyyyyyyyyyyyyyyyyyyy....",
    "yyyyyyyyyyyyyyyyyyyyyyyyyyyy",
    "yyyyyyyyyyyyyyyyyyyyyyyyyyyy",
    "yyyyyyyyyyyyyyyyyyyyyyyyyyyy",
    "yyyyyyyyyyyyyyyyyyyyyyyyyyyy",
    "yyyyyy......................",
    "yyyyyy......................",
    "yyyy........................",
    "yyyy........................",
    "oooo........................",
    "oooo........................",
    "oooooooooooooooooooo........",
    "oooooooooooooooooooo........",
    "oooooooooooooooooooo........",
    "oooooooooooooooooooo........",
    "oooooooooooooooooooo........",
    "oooooooooooooooooooo........",
    "oooo........................",
    "oooo........................",
    "rrrr........................",
    "rrrr........................",
    "rrrrrr......................",
    "rrrrrr......................",
    "rrrrrrrrrrrrrrrrrrrrrrrrrrrr",
    "rrrrrrrrrrrrrrrrrrrrrrrrrrrr",
    "rrrrrrrrrrrrrrrrrrrrrrrrrrrr",
    "rrrrrrrrrrrrrrrrrrrrrrrrrrrr",
    "....rrrrrrrrrrrrrrrrrrrr....",
    "....rrrrrrrrrrrrrrrrrrrr....",
  ],
};

/** Logo pixels from one letter's face to the next's: the face, its block side and nothing between, so every gap is the same. */
const letterPitch = 31;
/** Logo pixels each letter sits higher than the one before it. */
const letterRise = 3;

/** ARCADE: the faces left to right, each rising, with block sides in purple and the letters' holes filled dark so the cabinet stays behind them. */
export const titleWord: TitleLayer = { x: 3, y: 18, rows: blockWord(["A", "R", "C", "A", "D", "E"]) };

/**
 * `letters`' faces placed `letterPitch` apart, each `letterRise` above the
 * last, every face trailing a block side down and to the right (two purple
 * steps, then a dark edge); a letter covers the side of the one before it.
 */
function blockWord(letters: readonly string[]): string[] {
  const faces = letters.map((ch) => titleLetterFaces[ch] ?? []);
  const faceW = faces[0]?.[0]?.length ?? 0;
  const faceH = faces[0]?.length ?? 0;
  const side = 3;
  const w = (faces.length - 1) * letterPitch + faceW + side;
  const h = (faces.length - 1) * letterRise + faceH + side;
  const painted = new Map<number, string>();
  faces.forEach((face, i) => {
    const left = i * letterPitch;
    const top = (faces.length - 1 - i) * letterRise;
    for (let d = side; d >= 0; d--) {
      face.forEach((row, y) => {
        Array.from(row).forEach((c, x) => {
          if (c !== ".") painted.set((top + y + d) * w + left + x + d, d === 0 ? c : d === side ? "k" : "p");
        });
      });
    }
  });
  const outside = reachable(w, h, (i) => !painted.has(i));
  return Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (__, x) => painted.get(y * w + x) ?? (outside.has(y * w + x) ? "." : "k")).join(""),
  );
}

/** The cells of a `w` x `h` grid, numbered row by row, that `open` cells join to its edge. */
function reachable(w: number, h: number, open: (i: number) => boolean): Set<number> {
  const seen = new Set<number>();
  const todo: [number, number][] = [];
  for (let x = 0; x < w; x++) todo.push([x, 0], [x, h - 1]);
  for (let y = 0; y < h; y++) todo.push([0, y], [w - 1, y]);
  for (let next = todo.pop(); next !== undefined; next = todo.pop()) {
    const [x, y] = next;
    const i = y * w + x;
    if (x < 0 || y < 0 || x >= w || y >= h || seen.has(i) || !open(i)) continue;
    seen.add(i);
    todo.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  return seen;
}

/** Where the cabinet's screen sits in the logo, and its size. */
export const titleScreenSpot = { x: 27, y: 13 } as const;
export const titleScreenWidth = 15;
export const titleScreenHeight = 9;

/** The game playing on the cabinet's screen: a bee darting at a honey drop over the grass, a frame each 12 ticks. */
export const titleScreenFrames: readonly (readonly string[])[] = [
  [
    "nnnnnnnnnnnnnnn",
    "nnwnnnnnnnnnnnn",
    "nnnnnnnnnnnnnnn",
    "nnyknnnnnnnyynn",
    "nnkynnnnnnyooyn",
    "nnnnnnnnnnyooyn",
    "nnnnnnnnnnnyynn",
    "nnnnnnnnnnnnnnn",
    "GGGGGGGGGGGGGGG",
  ],
  [
    "nnnnnnnnnnnnnnn",
    "nnnnnnnnnnnnnnn",
    "nnnnwnnnnnnnnnn",
    "nnnnnyknnnnyynn",
    "nnnnnkynnnyooyn",
    "nnnnnnnnnnyooyn",
    "nnnnnnnnnnnyynn",
    "nnnnnnnnnnnnnnn",
    "GGGGGGGGGGGGGGG",
  ],
  [
    "nnnnnnnnnnnnnnn",
    "nnnnnnnnnnnnnnn",
    "nnnnnnnnnnnnnnn",
    "nnnnnnnnyknyynn",
    "nnnnnnnnkyyooyn",
    "nnnnnnnnnnyooyn",
    "nnnnnnnnnnnyynn",
    "nnnnnnnnnnnnnnn",
    "GGGGGGGGGGGGGGG",
  ],
  [
    "nnnnnnnnnnnnnnn",
    "nnnnnnnnnnnnnnn",
    "nnnnnnnnnnnnnnn",
    "nnnnnnnnnnnwwnn",
    "nnnnnnnnnnwyywn",
    "nnnnnnnnnnwyywn",
    "nnnnnnnnnnnwwnn",
    "nnnnnnnnnnnnnnn",
    "GGGGGGGGGGGGGGG",
  ],
];

/** The marquee's bulbs (they chase) and the control panel's buttons (they flash), in the logo. */
export const titleMarqueeBulbs: readonly { x: number; y: number }[] = Array.from({ length: 8 }, (_, i) => ({
  x: 27 + i * 2,
  y: 7,
}));
export const titleButtons: readonly { x: number; y: number }[] = [
  { x: 29, y: 28 },
  { x: 36, y: 28 },
];

/** The arcade's lights twinkling in the dark behind the logo, in screen pixels (each a 2x2 bulb): a Sweetie 16 letter and a blink phase each. */
export const titleBackLights: readonly { x: number; y: number; colour: string; phase: number }[] = [
  { x: 4, y: 6, colour: "o", phase: 80 },
  { x: 2, y: 30, colour: "c", phase: 5 },
  { x: 52, y: 4, colour: "y", phase: 33 },
  { x: 60, y: 18, colour: "c", phase: 0 },
  { x: 74, y: 8, colour: "g", phase: 58 },
  { x: 84, y: 22, colour: "y", phase: 37 },
  { x: 96, y: 3, colour: "B", phase: 14 },
  { x: 104, y: 14, colour: "g", phase: 71 },
  { x: 118, y: 6, colour: "w", phase: 42 },
  { x: 126, y: 17, colour: "B", phase: 19 },
  { x: 140, y: 4, colour: "o", phase: 53 },
  { x: 150, y: 12, colour: "c", phase: 26 },
  { x: 160, y: 2, colour: "w", phase: 28 },
  { x: 166, y: 22, colour: "c", phase: 89 },
  { x: 178, y: 8, colour: "y", phase: 11 },
  { x: 188, y: 26, colour: "g", phase: 64 },
];
