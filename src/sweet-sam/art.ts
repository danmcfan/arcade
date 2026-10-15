// Pixel-art source for Sweet Sam (ADR 0006): the maze, the bear, the four
// bees and their sleepy and waking looks, the honey drop, the honey pot, and
// the text (the score labels, READY!, the score digits and the points).
// Every sprite is rows of Sweetie 16 letters (`sweetie` in
// src/ui/sweetie16.ts, `.` is blank). scripts/gen-sweet-sam-art.ts writes them
// to src/assets/images/sweet-sam/ (`bun run art`), and
// gen-sweet-sam-art.test.ts fails when the committed PNGs drift from this file.
//
// The bear, bees, honey drop and text were imported from the Go game's PNGs
// with their shapes kept; only the colours moved into Sweetie 16.

import type { SweetSamEnemyKind } from "../game/snapshot.ts";
import type { SweetieLetter } from "../ui/sweetie16.ts";

/** Every sprite frame is 16×16, as in the Go game. */
export const frameSize = 16;

/**
 * The bear walking, one list of frames per facing: standing, one step, the
 * other step. Facing down or up, the other step is the first one mirrored, so
 * only standing and one step are drawn. The walk cycle is stand, step, stand,
 * other step (`walkCycle`). Facing right is facing left mirrored.
 */
export const bearWalk: Readonly<Record<"down" | "up" | "left", readonly (readonly string[])[]>> = {
  down: [
    [
      "..kkk......kkk..",
      "..kokkkkkkkkok..",
      "..kkrrrrrrrrkk..",
      "...krrrrrrrrk...",
      "..krrrwrrwrrrk..",
      "..krrrwkkwrrrk..",
      "..krrrrrrrrrrk..",
      "...krrrrrrrrk...",
      "....kkkkkkkk....",
      "..kkrroooorrkk..",
      ".krrkroooorkrrk.",
      ".krrkroooorkrrk.",
      "..kkrrrrrrrrkk..",
      "...krrkkkkrrk...",
      "....kk....kk....",
      "................",
    ],
    [
      "................",
      "..kkk......kkk..",
      "..kokkkkkkkkok..",
      "..kkrrrrrrrrkk..",
      "...krrrrrrrrk...",
      "..krrrwrrwrrrk..",
      "..krrrwkkwrrrk..",
      "..krrrrrrrrrrk..",
      "..kkrrrrrrrrk...",
      ".krkkkkkkkkk....",
      ".krkrroooorkk...",
      "..kkrrooookrrk..",
      "...krrrrrrkrrk..",
      "...krrkkkkkkk...",
      "...krrk.........",
      "....kk..........",
    ],
  ],
  up: [
    [
      "..kkk......kkk..",
      "..krkkkkkkkkrk..",
      "..kkrrrrrrrrkk..",
      "...krrrrrrrrk...",
      "..krrrrrrrrrrk..",
      "..krrrrrrrrrrk..",
      "..krrrrrrrrrrk..",
      "...krrrrrrrrk...",
      "....kkkkkkkk....",
      "..kkrrrrrrrrkk..",
      ".krkrrrrrrrrkrk.",
      ".krkrrrrrrrrkrk.",
      "..kkrrrrrrrrkk..",
      "...krrkkkkrrk...",
      "....kk....kk....",
      "................",
    ],
    [
      "................",
      "..kkk......kkk..",
      "..krkkkkkkkkrk..",
      "..kkrrrrrrrrkk..",
      "...krrrrrrrrk...",
      "..krrrrrrrrrrk..",
      "..krrrrrrrrrrk..",
      "..krrrrrrrrrrk..",
      "...krrrrrrrrkkk.",
      "...kkkkkkkkkkrk.",
      "...kkrrrrrrrkk..",
      "..krrkrrrrrrk...",
      "..krrkrrrrrrk...",
      "...kkkkkkkrrk...",
      ".........krrk...",
      "..........kk....",
    ],
  ],
  left: [
    [
      "........kkk.....",
      ".....kkkkok.....",
      "....krrrrkkk....",
      "....krrrrrrk....",
      "....krwrrrrrk...",
      "...krrwrrrrrk...",
      "...krrrrrrrrk...",
      "....krrrrrrk....",
      ".....kkkkkk.....",
      "....krrkkrrk....",
      "....krkrrkrk....",
      "....krkrrkrk....",
      "....krrkkrrk....",
      ".....krrrrk.....",
      "......kkkk......",
      "................",
    ],
    [
      "................",
      "........kkk.....",
      ".....kkkkok.....",
      "....krrrrkkk....",
      "....krrrrrrk....",
      "....krwrrrrrk...",
      "...krrwrrrrrk...",
      "...krrrrrrrrk...",
      "....krrrrrrk....",
      ".....kkkkkk.....",
      "....krrkrrrk....",
      "....krrkrrrk....",
      "...krkkrrrrrk...",
      "...krrrkkrrrk...",
      "....kkk..kkk....",
      "................",
    ],
    [
      "................",
      "........kkk.....",
      ".....kkkkok.....",
      "....krrrrkkk....",
      "....krrrrrrk....",
      "....krwrrrrrk...",
      "...krrwrrrrrk...",
      "...krrrrrrrrk...",
      "....krrrrrrk....",
      ".....kkkkkk.....",
      "....krrrkrrk....",
      "....krrrkrrk....",
      "...krrrrrkkrk...",
      "...krrrkkrrrk...",
      "....kkk..kkk....",
      "................",
    ],
  ],
};

