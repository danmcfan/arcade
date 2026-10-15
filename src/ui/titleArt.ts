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

/** ARCADE: faces in the logo's yellow, orange and red bands, block sides in purple, the letters' holes filled dark so the cabinet stays behind them. */
export const titleWord: TitleLayer = {
  x: 8,
  y: 17,
  rows: [
    ".....................................................................................................................................................yyyyyyyyyyyyyyyyyyyy.......",
    ".....................................................................................................................................................yyyyyyyyyyyyyyyyyyyyp......",
    ".................................................................................................................................................yyyyyyyyyyyyyyyyyyyyyyyyyyyy...",
    "....................................................................................................................yyyyyyyyyyyyyyyyyyyyyy.......yyyyyyyyyyyyyyyyyyyyyyyyyyyyp..",
    "....................................................................................................................yyyyyyyyyyyyyyyyyyyyyyp......yyyyyyyyyyyyyyyyyyyyyyyyyyyypp.",
    "....................................................................................................................yyyyyyyyyyyyyyyyyyyyyyyyyy...yyyyyyyyyyyyyyyyyyyyyyyyyyyyppk",
    "...........................................................................................yyyyyyyyyyyyyyyyyyyy.....yyyyyyyyyyyyyyyyyyyyyyyyyyp..yyyyyyppppppppppppppppppppppppk",
    "...........................................................................................yyyyyyyyyyyyyyyyyyyyp....yyyyyyyyyyyyyyyyyyyyyyyyyypp.yyyyyyppppppppppppppppppppppppk",
    ".........................................................................................yyyyyyyyyyyyyyyyyyyyyyyy...yyyyyyyyyyyyyyyyyyyyyyyyyyppkyyyyppppkkkkkkkkkkkkkkkkkkkkkkk",
    "............................................................yyyyyyyyyyyyyyyyyyyyyyyy.....yyyyyyyyyyyyyyyyyyyyyyyyp..yyyyyyppppppppppppppyyyyyyyykyyyyppppk......................",
    "............................................................yyyyyyyyyyyyyyyyyyyyyyyyp..yyyyyyyyppppppppppppyyyyyyyy.yyyyyyppppppppppppppyyyyyyyypooooppkkk......................",
    "..........................................................yyyyyyyyyyyyyyyyyyyyyyyyyyyy.yyyyyyyyppppppppppppyyyyyyyypyyyyyyppkkkkkkkkkkkkkpyyyyyypooooppk........................",
    "..........................................................yyyyyyyyyyyyyyyyyyyyyyyyyyyypyyyyyyppppkkkkkkkkkkkpyyyyyypyyyyyyppkkkkkkkkkkkkkkyyyyyypoooooooooooooooooooo...........",
    ".............................yyyyyyyyyyyyyyyyyyyyyyyy.....yyyyyyyyyyyyyyyyyyyyyyyyyyyypyyyyyyppppkkkkkkkkkkkkyyyyyypooooooppkkkkkkkkkkkkkkoooooopoooooooooooooooooooop..........",
    ".............................yyyyyyyyyyyyyyyyyyyyyyyyp....yyyyyyyyyyyyyyyyyyyyyyyyyyyypyyyyyyppkkkkkkkkkkkkkkyyyyyypooooooppkkkkkkkkkkkkkkoooooopoooooooooooooooooooopp.........",
    ".............................yyyyyyyyyyyyyyyyyyyyyyyyyy...yyyyyyppppppppppppppppyyyyyypyyyyyyppkkkkkkkkkkkkkkyyyyyypooooooppkkkkkkkkkkkkkkoooooopooooooooooooooooooooppk........",
    "....yyyyyyyyyyyyyyyyyyyy.....yyyyyyyyyyyyyyyyyyyyyyyyyyp..yyyyyyppppppppppppppppyyyyyypooooooppkkkkkkkkkkkkkkoooooopooooooppkkkkkkkkkkkkkkoooooopooooooooooooooooooooppk........",
    "....yyyyyyyyyyyyyyyyyyyyp....yyyyyyyyyyyyyyyyyyyyyyyyyyyy.yyyyyyppkkkkkkkkkkkkkkkppppppooooooppkkkkkkkkkkkkkkoooooopooooooppkkkkkkkkkkkkkkoooooopooooooooooooooooooooppk........",
    "..yyyyyyyyyyyyyyyyyyyyyyyy...yyyyyyyyyyyyyyyyyyyyyyyyyyyypyyyyyyppkkkkkkkkkkkkkkkkpppppooooooookkkkkkkkkkkkoooooooopooooooppkkkkkkkkkkkkkkoooooopooooppppppppppppppppppk........",
    "..yyyyyyyyyyyyyyyyyyyyyyyyp..yyyyyyppppppppppppppyyyyyyyypooooooppkkkkkkkkkkkkkkkkkkkkkoooooooopkkkkkkkkkkkoooooooopooooooppkkkkkkkkkkkkkkoooooopooooppppppppppppppppppk........",
    "yyyyyyyyppppppppppppyyyyyyyy.yyyyyyppppppppppppppyyyyyyyypooooooppkkkkkkkkkkkkkkkkkkkkkoooooooooooooooooooooooooooopooooooppkkkkkkkkkkkkkkooooooprrrrppkkkkkkkkkkkkkkkkk........",
    "yyyyyyyyppppppppppppyyyyyyyypyyyyyyppkkkkkkkkkkkkyyyyyyyypooooooppkkkkkkkkkkkkkkkkkkkkkoooooooooooooooooooooooooooopooooooppkkkkkkkkkkkkkkooooooprrrrppk........................",
    "yyyyyyppppkkkkkkkkkkkpyyyyyypyyyyyyppkkkkkkkkkkkkyyyyyyyypooooooppkkkkkkkkkkkkkkkkkkkkkoooooooooooooooooooooooooooopooooooppkkkkkkkkkkkkkkooooooprrrrrrk........................",
    "yyyyyyppppkkkkkkkkkkkkyyyyyypooooooppkkkkkkkkkkkkoooooooopooooooppkkkkkkkkkkkkkkkkkkkkkooooooooooooooooooooooooooooprrrrrrppkkkkkkkkkkkkkkrrrrrrprrrrrrp........................",
    "yyyyyyppkkkkkkkkkkkkkkyyyyyypooooooppkkkkkkkkkkkkoooooooopooooooppkkkkkkkkkkkkkkkkkkkkkooooooooooooooooooooooooooooprrrrrrppkkkkkkkkkkkkkkrrrrrrprrrrrrrrrrrrrrrrrrrrrrrrrrrr...",
    "yyyyyyppkkkkkkkkkkkkkkyyyyyypoooooooooooooooooooooooooopppooooooppkkkkkkkkkkkkkkkkkkkkkooooooooooooooooooooooooooooprrrrrrppkkkkkkkkkkkkrrrrrrrrprrrrrrrrrrrrrrrrrrrrrrrrrrrrp..",
    "ooooooppkkkkkkkkkkkkkkoooooopoooooooooooooooooooooooooopppooooooppkkkkkkkkkkkkkkkkkkkkkrrrrrrpppppppppppppppprrrrrrprrrrrrppkkkkkkkkkkkkrrrrrrrrprrrrrrrrrrrrrrrrrrrrrrrrrrrrpp.",
    "ooooooppkkkkkkkkkkkkkkoooooopooooooooooooooooooooooooppppkooooooppkkkkkkkkkkkkkkkkkkkkkrrrrrrpppppppppppppppprrrrrrprrrrrrrrrrrrrrrrrrrrrrrrrrppprrrrrrrrrrrrrrrrrrrrrrrrrrrrppk",
    "ooooooookkkkkkkkkkkkoooooooopooooooooooooooooooooooooppppkooooooppkkkkkkkkkkkkkkkkkkkkkrrrrrrppkkkkkkkkkkkkkkrrrrrrprrrrrrrrrrrrrrrrrrrrrrrrrrppppppprrrrrrrrrrrrrrrrrrrrppppppk",
    "oooooooopkkkkkkkkkkkoooooooopooooooppppppppooooooppppppkkkrrrrrrppkkkkkkkkkkkkkkkkkkkkkrrrrrrppk.............rrrrrrprrrrrrrrrrrrrrrrrrrrrrrrrrppkkkpprrrrrrrrrrrrrrrrrrrrppppppk",
    "oooooooooooooooooooooooooooopooooooppppppppooooooppppppk..rrrrrrppkkkkkkkkkkkkkkkkkkkkkrrrrrrppk.............rrrrrrprrrrrrrrrrrrrrrrrrrrrrrrrrppk...kkpppppppppppppppppppppkkkkk",
    "oooooooooooooooooooooooooooopooooooppkkkkkkkpooooookkkkk..rrrrrrppkkkkkkkkkkkkkkrrrrrrkrrrrrrppk.............rrrrrrprrrrrrrrrrrrrrrrrrrrrrppppppk......ppppppppppppppppppppk....",
    "oooooooooooooooooooooooooooopooooooppk.......oooooop......rrrrrrppkkkkkkkkkkkkkkrrrrrrprrrrrrppk.............rrrrrrprrrrrrrrrrrrrrrrrrrrrrppppppk.......kkkkkkkkkkkkkkkkkkkk....",
    "ooooooooooooooooooooooooooooprrrrrrppk.......rrrrrrpp.....rrrrrrrrrrrrrrrrrrrrrrrrrrrrprrrrrrppk.............rrrrrrpppppppppppppppppppppppppkkkkk...............................",
    "ooooooooooooooooooooooooooooprrrrrrppk.......rrrrrrppk....rrrrrrrrrrrrrrrrrrrrrrrrrrrrprrrrppppk..............prrrrppkppppppppppppppppppppppk...................................",
    "ooooooooooooooooooooooooooooprrrrrrppk........prrrrrrk....rrrrrrrrrrrrrrrrrrrrrrrrrrrrprrrrppppk...............rrrrppk.kkkkkkkkkkkkkkkkkkkkkk...................................",
    "rrrrrrpppppppppppppppprrrrrrprrrrrrppk.........rrrrrrp....rrrrrrrrrrrrrrrrrrrrrrrrrrrrpppppppkkk................pppppk..........................................................",
    "rrrrrrpppppppppppppppprrrrrrprrrrrrppk.........rrrrrrpp....prrrrrrrrrrrrrrrrrrrrrrrrppppkppppk...................ppppk..........................................................",
    "rrrrrrppkkkkkkkkkkkkkkrrrrrrprrrrrrppk.........rrrrrrppk....rrrrrrrrrrrrrrrrrrrrrrrrppppk.kkkk....................kkkk..........................................................",
    "rrrrrrppk.............rrrrrrprrrrrrppk..........prrrrrrk.....pppppppppppppppppppppppppkkk.......................................................................................",
    "rrrrrrppk.............rrrrrrprrrrrrppk...........rrrrrrp......ppppppppppppppppppppppppk.........................................................................................",
    "rrrrrrppk.............rrrrrrprrrrrrppk...........rrrrrrpp......kkkkkkkkkkkkkkkkkkkkkkkk.........................................................................................",
    "rrrrrrppk.............rrrrrrprrrrrrppk...........rrrrrrppk......................................................................................................................",
    "rrrrrrppk.............rrrrrrpppppppppk............pppppppk......................................................................................................................",
    "rrrrppppk..............prrrrppkppppppk.............ppppppk......................................................................................................................",
    "rrrrppppk...............rrrrppk.kkkkkk..............kkkkkk......................................................................................................................",
    ".pppppkkk................pppppk.................................................................................................................................................",
    "..ppppk...................ppppk.................................................................................................................................................",
    "...kkkk....................kkkk.................................................................................................................................................",
  ],
};
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
