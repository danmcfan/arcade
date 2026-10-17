// Pixel-art source for Sweet Sam (ADR 0006): the maze, the bear, the four
// bees and their sleepy and waking looks, the honey drop, the honey pot, and
// the text (the score labels, READY!, the score digits and the points).
// Every sprite is rows of Sweetie 16 letters (`sweetie` in
// src/ui/sweetie16.ts, `.` is blank). scripts/gen-sweet-sam-art.ts writes them
// to src/assets/images/sweet-sam/ (`bun run art`), and
// gen-sweet-sam-art.test.ts fails when the committed PNGs drift from this file.
//
// The bear, bees, honey drop and text were imported from the Go game's PNGs
// with their shapes kept; only the colours moved into Sweetie 16. Their black
// outlines are gone (#209): the maze is black, so an outline would not show.
// Where an outline carried a shape, a darker shade of the body draws it.

import type { Direction } from "../engine/input.ts";
import type { SweetSamEnemyKind } from "../game/snapshot.ts";
import type { SweetieLetter } from "../ui/sweetie16.ts";

/** Every sprite frame is 16×16, as in the Go game. */
export const frameSize = 16;

/** bear.png's row of death frames: dazed, sinking, flat, puddle. */
export const bearDeathRow = 4;

/**
 * The bear walking, one list of frames per facing: standing, one step, the
 * other step. Facing down or up, the other step is the first one mirrored, so
 * only standing and one step are drawn. The walk cycle is stand, step, stand,
 * other step (`walkCycle`). Facing right is facing left mirrored.
 */
