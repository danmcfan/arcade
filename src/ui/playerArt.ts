// Pixel-art source for the player's sprite sheet (ADR 0006): rows of Sweetie
// 16 letters (`sweetie` in src/ui/sweetie16.ts, `.` is blank).
// scripts/gen-ui-art.ts writes `playerSheetRows()` to
// src/assets/images/player.png.
//
// The player keeps the original Go sprite's outline (FRLG's Gary): spiky
// black hair with purple highlights and teal eyes, in cyan headphones whose
// cups are lit on the outside, an orange hoodie (sleeves to the wrists,
// drawstrings, a ribbed hem, the hood on his back), blue jeans and white
// sneakers. The sheet is 4 frames across (stand, step, stand, other
// step) and one row per facing direction, in the order of
// `newPlayer().frameDirection` (src/arcade/entity.ts): up, down, left, right.
// Each frame is 16x24, the player's collision box; the step frames sit 1 px
// lower than the stand.

import type { Direction } from "../engine/input.ts";

export const playerFrameWidth = 16;
export const playerFrameHeight = 24;
/** Frames per walk cycle (`Entity.frameTotal`). */
export const playerFrames = 4;

/** One facing's frames, each a whole 16x24 frame: stand, step, other step. */
type Facing = string[][];

/** Facing up: the back of the head, the headphone band across the hair, the hood on his back. */
export const up: Facing = [
  [
    "................",
    "................",
    "................",
    ".......kk.......",
    ".....kkpkkk.....",
    "..kcccccccccck..",
    ".kckkkkkkkkkkck.",
    ".kBkppkkkkkkkBk.",
    ".kBkppkkkkkkkBk.",
    "kcBBkppkkkkkBBck",
    "kBBbkpppppkkbBBk",
    "kbBbkkkkkkkkbBbk",
    ".kkkpkkkkkkpkkk.",
    "..kkpppkkpppkk..",
    "...kppppppppk...",
    "..kkkkppppkkkk..",
    ".kokoorrrrookok.",
    ".kyykookkookyyk.",
    "..kkrrrrrrrrkk..",
    "...kbbkkkkbbk...",
    "...kwbbkkbbwk...",
    "...kwwk..kwwk...",
    "....kk....kk....",
    "................",
  ],
  [
    "................",
    "................",
    "................",
    "................",
    ".......kk.......",
    ".....kkpkkk.....",
    "..kcccccccccck..",
    ".kckkkkkkkkkkck.",
    ".kBkppkkkkkkkBk.",
    ".kBkppkkkkkkkBk.",
    "kcBBkppkkkkkBBck",
    "kBBbkpppppkkbBBk",
    "kbBbkkkkkkkkbBbk",
    ".kkkpkkkkkkpkkk.",
    "..kkpppkkpppkk..",
    "...kppppppppkk..",
    "...kkkppppkkyk..",
    "..kkoorrrrookk..",
    ".kookookkoook...",
    ".kyykrrrrrrrk...",
    "..kkkbkkkkbbk...",
    "....kkkkkbbwk...",
    ".........kwwk...",
    "..........kk....",
  ],
  [
    "................",
    "................",
    "................",
    "................",
    ".......kk.......",
    ".....kkpkkk.....",
    "..kcccccccccck..",
    ".kckkkkkkkkkkck.",
    ".kBkppkkkkkkkBk.",
    ".kBkppkkkkkkkBk.",
    "kcBBkppkkkkkBBck",
    "kBBbkpppppkkbBBk",
    "kbBbkkkkkkkkbBbk",
    ".kkkpkkkkkkpkkk.",
    "..kkpppkkpppkk..",
    "...kppppppppkk..",
    "..kykkppppkkk...",
    "..kkoorrrrookk..",
    "...koookkookork.",
    "...krrrrrrrkyyk.",
    "...kbbkkkkbkkk..",
    "...kwbbkkkkk....",
    "...kwwk.........",
    "....kk..........",
  ],
];