/** Which of a facing's frames each of the 4 walk frames shows. */
export const walkCycle: readonly number[] = [0, 1, 0, 2];

/**
 * The bear caught by a bee, one frame per beat: dazed (the standing bear with
 * `dazedFace` over its eyes), then sinking, squashed flat, and a puddle with
 * stars. Drawn below the walk rows; not played yet (#47).
 */
export const dazedFace: readonly string[] = ["krrrrrrrrrrk", "krwwrkkrwwrk"];
/** Where `dazedFace` goes on the standing bear. */
export const dazedFaceAt: readonly [number, number] = [2, 4];

/** The death frames after the dazed one. */
export const bearDeath: readonly (readonly string[])[] = [
  [
    "................",
    "................",
    "................",
    "..kkk......kkk..",
    "..kokkkkkkkkok..",
    "..kkrrrrrrrrkk..",
    "..krwwrkkrwwrk..",
    "..krrrrrrrrrrk..",
    "....kkkkkkkk....",
    "..kkrroooorrkk..",
    ".krrkroooorkrrk.",
    "..kkrrrrrrrrkk..",
    "...krrkkkkrrk...",
    "....kk....kk....",
    "................",
    "................",
  ],
  [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "...kkk....kkk...",
    "..kokkkkkkkkok..",
    ".kkrrrrrrrrrrkk.",
    "krrwwrrkkrrwwrrk",
    "krroooooooooorrk",
    ".kkkkkkkkkkkkkk.",
    "................",
    "................",
  ],
  [
    "................",
    "................",
    "....y......y....",
    "...ywy....ywy...",
    "....y......y....",
    "................",
    "................",
    "........y.......",
    ".......ywy......",
    "........y.......",
    "................",
    "................",
    "................",
    "...kkkkkkkkkk...",
    "..krroooooorrk..",
    "...kkkkkkkkkk...",
  ],
];

/**
 * A bee flying right, wings up and wings down. `y` is the body (each bee
 * recolours it), `w` the wings; facing left is this
 * mirrored. Its 4 wing beats are these two, then these two again lifted by
 * `beeBob`.
 */
