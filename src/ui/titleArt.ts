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
  x: 12,
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
  x: 6,
  y: 47,
  rows: [
    "............................................................................................................................................................................kkkkkkkkk",
    "...................................................................................................................................................................kkkkkkkkkccccccccc",
    "..........................................................................................................................................................kkkkkkkkkcccccccccBBwBBBBBB",
    ".................................................................................................................................................kkkkkkkkkcccccccccBBwBBBBBBBBBBBBBBB",
    "........................................................................................................................................kkkkkkkkkcccccccccBBwBBBBBBBBBBBBBBBbbbbbbbbb",
    "...............................................................................................................................kkkkkkkkkcccccccccBBwBBBBBBBBBBBBBBBbbbbbbbbbnnnnnnnnn",
    ".......................................................................................................................kkkkkkkkcccccccccBBwBBBBBBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkkk",
    "..............................................................................................................kkkkkkkkkccccccccBBwBBBBBBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkkk.........",
    ".....................................................................................................kkkkkkkkkcccccccccBwBBBBBBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkkk..................",
    "............................................................................................kkkkkkkkkcccccccccBwBBBBBBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkkk...........................",
    "...................................................................................kkkkkkkkkcccccccccBwBBBBBBBBBBBBBBBBbbbbbbbbnnnnnnnnnkkkkkkkkk....................................",
    "..........................................................................kkkkkkkkkcccccccccBwBBBBBBBBBBBBBBBBbbbbbbbbbnnnnnnnnkkkkkkkkk.............................................",
    ".................................................................kkkkkkkkkcccccccccBwBBBBBBBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkk......................................................",
    "........................................................kkkkkkkkkcccccccccBwBBBBBBBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkkk..............................................................",
    "...............................................kkkkkkkkkcccccccccBwBBBBBBBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkkk.......................................................................",
    ".......................................kkkkkkkkcccccccccBwBBBBBBBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkkk................................................................................",
    "..............................kkkkkkkkkccccccccBwBBBBBBBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkkk.........................................................................................",
    ".....................kkkkkkkkkcccccccccwBBBBBBBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkkk..................................................................................................",
    "............kkkkkkkkkcccccccccwBBBBBBBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkkk...........................................................................................................",
    "...kkkkkkkkkcccccccccwBBBBBBBBBBBBBBBBBbbbbbbbbnnnnnnnnnkkkkkkkkk....................................................................................................................",
    "kkkcccccccccwBBBBBBBBBBBBBBBBBbbbbbbbbbnnnnnnnnkkkkkkkkk.............................................................................................................................",
    "cccwBBBBBBBBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkk......................................................................................................................................",
    "BBBBBBBBBBBBbbbbbbbbbnnnnnnnnnkkkkkkkkk..............................................................................................................................................",
    "BBBbbbbbbbbbnnnnnnnnnkkkkkkkkk.......................................................................................................................................................",
    "bbbnnnnnnnnnkkkkkkkkk................................................................................................................................................................",
  ],
};