/** Facing down: the face, both ear cups, the hoodie's drawstrings. */
export const down: Facing = [
  [
    "................",
    "................",
    "................",
    ".......kk.......",
    ".....kkkkkk.....",
    "..kcccccccccck..",
    ".kckpppkkkkkkck.",
    ".kBkpppkkkkkkBk.",
    ".kBkppppkkkpkBk.",
    "kcBBkpkppppkBBck",
    "kBBbkkkkkkkkbBBk",
    "kbBbkkkykkykbBbk",
    ".kkkkyyykyyykkk.",
    "..kyyywyywyyyk..",
    "...kyytyytyyk...",
    "..kkkkyyyykkkk..",
    ".kookorkkrokook.",
    ".kyykowoowokyyk.",
    "..kkrrrrrrrrkk..",
    "...kbbkkkkbbk...",
    "...kwbbkkbbwk...",
    "...kwwk..kwwk...",
    "....kk....kk....",
    "................",
  ],
  [
    "................",
    "................",
    "................",
    "................",
    ".......kk.......",
    ".....kkkkkk.....",
    "..kcccccccccck..",
    ".kckpppkkkkkkck.",
    ".kBkpppkkkkkkBk.",
    ".kBkppppkkkpkBk.",
    "kcBBkpkppppkBBck",
    "kBBbkkkkkkkkbBBk",
    "kbBbkkkykkykbBbk",
    ".kkkkyyykyyykkk.",
    "..kyyywyywyyyk..",
    ".kykyytyytyyk...",
    ".kookkyyyykk....",
    "..kkkorkkrokk...",
    "....kowoowkork..",
    "...krrrrrrkyyk..",
    "...kbbkkkkwkk...",
    "...kwbbkkkkk....",
    "...kwwk.........",
    "....kk..........",
  ],
  [
    "................",
    "................",
    "................",
    "................",
    ".......kk.......",
    ".....kkkkkk.....",
    "..kcccccccccck..",
    ".kckpppkkkkkkck.",
    ".kBkpppkkkkkkBk.",
    ".kBkppppkkkpkBk.",
    "kcBBkpkppppkBBck",
    "kBBbkkkkkkkkbBBk",
    "kbBbkkkykkykbBbk",
    ".kkkkyyykyyykkk.",
    "..kyyywyywyyyk..",
    "...kyytyytyykyk.",
    "....kkyyyykkork.",
    "...kkkrkkrokkk..",
    "..kookwoowok....",
    "..kyykrrrrrrk...",
    "...kkwkkkkbbk...",
    "....kkkkkbbwk...",
    ".........kwwk...",
    "..........kk....",
  ],
];

/** Facing right: one ear cup at the back of the head. Left is this, mirrored. */
export const right: Facing = [
  [
    "................",
    "................",
    "................",
    "........kk......",
    "......kckkkkkk..",
    ".....kckkkkkkpk.",
    "..k.kBkkkkkkkk..",
    "..kkkBkkkkkkkk..",
    "..kpkBkkkkkppkk.",
    "..kpkBkkkpppkkkk",
    "..kkcBBkkkkkkkk.",
    "..kkBBbkkkkkyk..",
    "...kbBbkkyykyk..",
    "...kkkkkyywyyk..",
    "....kyyyyytyk...",
    ".....kyyyyyk....",
    ".....kkkkkkk....",
    ".....koorowk....",
    ".....kkyykok....",
    ".....kkyykk.....",
    "......kkkwk.....",
    "......kwwwk.....",
    ".......kkk......",
    "................",
  ],
  [
    "................",
    "................",
    "................",
    "................",
    "........kk......",
    "......kckkkkkk..",
    ".....kckkkkkkpk.",
    "..k.kBkkkkkkkk..",
    "..kkkBkkkkkkkk..",
    "..kpkBkkkkkppkk.",
    "..kpkBkkkpppkkkk",
    "..kkcBBkkkkkkkk.",
    "..kkBBbkkkkkyk..",
    "...kbBbkkyykyk..",
    "...kkkkkyywyyk..",
    "....kyyyyytyk...",
    ".....kyyyyyk....",
    ".....kkkkkk.....",
    ".....kowkyyk....",
    "....kbookyykk...",
    "...kwbbbkkkwk...",
    "...kwwkkk.kk....",
    "....kkk.........",
    "................",
  ],
  [
    "................",
    "................",
    "................",
    "................",
    "........kk......",
    "......kckkkkkk..",
    ".....kckkkkkkpk.",
    "..k.kBkkkkkkkk..",
    "..kkkBkkkkkkkk..",
    "..kpkBkkkkkppkk.",
    "..kpkBkkkpppkkkk",
    "..kkcBBkkkkkkkk.",
    "..kkBBbkkkkkyk..",
    "...kbBbkkyykyk..",
    "...kkkkkyywyyk..",
    "....kyyyyytyk...",
    ".....kyyyyyk....",
    ".....kkkkkk.....",
    "....kyykowk.....",
    "....kyykobbk....",
    "....kkkbbbwwk...",
    "....kwkkkwwk....",
    ".....kk..kk.....",
    "................",
  ],
];

const mirror = (rows: readonly string[]): string[] =>
  rows.map((r) => Array.from(r, (_, i) => r.charAt(r.length - 1 - i)).join(""));

/** Sheet rows top to bottom (`Entity.frameDirection`). */
export const sheetOrder: readonly Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"];

/** Left is right, mirrored, read at call time so an edit to `right` carries over. */
const facings: Readonly<Record<Direction, () => Facing>> = {
  UP: () => up,
  DOWN: () => down,
  LEFT: () => right.map((rows) => mirror(rows)),
  RIGHT: () => right,
};

/** The 4 frames of one facing, left to right: stand, step, stand, other step. */
export function playerFramesFor(dir: Direction): string[][] {
  const [stand = [], step = [], otherStep = []] = facings[dir]();
  return [stand, step, stand, otherStep].map((rows) => rows.slice());
}

/** The whole sheet: `playerFrames` frames across, one row of frames per direction in `sheetOrder`. */
export function playerSheetRows(): string[] {
  return sheetOrder.flatMap((dir) => {
    const frames = playerFramesFor(dir);
    const first = frames[0];
    if (first === undefined) throw new Error(`player sheet: no frames for ${dir}`);
    return first.map((_, y) => frames.map((f) => f[y]).join(""));
  });
}