export const beeFlight: readonly (readonly string[])[] = [
  [
    "................",
    "........k...k...",
    ".........k...k..",
    "..kkk.kk..kkk...",
    ".kwwwkwwkkyyyk..",
    ".kwwwkwwkyyyyk..",
    "..kwwkkkkyykyk..",
    "...kkkyykyyyyyk.",
    "..kyykyykyyyyyk.",
    ".kkyykkyykyyyk..",
    "..kyyykkyykyk...",
    "...kyyykkyyk....",
    "....kkkkkkk.....",
    "...k..k..k......",
    "..k..k..k.......",
    "................",
  ],
  [
    "................",
    "........k...k...",
    ".........k...k..",
    "..........kkk...",
    "...kk.kkkkyyyk..",
    "..kwwkwwkyyyyk..",
    "..kwwkkkkyykyk..",
    "...kkkyykyyyyyk.",
    "..kyykyykyyyyyk.",
    ".kkyykkyykyyyk..",
    "..kyyykkyykyk...",
    "...kyyykkyyk....",
    "....kkkkkkk.....",
    "...k..k..k......",
    "..k..k..k.......",
    "................",
  ],
];

/** Which `beeFlight` frame each of the 4 wing beats shows, and how far up it is lifted. */
export const beeBeats: readonly { frame: number; bob: number }[] = [
  { frame: 0, bob: 0 },
  { frame: 1, bob: 0 },
  { frame: 0, bob: 1 },
  { frame: 1, bob: 1 },
];

/**
 * The bee's eye in `beeFlight`: the pupil, a dark pixel in the body, as in
 * the Go bee. The sleepy look shuts it, the waking look opens it wide.
 */
export const beeEye: readonly [number, number] = [11, 6];

/**
 * Each bee's body colour, so the player can tell the four apart. The keys are
 * the bees' identities from the Go game (`SweetSamEnemyKind`, which the
 * parity traces record), not their colours.
 */
export const beeBodies: Readonly<Record<SweetSamEnemyKind, SweetieLetter>> = {
  red: "y",
  pink: "o",
  teal: "c",
  orange: "g",
};

/** The bees' order in bees.png, one 64×96 sheet each, top to bottom. */
export const beeOrder: readonly SweetSamEnemyKind[] = ["red", "pink", "teal", "orange"];

/** A sleepy bee: grey, wings dull, eyes shut. */
export const sleepyLook = { body: "m", wings: "l" } as const;

/** A sleepy bee about to wake: pale, eyes wide open. Alternates with the sleepy look. */
export const wakingLook = { body: "w", wings: "l" } as const;

/** Honey drop and honey pot cells: 8×12, 4 frames, as in the Go game. */
export const itemCellWidth = 8;
export const itemCellHeight = 12;

/** How far each of the 4 frames lifts a honey drop or honey pot off its shadow (it bobs). */
export const itemBob: readonly number[] = [0, 1, 2, 1];

/** A honey drop, 2×2, plain honey: the Go dot's size and place. */
export const honeyDropArt: readonly string[] = ["yy", "yy"];
/** Its top row in the cell before bobbing, and its shadow. */
export const honeyDropTop = 5;
export const honeyDropShadow: readonly string[] = ["dd"];
export const honeyDropShadowTop = 8;

/** A honey pot, 6×7: a jar of honey with a red lid and a glint, a drop of honey in the air above it. */
export const honeyPotArt: readonly string[] = [".y....", "......", ".rrrr.", "oyyyyo", "oywyyo", "oyyyyo", ".oooo."];
export const honeyPotTop = 2;
export const honeyPotShadow: readonly string[] = ["dddd"];
export const honeyPotShadowTop = 10;

/** The maze image, the size of the playfield. */
export const mazeWidth = 224;
export const mazeHeight = 288;

/**
 * The maze, one letter per 8×8 tile (28×36), traced from the Go game's maze so
 * every corridor, corner, the tunnel and the bee home stay where the game
 * expects them:
 *
 * - `.` corridor. The corridor is 16 px wide: wax stops 4 px short of it.
 * - `#` wax: solid yellow, an orange border, rounded outer corners.
 * - `h` the bee home, `=` its door.
 * - ` ` the score rows above and the lives row below: plain background.
 */