/** ARCADE: faces in the logo's yellow, orange and red bands, block sides in purple. */
export const titleWord: TitleLayer = {
  x: 4,
  y: 16,
  rows: [
    "..........................................................................................................................................................yyyyyyyyyyyyyyyyyyyy.......",
    "..........................................................................................................................................................yyyyyyyyyyyyyyyyyyyyp......",
    "......................................................................................................................................................yyyyyyyyyyyyyyyyyyyyyyyyyyyy...",
    "......................................................................................................................................................yyyyyyyyyyyyyyyyyyyyyyyyyyyyp..",
    "........................................................................................................................yyyyyyyyyyyyyyyyyyyyyy........yyyyyyyyyyyyyyyyyyyyyyyyyyyypp.",
    "........................................................................................................................yyyyyyyyyyyyyyyyyyyyyyp.......yyyyyyyyyyyyyyyyyyyyyyyyyyyyppk",
    "........................................................................................................................yyyyyyyyyyyyyyyyyyyyyyyyyy....yyyyyyppppppppppppppppppppppppk",
    "..............................................................................................yyyyyyyyyyyyyyyyyyyy......yyyyyyyyyyyyyyyyyyyyyyyyyyp...yyyyyyppppppppppppppppppppppppk",
    "..............................................................................................yyyyyyyyyyyyyyyyyyyyp.....yyyyyyyyyyyyyyyyyyyyyyyyyypp..yyyyppppkkkkkkkkkkkkkkkkkkkkkkk",
    "............................................................................................yyyyyyyyyyyyyyyyyyyyyyyy....yyyyyyyyyyyyyyyyyyyyyyyyyyppk.yyyyppppk......................",
    "..............................................................yyyyyyyyyyyyyyyyyyyyyyyy......yyyyyyyyyyyyyyyyyyyyyyyyp...yyyyyyppppppppppppppyyyyyyyyk.ooooppkkk......................",
    "..............................................................yyyyyyyyyyyyyyyyyyyyyyyyp...yyyyyyyyppppppppppppyyyyyyyy..yyyyyyppppppppppppppyyyyyyyyp.ooooppk........................",
    "............................................................yyyyyyyyyyyyyyyyyyyyyyyyyyyy..yyyyyyyyppppppppppppyyyyyyyyp.yyyyyyppkkkkkkkkkkkkkpyyyyyyppoooooooooooooooooooo...........",
    "............................................................yyyyyyyyyyyyyyyyyyyyyyyyyyyyp.yyyyyyppppkkkkkkkkkkkpyyyyyyppyyyyyyppk.............yyyyyyppoooooooooooooooooooop..........",
    "..............................yyyyyyyyyyyyyyyyyyyyyyyy......yyyyyyyyyyyyyyyyyyyyyyyyyyyyppyyyyyyppppk...........yyyyyyppooooooppk.............ooooooppoooooooooooooooooooopp.........",
    "..............................yyyyyyyyyyyyyyyyyyyyyyyyp.....yyyyyyyyyyyyyyyyyyyyyyyyyyyyppyyyyyyppkkk...........yyyyyyppooooooppk.............ooooooppooooooooooooooooooooppk........",
    "..............................yyyyyyyyyyyyyyyyyyyyyyyyyy....yyyyyyppppppppppppppppyyyyyyppyyyyyyppk.............yyyyyyppooooooppk.............ooooooppooooooooooooooooooooppk........",
    "....yyyyyyyyyyyyyyyyyyyy......yyyyyyyyyyyyyyyyyyyyyyyyyyp...yyyyyyppppppppppppppppyyyyyyppooooooppk.............ooooooppooooooppk.............ooooooppooooooooooooooooooooppk........",
    "....yyyyyyyyyyyyyyyyyyyyp.....yyyyyyyyyyyyyyyyyyyyyyyyyyyy..yyyyyyppkkkkkkkkkkkkkkkpppppppooooooppk.............ooooooppooooooppk.............ooooooppooooppppppppppppppppppk........",
    "..yyyyyyyyyyyyyyyyyyyyyyyy....yyyyyyyyyyyyyyyyyyyyyyyyyyyyp.yyyyyyppk...............ppppppooooooook...........ooooooooppooooooppk.............ooooooppooooppppppppppppppppppk........",
    "..yyyyyyyyyyyyyyyyyyyyyyyyp...yyyyyyppppppppppppppyyyyyyyyppooooooppk................kkkkkoooooooop...........ooooooooppooooooppk.............oooooopprrrrppkkkkkkkkkkkkkkkkk........",
    "yyyyyyyyppppppppppppyyyyyyyy..yyyyyyppppppppppppppyyyyyyyyppooooooppk.....................ooooooooooooooooooooooooooooppooooooppk.............oooooopprrrrppk........................",
    "yyyyyyyyppppppppppppyyyyyyyyp.yyyyyyppkkkkkkkkkkkkyyyyyyyyppooooooppk.....................ooooooooooooooooooooooooooooppooooooppk.............oooooopprrrrrrk........................",
    "yyyyyyppppkkkkkkkkkkkpyyyyyyppyyyyyyppk...........yyyyyyyyppooooooppk.....................ooooooooooooooooooooooooooooppooooooppk.............oooooopprrrrrrp........................",
    "yyyyyyppppk...........yyyyyyppooooooppk...........ooooooooppooooooppk.....................oooooooooooooooooooooooooooopprrrrrrppk.............rrrrrrpprrrrrrrrrrrrrrrrrrrrrrrrrrrr...",
    "yyyyyyppkkk...........yyyyyyppooooooppk...........ooooooooppooooooppk.....................oooooooooooooooooooooooooooopprrrrrrppk.............rrrrrrpprrrrrrrrrrrrrrrrrrrrrrrrrrrrp..",
    "yyyyyyppk.............yyyyyyppooooooooooooooooooooooooooppppooooooppk.....................oooooooooooooooooooooooooooopprrrrrrppk...........rrrrrrrrpprrrrrrrrrrrrrrrrrrrrrrrrrrrrpp.",
    "ooooooppk.............ooooooppooooooooooooooooooooooooooppppooooooppk.....................rrrrrrpppppppppppppppprrrrrrpprrrrrrppk...........rrrrrrrrpprrrrrrrrrrrrrrrrrrrrrrrrrrrrppk",
    "ooooooppk.............ooooooppooooooooooooooooooooooooppppkkooooooppk.....................rrrrrrpppppppppppppppprrrrrrpprrrrrrrrrrrrrrrrrrrrrrrrrrppppkppprrrrrrrrrrrrrrrrrrrrppppppk",
    "ooooooook...........ooooooooppooooooooooooooooooooooooppppk.ooooooppk.....................rrrrrrppkkkkkkkkkkkkkkrrrrrrpprrrrrrrrrrrrrrrrrrrrrrrrrrppppk.pprrrrrrrrrrrrrrrrrrrrppppppk",
    "oooooooop...........ooooooooppooooooppppppppooooooppppppkkk.rrrrrrppk.....................rrrrrrppk.............rrrrrrpprrrrrrrrrrrrrrrrrrrrrrrrrrppkkk..kkpppppppppppppppppppppkkkkk",
    "ooooooooooooooooooooooooooooppooooooppppppppooooooppppppk...rrrrrrppk.....................rrrrrrppk.............rrrrrrpprrrrrrrrrrrrrrrrrrrrrrrrrrppk.......ppppppppppppppppppppk....",
    "ooooooooooooooooooooooooooooppooooooppkkkkkkkpooooookkkkk...rrrrrrppk.............rrrrrr..rrrrrrppk.............rrrrrrpprrrrrrrrrrrrrrrrrrrrrrppppppk........kkkkkkkkkkkkkkkkkkkk....",
    "ooooooooooooooooooooooooooooppooooooppk.......oooooop.......rrrrrrppk.............rrrrrrp.rrrrrrppk.............rrrrrrpprrrrrrrrrrrrrrrrrrrrrrppppppk................................",
    "oooooooooooooooooooooooooooopprrrrrrppk.......rrrrrrpp......rrrrrrrrrrrrrrrrrrrrrrrrrrrrpprrrrrrppk.............rrrrrrppkpppppppppppppppppppppppkkkkk................................",
    "oooooooooooooooooooooooooooopprrrrrrppk.......rrrrrrppk.....rrrrrrrrrrrrrrrrrrrrrrrrrrrrpprrrrppppk..............prrrrppk.ppppppppppppppppppppppk....................................",
    "oooooooooooooooooooooooooooopprrrrrrppk........prrrrrrk.....rrrrrrrrrrrrrrrrrrrrrrrrrrrrpprrrrppppk...............rrrrppk..kkkkkkkkkkkkkkkkkkkkkk....................................",
    "rrrrrrpppppppppppppppprrrrrrpprrrrrrppk.........rrrrrrp.....rrrrrrrrrrrrrrrrrrrrrrrrrrrrppkpppppkkk................pppppk............................................................",
    "rrrrrrpppppppppppppppprrrrrrpprrrrrrppk.........rrrrrrpp.....prrrrrrrrrrrrrrrrrrrrrrrrppppk.ppppk...................ppppk............................................................",
    "rrrrrrppkkkkkkkkkkkkkkrrrrrrpprrrrrrppk.........rrrrrrppk.....rrrrrrrrrrrrrrrrrrrrrrrrppppk..kkkk....................kkkk............................................................",
    "rrrrrrppk.............rrrrrrpprrrrrrppk..........prrrrrrk......pppppppppppppppppppppppppkkk..........................................................................................",
    "rrrrrrppk.............rrrrrrpprrrrrrppk...........rrrrrrp.......ppppppppppppppppppppppppk............................................................................................",
    "rrrrrrppk.............rrrrrrpprrrrrrppk...........rrrrrrpp.......kkkkkkkkkkkkkkkkkkkkkkkk............................................................................................",
    "rrrrrrppk.............rrrrrrpprrrrrrppk...........rrrrrrppk..........................................................................................................................",
    "rrrrrrppk.............rrrrrrppkpppppppk............pppppppk..........................................................................................................................",
    "rrrrppppk..............prrrrppk.ppppppk.............ppppppk..........................................................................................................................",
    "rrrrppppk...............rrrrppk..kkkkkk..............kkkkkk..........................................................................................................................",
    ".pppppkkk................pppppk......................................................................................................................................................",
    "..ppppk...................ppppk......................................................................................................................................................",
    "...kkkk....................kkkk......................................................................................................................................................",
  ],
};

