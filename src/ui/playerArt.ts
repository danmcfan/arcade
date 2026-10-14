// Pixel-art source for the player's sprite sheet (ADR 0006): rows of Sweetie
// 16 letters (`sweetie` in src/ui/sweetie16.ts, `.` is blank).
// scripts/gen-ui-art.ts writes `playerSheetRows()` to
// src/assets/images/player.png.
//
// The player is the original Go sprite (spiky black hair with purple
// highlights, teal eyes) in cyan headphones, an orange tee, blue jeans and
// white sneakers. The sheet is 4 frames across (stand, step, stand, other
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

/** Facing up: the back of the head, the headphone band across the hair. */
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
    "kBBBkppkkkkkBBBk",
    "kBcBkpppppkkBcBk",
    "kBBBkkkkkkkkBBBk",
    ".kkkpkkkkkkpkkk.",
    "..kkpppkkpppkk..",
    "...kppppppppk...",
    "..kkkkppppkkkk..",
    ".kykookkkkookyk.",
    ".kyykooooookyyk.",
    "..kkooooooookk..",
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
    "kBBBkppkkkkkBBBk",
    "kBcBkpppppkkBcBk",
    "kBBBkkkkkkkkBBBk",
    ".kkkpkkkkkkpkkk.",
    "..kkpppkkpppkk..",
    "...kppppppppkk..",
    "...kkkppppkkyk..",
    "..kkookkkkookk..",
    ".kyykoooooook...",
    ".kyykoooooook...",
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
    "kBBBkppkkkkkBBBk",
    "kBcBkpppppkkBcBk",
    "kBBBkkkkkkkkBBBk",
    ".kkkpkkkkkkpkkk.",
    "..kkpppkkpppkk..",
    "...kppppppppkk..",
    "..kykkppppkkk...",
    "..kkookkkkookk..",
    "...koooooookyyk.",
    "...koooooookyyk.",
    "...kbbkkkkbkkk..",
    "...kwbbkkkkk....",
    "...kwwk.........",
    "....kk..........",
  ],
];

/** Facing down: the face, both ear cups. */
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
    "kBBBkpkppppkBBBk",
    "kBcBkkkkkkkkBcBk",
    "kBBBkkkykkykBBBk",
    ".kkkkyyykyyykkk.",
    "..kyyywyywyyyk..",
    "...kyytyytyyk...",
    "..kkkkyyyykkkk..",
    ".kyykokkkkokyyk.",
    ".kyykooooookyyk.",
    "..kkooooooookk..",
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
    "kBBBkpkppppkBBBk",
    "kBcBkkkkkkkkBcBk",
    "kBBBkkkykkykBBBk",
    ".kkkkyyykyyykkk.",
    "..kyyywyywyyyk..",
    ".kykyytyytyyk...",
    ".kyykkyyyykk....",
    "..kkkokkkkkkk...",
    "....koooookyyk..",
    "...kooooookyyk..",
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
    "kBBBkpkppppkBBBk",
    "kBcBkkkkkkkkBcBk",
    "kBBBkkkykkykBBBk",
    ".kkkkyyykyyykkk.",
    "..kyyywyywyyyk..",
    "...kyytyytyykyk.",
    "....kkyyyykkyyk.",
    "...kkkkkkkokkk..",
    "..kyykoooook....",
    "..kyykooooook...",
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
    "..kkBBBkkkkkkkk.",
    "..kkBcBkkkkkyk..",
    "...kBBBkkyykyk..",
    "...kkkkkyywyyk..",
    "....kyyyyytyk...",
    ".....kyyyyyk....",
    ".....kkkkkkk....",
    ".....kokkook....",
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
    "..kkBBBkkkkkkkk.",
    "..kkBcBkkkkkyk..",
    "...kBBBkkyykyk..",
    "...kkkkkyywyyk..",
    "....kyyyyytyk...",
    ".....kyyyyyk....",
    ".....kkkkkk.....",
    ".....kookyyk....",
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
    "..kkBBBkkkkkkkk.",
    "..kkBcBkkkkkyk..",
    "...kBBBkkyykyk..",
    "...kkkkkyywyyk..",
    "....kyyyyytyk...",
    ".....kyyyyyk....",
    ".....kkkkkk.....",
    "....kyykook.....",
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