export const mazeTiles: readonly string[] = [
  "                            ",
  "                            ",
  "                            ",
  "############################",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#.####.#####.##.#####.####.#",
  "#.####.#####.##.#####.####.#",
  "#..........................#",
  "#.####.##.########.##.####.#",
  "#.####.##.########.##.####.#",
  "#......##....##....##......#",
  "######.#####.##.#####.######",
  "######.#####.##.#####.######",
  "######.##..........##.######",
  "######.##.###==###.##.######",
  "######.##.#hhhhhh#.##.######",
  "..........#hhhhhh#..........",
  "######.##.#hhhhhh#.##.######",
  "######.##.########.##.######",
  "######.##..........##.######",
  "######.##.########.##.######",
  "######.##.########.##.######",
  "#............##............#",
  "#.####.#####.##.#####.####.#",
  "#.####.#####.##.#####.####.#",
  "#...##................##...#",
  "###.##.##.########.##.##.###",
  "###.##.##.########.##.##.###",
  "#......##....##....##......#",
  "#.##########.##.##########.#",
  "#.##########.##.##########.#",
  "#..........................#",
  "############################",
  "                            ",
  "                            ",
];

/** How far wax stops short of a corridor tile, in pixels. */
export const corridorMargin = 4;

/** The wax inside its rim: solid yellow. */
export const waxFill: SweetieLetter = "y";

/** Wax next to the background: an orange border `waxRimWidth` px wide. */
export const waxRim: SweetieLetter = "o";
export const waxRimWidth = 1;

/**
 * How round the wax's outer corners are: a corner pixel is cut when its
 * distances to the nearest left/right and up/down edges (1 at the edge,
 * capped at this) sum to 3 or less, which chops a 3-pixel triangle.
 */
export const waxCornerCap = 4;

/**
 * The level-clear flash (#47): the maze alternates with itself in these
 * colours, the wax white with a light grey border.
 */
export const waxFlashFill: SweetieLetter = "w";
export const waxFlashRim: SweetieLetter = "l";

/** Behind everything: the dark of the hive. */
export const mazeBackground: SweetieLetter = "k";

/** The bee home's door: a bar across the bottom of the door tiles. */
export const doorBar: SweetieLetter = "w";
export const doorBarRows: readonly number[] = [5, 6];

/**
 * "1UP" and "HIGH SCORE", baked into the maze's top row as the Go maze had
 * them, in the Go game's thick lettering (imported from its maze image). Its
 * left edge is at x `scoreLabelsX`.
 */
export const scoreLabelsArt: readonly string[] = [
  "..ww...ww...ww.wwwwww..........................ww...ww..wwwwww...wwwww.ww...ww..........wwww.....wwww...wwwww..wwwwww...wwwwww",
  ".www...ww...ww.ww...ww.........................ww...ww....ww....ww.....ww...ww.........ww..ww...ww..ww.ww...ww.ww...ww..ww....",
  "..ww...ww...ww.ww...ww.........................ww...ww....ww...ww......ww...ww.........ww......ww......ww...ww.ww...ww..ww....",
  "..ww...ww...ww.ww...ww.........................wwwwwww....ww...ww..www.wwwwwww..........wwwww..ww......ww...ww.ww..www..wwwww.",
  "..ww...ww...ww.wwwwww..........................ww...ww....ww...ww...ww.ww...ww..............ww.ww......ww...ww.wwwww....ww....",
  "..ww...ww...ww.ww..............................ww...ww....ww....ww..ww.ww...ww.........ww...ww..ww..ww.ww...ww.ww.www...ww....",
  "wwwwww..wwwww..ww..............................ww...ww..wwwwww...wwwww.ww...ww..........wwwww....wwww...wwwww..ww..www..wwwwww",
];
export const scoreLabelsX = 26;