/** Where the cabinet's 15x9 screen sits in the logo. */
export const titleScreenSpot = { x: 23, y: 13 } as const;

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
  x: 23 + i * 2,
  y: 7,
}));
export const titleButtons: readonly { x: number; y: number }[] = [
  { x: 25, y: 28 },
  { x: 32, y: 28 },
];

/** The arcade's lights twinkling in the dark behind the logo, in screen pixels: a Sweetie 16 letter and a blink phase each. */
export const titleBackLights: readonly { x: number; y: number; colour: string; phase: number }[] = [
  { x: 60, y: 6, colour: "c", phase: 0 },
  { x: 84, y: 12, colour: "y", phase: 37 },
  { x: 102, y: 4, colour: "g", phase: 71 },
  { x: 121, y: 15, colour: "B", phase: 19 },
  { x: 140, y: 7, colour: "o", phase: 53 },
  { x: 158, y: 20, colour: "c", phase: 89 },
  { x: 176, y: 9, colour: "y", phase: 11 },
  { x: 186, y: 26, colour: "g", phase: 64 },
  { x: 70, y: 24, colour: "B", phase: 45 },
  { x: 166, y: 3, colour: "w", phase: 28 },
  { x: 6, y: 10, colour: "o", phase: 80 },
  { x: 4, y: 30, colour: "c", phase: 5 },
];
