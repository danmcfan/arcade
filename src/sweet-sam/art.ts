// Pixel-art source for Sweet Sam (ADR 0006): the maze, the bear, the four
// bees and their sleepy and waking looks, the honey drop, the smoke pot and
// the bonus flower. Every sprite is rows of Sweetie 16 letters (`sweetie` in
// src/ui/sweetie16.ts, `.` is blank). scripts/gen-sweet-sam-art.ts writes them
// to src/assets/images/sweet-sam/ (`bun run art`), and
// gen-sweet-sam-art.test.ts fails when the committed PNGs drift from this file.
//
// The bear, bees and food were imported from the Go game's PNGs with their
// shapes kept; only the colours moved into Sweetie 16.

import type { SweetSamEnemyKind } from "../game/snapshot.ts";
import type { SweetieLetter } from "../ui/sweetie16.ts";

/** Every sprite frame is 16×16, as in the Go game. */
export const frameSize = 16;

/**
 * The bear walking, one list of frames per facing, standing frame first. The
 * walk cycle is stand, step, stand, other step (`walkCycle`). Facing right is
 * facing left mirrored.
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
    [
      "................",
      "..kkk......kkk..",
      "..kokkkkkkkkok..",
      "..kkrrrrrrrrkk..",
      "...krrrrrrrrk...",
      "..krrrwrrwrrrk..",
      "..krrrwkkwrrrk..",
      "..krrrrrrrrrrk..",
      "...krrrrrrrrkk..",
      "....kkkkkkkkkrk.",
      "...kkroooorrkrk.",
      "..krrkoooorrkk..",
      "..krrkrrrrrrk...",
      "...kkkkkkkrrk...",
      ".........krrk...",
      "..........kk....",
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
    [
      "................",
      "..kkk......kkk..",
      "..krkkkkkkkkrk..",
      "..kkrrrrrrrrkk..",
      "...krrrrrrrrk...",
      "..krrrrrrrrrrk..",
      "..krrrrrrrrrrk..",
      "..krrrrrrrrrrk..",
      ".kkkrrrrrrrrk...",
      ".krkkkkkkkkkk...",
      "..kkrrrrrrrkk...",
      "...krrrrrrkrrk..",
      "...krrrrrrkrrk..",
      "...krrkkkkkkk...",
      "...krrk.........",
      "....kk..........",
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
 * The bear caught by a bee, one frame per beat: dazed, sinking, squashed flat,
 * then a puddle with stars. Drawn below the walk rows; not played yet (#47).
 */
export const bearDeath: readonly (readonly string[])[] = [
  [
    "..kkk......kkk..",
    "..kokkkkkkkkok..",
    "..kkrrrrrrrrkk..",
    "...krrrrrrrrk...",
    "..krrrrrrrrrrk..",
    "..krwwrkkrwwrk..",
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
 * A bee flying right, its 4 wing beats. `y` is the body (each bee recolours
 * it), `w` the wings and the white of the eye; facing left is this mirrored.
 */
export const beeFlight: readonly (readonly string[])[] = [
  [
    "................",
    "........k...k...",
    ".........k...k..",
    "..kkk.kk..kkk...",
    ".kwwwkwwkkyyyk..",
    ".kwwwkwwkyywyk..",
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
    "..kwwkwwkyywyk..",
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
    "........k...k...",
    ".........k...k..",
    "..kkk.kk..kkk...",
    ".kwwwkwwkkyyyk..",
    ".kwwwkwwkyywyk..",
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
    "................",
  ],
  [
    "........k...k...",
    ".........k...k..",
    "..........kkk...",
    "...kk.kkkkyyyk..",
    "..kwwkwwkyywyk..",
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
    "................",
  ],
];

/**
 * Where each wing beat's eye is: the pupil, with the white of the eye the
 * pixel above it. The sleepy look closes the eye, the waking look opens it wide.
 */
export const beeEyes: readonly (readonly [number, number])[] = [
  [11, 6],
  [11, 6],
  [11, 5],
  [11, 5],
];

/** Each bee's body colour, so the player can tell the four apart. */
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

/** Food cells: 8×12, 4 frames, as in the Go game. */
export const foodCellWidth = 8;
export const foodCellHeight = 12;

/** How far each of the 4 frames lifts the food off its shadow (it bobs). */
export const foodBob: readonly number[] = [0, 1, 2, 1];

/** A honey drop, 2×2: amber with a glint. */
export const honeyDropArt: readonly string[] = ["yw", "oy"];
/** Its top row in the cell before bobbing, and its shadow. */
export const honeyDropTop = 5;
export const honeyDropShadow: readonly string[] = ["dd"];
export const honeyDropShadowTop = 8;

/**
 * A smoke pot, 6×5: a beekeeper's smoker with embers glowing through it.
 * The smoke above it changes every frame (`smokePotSmoke`).
 */
export const smokePotArt: readonly string[] = ["..mm..", ".llll.", "lwllll", "loroom", ".mmmm."];
export const smokePotTop = 4;
export const smokePotShadow: readonly string[] = ["dddd"];
export const smokePotShadowTop = 10;

/** The smoke rising from the pot, 6×2, one per frame, drawn just above it. */
export const smokePotSmoke: readonly (readonly string[])[] = [
  ["....l.", "...w.."],
  ["...l..", "....w."],
  ["..l...", "...w.."],
  ["...l..", "..w..."],
];

/** The bonus flower, 16×16: a daisy on a stem. Not in the maze yet (#47). */
export const bonusFlowerArt: readonly string[] = [
  "................",
  "......w..w......",
  "....w.wwww.w....",
  "...wwwwwwwwww...",
  "..wwwwyyyywwww..",
  "..wwwyooooywww..",
  "...wwyooooyww...",
  "..wwwwyyyywwww..",
  "...wwwwwwwwww...",
  "....w.wGGw.w....",
  "..gg...GG...gg..",
  ".gggg..GG..gggg.",
  "..gggg.GG.gggg..",
  "....gggGGggg....",
  ".......GG.......",
  "................",
];

/** The maze image, the size of the playfield. */
export const mazeWidth = 224;
export const mazeHeight = 288;

/**
 * The maze, one letter per 8×8 tile (28×36), traced from the Go game's maze so
 * every corridor, corner, the tunnel and the bee home stay where the game
 * expects them:
 *
 * - `.` corridor. The corridor is 16 px wide: wax stops 4 px short of it.
 * - `#` honeycomb wax.
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

/** The honeycomb the wax is cut from, repeated across the maze: `o` cell walls, `y` cells. */
export const honeycomb: readonly string[] = ["yoyyyoyy", "yyoooyyy", "yoyyyoyy", "oyyyyyoo"];

/** Wax next to the background, a 1 px darker rim. */
export const waxRim: SweetieLetter = "r";

/** Behind everything: the dark of the hive. */
export const mazeBackground: SweetieLetter = "k";

/** The bee home's door: a bar across the bottom of the door tiles. */
export const doorBar: SweetieLetter = "w";
export const doorBarRows: readonly number[] = [5, 6];

/** The score dials' digits: the pixel font's 0 to 9 (src/ui/glyphs.ts), centred in 8×8 cells, in this colour. */
export const dialDigitInk: SweetieLetter = "w";
export const dialCell = 8;