/** READY!, six 8×8 letters that each ride the wave, imported from the Go game's ready.png. */
export const readyArt: readonly string[] = [
  ".yyyyyy...yyyyyy...yyy...yyyyy....yy..yy....yyy.",
  ".yy...yy..yy......yy.yy..yy..yy...yy..yy....yyy.",
  ".yy...yy..yy.....yy...yy.yy...yy..yy..yy...yyy..",
  ".yy..yyy..yyyyy..yy...yy.yy...yy...yyyy....yy...",
  ".yyyyy....yy.....yyyyyyy.yy...yy....yy.....y....",
  ".yy.yyy...yy.....yy...yy.yy..yy.....yy..........",
  ".yy..yyy..yyyyyy.yy...yy.yyyyy......yy....y.....",
  "................................................",
];

/** The score dials' 0 to 9, 8×8 each, imported from the Go game's digits.png. */
export const dialDigitsArt: readonly string[] = [
  "...www......ww....wwwww...wwwwww....www..wwwwww....wwww..wwwwwww..wwww....wwwww.",
  "..w..ww....www...ww...ww.....ww....wwww..ww.......ww.....ww...ww.ww...w..ww...ww",
  ".ww...ww....ww.......www....ww....ww.ww..wwwwww..ww..........ww..www..w..ww...ww",
  ".ww...ww....ww.....wwww....wwww..ww..ww.......ww.wwwwww.....ww....wwww....wwwwww",
  ".ww...ww....ww....wwww........ww.wwwwwww......ww.ww...ww...ww....w..wwww......ww",
  "..ww..w.....ww...www.....ww...ww.....ww..ww...ww.ww...ww...ww....w....ww.....ww.",
  "...www....wwwwww.wwwwwww..wwwww......ww...wwwww...wwwww....ww.....wwwww...wwww..",
  "................................................................................",
];

/**
 * The points for eating a sleepy bee, 200, 400, 800 and 1600, side by side in
 * 16 px cells: the Go game's bonus.png, its teal now white. They sit
 * `pointsTop` rows down a 16×16 popup frame, as in Go.
 */
export const pointsArt: readonly string[] = [
  "..ww...ww...ww......w..ww...ww....ww...ww...ww..w..ww...ww...ww.",
  ".w..w.w..w.w..w....ww.w..w.w..w..w..w.w..w.w..w.w.w..w.w..w.w..w",
  ".w..w.w..w.w..w...w.w.w..w.w..w..w..w.w..w.w..w.w.w....w..w.w..w",
  "...w..w..w.w..w..w..w.w..w.w..w...ww..w..w.w..w.w.www..w..w.w..w",
  "..w...w..w.w..w..wwww.w..w.w..w..w..w.w..w.w..w.w.w..w.w..w.w..w",
  ".w....w..w.w..w.....w.w..w.w..w..w..w.w..w.w..w.w.w..w.w..w.w..w",
  ".wwww..ww...ww......w..ww...ww....ww...ww...ww..w..ww...ww...ww.",
];
export const pointsTop = 4;
export const pointsFrameSize = 16;

/**
 * The bonus flowers (#47, #68), one per kind on Pac-Man's fruit table, in
 * order of points (`flowerKind` in flower.ts picks the level's): violet,
 * tulip, sunflower, coral daisy, forget-me-not, daisy, bluebell, golden rose. 16×16 with no outline: the maze is black, so an outline
 * would not show. They also make the level counter, a row of the levels' flowers.
 */