export const bearWalk: Readonly<Record<"down" | "up" | "left", readonly (readonly string[])[]>> = {
  down: [
    [
      "..ppp......ppp..",
      "..poprrrrrrpop..",
      "..pprrrrrrrrpp..",
      "...rrrrrrrrrr...",
      "..rrrrwrrwrrrr..",
      "..rrrrwppwrrrr..",
      "..rrrrrrrrrrrr..",
      "...rrrrrrrrrr...",
      "....pppppppp....",
      "..rprroooorrpr..",
      ".rrrproooorprrr.",
      ".rrrproooorprrr.",
      "..pprrrrrrrrpp..",
      "....rr....rr....",
      "....pp....pp....",
      "................",
    ],
    [
      "................",
      "..ppp......ppp..",
      "..poprrrrrrpop..",
      "..pprrrrrrrrpp..",
      "...rrrrrrrrrr...",
      "..rrrrwrrwrrrr..",
      "..rrrrwppwrrrr..",
      "..rrrrrrrrrrrr..",
      "..rprrrrrrrrr...",
      ".rrppppppppp....",
      ".rrprroooorpr...",
      "..pprrooooprrr..",
      "...rrrrrrrprrr..",
      "....rr....ppp...",
      "....rr..........",
      "....pp..........",
    ],
  ],
  up: [
    [
      "..ppp......ppp..",
      "..prprrrrrrprp..",
      "..pprrrrrrrrpp..",
      "...rrrrrrrrrr...",
      "..rrrrrrrrrrrr..",
      "..rrrrrrrrrrrr..",
      "..rrrrrrrrrrrr..",
      "...rrrrrrrrrr...",
      "....pppppppp....",
      "..rprrrrrrrrpr..",
      ".rrprrrrrrrrprr.",
      ".rrprrrrrrrrprr.",
      "..pprrrrrrrrpp..",
      "....rr....rr....",
      "....pp....pp....",
      "................",
    ],
    [
      "................",
      "..ppp......ppp..",
      "..prprrrrrrprp..",
      "..pprrrrrrrrpp..",
      "...rrrrrrrrrr...",
      "..rrrrrrrrrrrr..",
      "..rrrrrrrrrrrr..",
      "..rrrrrrrrrrrr..",
      "...rrrrrrrrrprr.",
      "...pppppppppprr.",
      "...rprrrrrrrpp..",
      "..rrrprrrrrrr...",
      "..rrrprrrrrrr...",
      "...ppppppprr....",
      "..........rr....",
      "..........pp....",
    ],
  ],
  left: [
    [
      "........ppp.....",
      ".....rrrpop.....",
      "....rrrrrppp....",
      "....rrrrrrrr....",
      "....rrwrrrrrr...",
      "...prrwrrrrrr...",
      "...rrrrrrrrrr...",
      "....rrrrrrrr....",
      ".....pppppp.....",
      "....rrrpprrr....",
      "....rrprrprr....",
      "....rrprrprr....",
      "....rrrpprrr....",
      ".....rrrrrr.....",
      "......pppp......",
      "................",
    ],
    [
      "................",
      "........ppp.....",
      ".....rrrpop.....",
      "....rrrrrppp....",
      "....rrrrrrrr....",
      "....rrwrrrrrr...",
      "...prrwrrrrrr...",
      "...rrrrrrrrrr...",
      "....rrrrrrrr....",
      ".....pppppp.....",
      "....rrrprrrr....",
      "....rrrprrrr....",
      "...rrpprrrrrr...",
      "...rrrr..rrrr...",
      "....ppp..ppp....",
      "................",
    ],
    [
      "................",
      "........ppp.....",
      ".....rrrpop.....",
      "....rrrrrppp....",
      "....rrrrrrrr....",
      "....rrwrrrrrr...",
      "...prrwrrrrrr...",
      "...rrrrrrrrrr...",
      "....rrrrrrrr....",
      ".....pppppp.....",
      "....rrrrprrr....",
      "....rrrrprrr....",
      "...rrrrrrpprr...",
      "...rrrr..rrrr...",
      "....ppp..ppp....",
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
export const dazedFace: readonly string[] = ["rrrrrrrrrrrr", "rrwwrpprwwrr"];
/** Where `dazedFace` goes on the standing bear. */
export const dazedFaceAt: readonly [number, number] = [2, 4];

/** The death frames after the dazed one. */
export const bearDeath: readonly (readonly string[])[] = [
  [
    "................",
    "................",
    "................",
    "................",
    "..ppp......ppp..",
    "..poprrrrrrpop..",
    "..pprrrrrrrrpp..",
    "..rrwwrpprwwrr..",
    "..rrrrrrrrrrrr..",
    "....pppppppp....",
    "..rprroooorrpr..",
    ".rrrproooorprrr.",
    "..pprrrrrrrrpp..",
    "....rr....rr....",
    "....pp....pp....",
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
    "................",
    "...ppp....ppp...",
    "..poprrrrrrpop..",
    ".pprrrrrrrrrrpp.",
    "rrrwwrrpprrwwrrr",
    "rrroooooooooorrr",
    ".pppppppppppppp.",
    "................",
  ],
  [
    "................",
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
    "..rrroooooorrr..",
    "...pppppppppp...",
    "................",
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
    "........y...y...",
    ".........y...y..",
    "..www.ww..yyy...",
    ".wwwwlwwlyyyyy..",
    ".wwwwlwwkyyyyy..",
    "..wwwkkkkyykyy..",
    "...ykkyykyyyyyy.",
    "..yyykyykyyyyyy.",
    ".yyyykkyykyyyy..",
    "..yyyykkyykyy...",
    "...yyyykkyyy....",
    "....yyyyyyy.....",
    "...y..y..y......",
    "..y..y..y.......",
    "................",
  ],
  [
    "................",
    "........y...y...",
    ".........y...y..",
    "..........yyy...",
    "...ww.wwlyyyyy..",
    "..wwwlwwkyyyyy..",
    "..wwwkkkkyykyy..",
    "...ykkyykyyyyyy.",
    "..yyykyykyyyyyy.",
    ".yyyykkyykyyyy..",
    "..yyyykkyykyy...",
    "...yyyykkyyy....",
    "....yyyyyyy.....",
    "...y..y..y......",
    "..y..y..y.......",
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
 * the bees' identities from the Go game (`SweetSamEnemyKind`), not their colours.
 */
export const beeBodies: Readonly<Record<SweetSamEnemyKind, SweetieLetter>> = {
  red: "y",
  pink: "o",
  teal: "c",
  orange: "g",
};

/** The bees' order in bees.png, one 64×96 sheet each, top to bottom. */
export const beeOrder: readonly SweetSamEnemyKind[] = ["red", "pink", "teal", "orange"];

/**
 * An eaten bee flying home: its eyes and antennae, 16×16 like the bee,
 * looking right, up and down; looking left is the first mirrored. The pupils
 * look the way it travels and the whole head leans a pixel that way.
 */
export const beeEyes: readonly (readonly string[])[] = [
  [
    "................",
    "...y..........y.",
    "....m........m..",
    ".....m......m...",
    "................",
    ".....ww....ww...",
    "....wwww..wwww..",
    "....wwbb..wwbb..",
    "....wwbb..wwbb..",
    ".....ww....ww...",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  [
    "..y..........y..",
    "...m........m...",
    "....m......m....",
    "................",
    "....bb....bb....",
    "...wbbw..wbbw...",
    "...wwww..wwww...",
    "...wwww..wwww...",
    "....ww....ww....",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
  [
    "................",
    "................",
    "..y..........y..",
    "...m........m...",
    "....m......m....",
    "................",
    "....ww....ww....",
    "...wwww..wwww...",
    "...wwww..wwww...",
    "...wbbw..wbbw...",
    "....bb....bb....",
    "................",
    "................",
    "................",
    "................",
    "................",
  ],
];

/** The direction each frame of bee-eyes.png faces: `beeEyes` with the left look added second. */
export const beeEyesOrder: readonly Direction[] = ["RIGHT", "LEFT", "UP", "DOWN"];

/** A sleepy bee: bright silver, grey wings with white veins, eyes shut. */
export const sleepyLook = { body: "l", wings: "m", veins: "w" } as const;

/** A sleepy bee about to wake: white, silver wings with grey veins, eyes wide open. Alternates with the sleepy look. */
export const wakingLook = { body: "w", wings: "l", veins: "m" } as const;

/** Honey drop and honey pot cells: 8×12, 4 frames, as in the Go game. */
export const itemCellWidth = 8;
export const itemCellHeight = 12;

/** How far each of the 4 frames lifts a honey drop or honey pot off its shadow (it bobs). */
export const itemBob: readonly number[] = [0, 1, 2, 1];

/** A honey drop, 2×2, plain honey: the Go dot's size and place. */
export const honeyDropArt: readonly string[] = ["yy", "yy"];
/** Its top row in the cell before bobbing, and its shadow. */
export const honeyDropTop = 5;
export const honeyDropShadow: readonly string[] = ["mm"];
export const honeyDropShadowTop = 8;

/** A honey pot, 6×7: a jar of honey with a red lid and a glint, a drop of honey in the air above it. */
export const honeyPotArt: readonly string[] = [".y....", "..y...", ".rrrr.", "oyyyyo", "oywyyo", "oyyyyo", ".oooo."];
export const honeyPotTop = 2;
export const honeyPotShadow: readonly string[] = ["mmmm"];
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
 * tulip, sunflower, coral daisy, forget-me-not, daisy, bluebell, rainbow
 * bloom. Each has its own main colour so no two read alike.
 * 16×16 with no outline: the maze is black, so an outline would not show.
 * They also make the level counter, a row of the levels' flowers.
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
    ".yyyyddddddyyyy.",
    ".yyydkdkdkddyyy.",
    ".yyyddkdkdkdyyy.",
    ".yyyyddddddyyyy.",
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
    "..ooorrrrrrooo..",
    ".ooorryrryrrooo.",
    ".ooorrrrrrrrooo.",
    "..ooorrrrrrooo..",
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
    "......cccc......",
    "...cc.cccc.cc...",
    "..cccccccccccc..",
    "..ctcwwwwwwctc..",
    ".ccctwyyyywtccc.",
    ".ccctwyyyywtccc.",
    "..ctcwwwwwwctc..",
    "..cccccccccccc..",
    "...cc.cccc.cc...",
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
    "......bbbb......",
    "....bbBBbbbb....",
    "...bbBbbbbbbn...",
    "..bbBbbwwbbbbn..",
    "..bbBbwyywbbbn..",
    "..bbbbbwwbbbbn..",
    "..nbbbbbbbbbnn..",
    "...nbnbbbbnbn...",
    "....n.n..n.n....",
    ".......GG.......",
    "..GG...GG...GG..",
    "..GGG..GG..GGG..",
    "...GGGGGGGGGG...",
    ".......GG.......",
  ],
  [
    "................",
    "................",
    "......rrrr......",
    "...pp.rrrr.oo...",
    "..pppprrrroooo..",
    "..pppwwwwwwooo..",
    ".bbbbwyyyywyyyy.",
    ".bbbbwyyyywyyyy.",
    "..BBBwwwwwwggg..",
    "..BBBBccccgggg..",
    "...BB.cccc.gg...",
    ".......GG.......",
    "..GG...GG...GG..",
    "..GGG..GG..GGG..",
    "...GGGGGGGGGG...",
    ".......GG.......",
  ],
];

/**
 * The red bee's wing tearing on a nail in the intermissions (#199, after
 * Pac-Man's torn Blinky), drawn facing right like `beeFlight`; facing left
 * is each frame mirrored. stretch: the nail holds the back of the wing, which
 * thins to a strand as the bee pulls 2, 4, then 7 px away (wider frames, the
 * extra width behind the bee). torn: the back of the wing gone, a ragged edge
 * with loose fibres, wings up and down. patched: the wing mended in grey with
 * red stitches (Act III). crawl: grounded, wing stub, legs paddling flat along
 * the floor, with the thread to the torn wing it drags trailing off the back
 * (24 px wide).
 */
export const beeTear: Readonly<Record<"stretch" | "torn" | "patched" | "crawl", readonly (readonly string[])[]>> = {
  stretch: [
    [
      "..................",
      "..........y...y...",
      "...........y...y..",
      "....www.ww..yyy...",
      ".lwwwwwlwwlyyyyy..",
      "..wwwwwlwwkyyyyy..",
      "....wwwkkkkyykyy..",
      ".....ykkyykyyyyyy.",
      "....yyykyykyyyyyy.",
      "...yyyykkyykyyyy..",
      "....yyyykkyykyy...",
      ".....yyyykkyyy....",
      "......yyyyyyy.....",
      ".....y..y..y......",
      "....y..y..y.......",
      "..................",
    ],
    [
      "....................",
      "............y...y...",
      ".............y...y..",
      "......www.ww..yyy...",
      ".llwwwwwwlwwlyyyyy..",
      "...wwwwwwlwwkyyyyy..",
      "......wwwkkkkyykyy..",
      ".......ykkyykyyyyyy.",
      "......yyykyykyyyyyy.",
      ".....yyyykkyykyyyy..",
      "......yyyykkyykyy...",
      ".......yyyykkyyy....",
      "........yyyyyyy.....",
      ".......y..y..y......",
      "......y..y..y.......",
      "....................",
    ],
    [
      ".......................",
      "...............y...y...",
      "................y...y..",
      ".........www.ww..yyy...",
      ".llllwwwwwwwlwwlyyyyy..",
      "....wwwwwwwwlwwkyyyyy..",
      ".........wwwkkkkyykyy..",
      "..........ykkyykyyyyyy.",
      ".........yyykyykyyyyyy.",
      "........yyyykkyykyyyy..",
      ".........yyyykkyykyy...",
      "..........yyyykkyyy....",
      "...........yyyyyyy.....",
      "..........y..y..y......",
      ".........y..y..y.......",
      ".......................",
    ],
  ],
  torn: [
    [
      "................",
      "........y...y...",
      ".........y...y..",
      "....w.ww..yyy...",
      "...lllwwlyyyyy..",
      "....wlwwkyyyyy..",
      "...llkkkkyykyy..",
      "...ykkyykyyyyyy.",
      "..yyykyykyyyyyy.",
      ".yyyykkyykyyyy..",
      "..yyyykkyykyy...",
      "...yyyykkyyy....",
      "....yyyyyyy.....",
      "...y..y..y......",
      "..y..y..y.......",
      "................",
    ],
    [
      "................",
      "........y...y...",
      ".........y...y..",
      "..........yyy...",
      "...ll.wwlyyyyy..",
      "....wlwwkyyyyy..",
      "...llkkkkyykyy..",
      "...ykkyykyyyyyy.",
      "..yyykyykyyyyyy.",
      ".yyyykkyykyyyy..",
      "..yyyykkyykyy...",
      "...yyyykkyyy....",
      "....yyyyyyy.....",
      "...y..y..y......",
      "..y..y..y.......",
      "................",
    ],
  ],
  patched: [
    [
      "................",
      "........y...y...",
      ".........y...y..",
      "..lwr.ww..yyy...",
      ".lwlrlwwlyyyyy..",
      ".wlwrlwwkyyyyy..",
      "..wlrkkkkyykyy..",
      "...ykkyykyyyyyy.",
      "..yyykyykyyyyyy.",
      ".yyyykkyykyyyy..",
      "..yyyykkyykyy...",
      "...yyyykkyyy....",
      "....yyyyyyy.....",
      "...y..y..y......",
      "..y..y..y.......",
      "................",
    ],
    [
      "................",
      "........y...y...",
      ".........y...y..",
      "..........yyy...",
      "...lr.wwlyyyyy..",
      "..lwrlwwkyyyyy..",
      "..wlrkkkkyykyy..",
      "...ykkyykyyyyyy.",
      "..yyykyykyyyyyy.",
      ".yyyykkyykyyyy..",
      "..yyyykkyykyy...",
      "...yyyykkyyy....",
      "....yyyyyyy.....",
      "...y..y..y......",
      "..y..y..y.......",
      "................",
    ],
  ],
  crawl: [
    [
      "........................",
      "........................",
      "................y...y...",
      ".................y...y..",
      "............w.ww..yyy...",
      "...........lllwwlyyyyy..",
      "............wlwwkyyyyy..",
      "...........llkkkkyykyy..",
      "...........ykkyykyyyyyy.",
      "..........yyykyykyyyyyy.",
      ".........yyyykkyykyyyy..",
      "..........yyyykkyykyy...",
      "...........yyyykkyyy....",
      "llllllllllllyyyyyyy.....",
      "..........y.y..y........",
      ".........y.y..y.........",
    ],
    [
      "........................",
      "........................",
      "................y...y...",
      ".................y...y..",
      "............w.ww..yyy...",
      "...........lllwwlyyyyy..",
      "............wlwwkyyyyy..",
      "...........llkkkkyykyy..",
      "...........ykkyykyyyyyy.",
      "..........yyykyykyyyyyy.",
      ".........yyyykkyykyyyy..",
      "..........yyyykkyykyy...",
      "...........yyyykkyyy....",
      "llllllllllllyyyyyyy.....",
      ".........y..y.y.........",
      "........y..y..y.........",
    ],
  ],
};

/** The torn piece of wing, fluttering down and then dragged; its flutter frame is this flipped top to bottom. */
export const tornWing: readonly string[] = [".www..", "wwlww.", "wwlwwl", ".wlw.."];

/** A dust puff where the grounded bee scrapes along, rising and thinning over 3 frames. */
export const dustPuff: readonly (readonly string[])[] = [
  ["...", ".l.", "lml"],
  [".l.", "l.l", "m.m"],
  ["l...l", ".....", "m...m"],
];

/** The nail the bee's wing snags on in Act II: a head and a shaft standing on the floor. */
export const nailArt: readonly string[] = [
  "lll",
  ".m.",
  ".m.",
  ".m.",
  ".m.",
  ".m.",
  ".m.",
  ".m.",
  ".m.",
  ".m.",
  ".m.",
  ".m.",
  ".m.",
  ".m.",
  ".m.",
  ".m.",
  ".m.",
  "mmm",
];

/**
 * intermission.png's layout. The top two rows are `beeTear`'s frames in
 * `tearCellWidth`-wide cells, the bee at the cell's front end and anything
 * wider behind it: facing right, then facing left. The third row is the props
 * in `propCellWidth`×`propCellHeight` cells, each standing on the cell's
 * bottom edge (the floor), centred: `tornWing` and its flutter, `dustPuff`'s
 * three frames, then `nailArt`.
 */
export const tearCellWidth = 24;
export const propCellWidth = 8;
export const propCellHeight = 18;
/** The first column of each `beeTear` entry in intermission.png. */
export const tearColumn = { stretch: 0, torn: 3, patched: 5, crawl: 7 } as const;
/** The column of each prop in intermission.png's prop row. */
export const propColumn = { wing: 0, dust: 2, nail: 5 } as const;