export const flowers: readonly (readonly string[])[] = [
  [
    "................",
    "................",
    "...ppp....ppp...",
    "..ppppp..ppppp..",
    "..pppppppppppp..",
    ".ppppppwwpppppp.",
    ".pppppwyywppppp.",
    ".ppppwyyyywpppp.",
    ".pppppwyywppppp.",
    "..pppppwwppppp..",
    "...pppppppppp...",
    ".......GG.......",
    "..GG...GG...GG..",
    "..GGG..GG..GGG..",
    "...GGGGGGGGGG...",
    ".......GG.......",
  ],
  [
    "................",
    "................",
    "..r...rrrr...r..",
    ".rr..rrrrrr..rr.",
    ".rrr.rrrrrr.rrr.",
    ".rrrrrrrrrrrrrr.",
    ".rrrrrroorrrrrr.",
    ".rrrrroooorrrrr.",
    "..rrrroooorrrr..",
    "...rrrrrrrrrr...",
    ".....rrrrrr.....",
    ".......GG.......",
    "..GG...GG...GG..",
    "..GGG..GG..GGG..",
    "...GGGGGGGGGG...",
    ".......GG.......",
  ],
  [
    "................",
    "................",
    "....y..yy..y....",
    "..y.yyyyyyyy.y..",
    "..yyyyyyyyyyyy..",
    ".yyyyooooooyyyy.",
    ".yyyorooooroyyy.",
    ".yyyooroorooyyy.",
    ".yyyyooooooyyyy.",
    "..yyyyyyyyyyyy..",
    "...yyyyyyyyyy...",
    ".......GG.......",
    "..GG...GG...GG..",
    "..GGG..GG..GGG..",
    "...GGGGGGGGGG...",
    ".......GG.......",
  ],
  [
    "................",
    "................",
    "......oooo......",
    "...oo.oooo.oo...",
    "..oooooooooooo..",
    "..oooyyyyyyooo..",
    ".oooyyryyryyooo.",
    ".oooyyyyyyyyooo.",
    "..oooyyyyyyooo..",
    "..oooooooooooo..",
    "...oo.oooo.oo...",
    ".......GG.......",
    "..GG...GG...GG..",
    "...GGG.GG.GGG...",
    "....GGGGGGGG....",
    ".......GG.......",
  ],
  [
    "................",
    "................",
    "......BBBB......",
    "...BB.BBBB.BB...",
    "..BBBBBBBBBBBB..",
    "..BBBwwwwwwBBB..",
    ".BBBwwyyyywwBBB.",
    ".BBBwyyyyyywBBB.",
    "..BBBwwwwwwBBB..",
    "..BBBBBBBBBBBB..",
    "...BB.BBBB.BB...",
    ".......GG.......",
    "..GG...GG...GG..",
    "...GGG.GG.GGG...",
    "....GGGGGGGG....",
    ".......GG.......",
  ],
  [
    "................",
    "................",
    "....w.w..w.w....",
    "..w.wlwwwwlw.w..",
    "..wwwwwwwwwwww..",
    ".wwwwwyyyywwwww.",
    ".lwwwyyoyyywwwl.",
    ".wwwwyyyyoywwww.",
    "..wwwwyyyywwww..",
    "...wlwwwwwwlw...",
    ".....w.ww.w.....",
    ".......GG.......",
    "..GG...GG...GG..",
    "..GGG..GG..GGG..",
    "...GGGGGGGGGG...",
    ".......GG.......",
  ],
  [
    "................",
    "................",
    "......cccc......",
    "....ccBBBBcc....",
    "...cBBBBBBBBc...",
    "..cBBBBwwBBBBc..",
    "..cBBBwyywBBBc..",
    "..cBBBBwwBBBBc..",
    "..cBBBBBBBBBBc..",
    "...cBcBBBBcBc...",
    "....c.c..c.c....",
    ".......GG.......",
    "..GG...GG...GG..",
    "..GGG..GG..GGG..",
    "...GGGGGGGGGG...",
    ".......GG.......",
  ],
  [
    "................",
    "................",
    ".....oooooo.....",
    "...ooyyyyyyoo...",
    "..oyyoooooyyyo..",
    ".oyyoyyyyyoyyyo.",
    ".oyoyyoooyyoyyo.",
    ".oyoyoyywyoyyyo.",
    ".oyyoyooooyyyo..",
    "..oyyoyyyyyoo...",
    "...oooooooo.....",
    ".......GG.......",
    "..GG...GG...GG..",
    "..GGG..GG..GGG..",
    "...GGGGGGGGGG...",
    ".......GG.......",
  ],
];
