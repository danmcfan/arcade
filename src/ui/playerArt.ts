// Pixel-art source for the player's sprite sheet (ADR 0006): rows of palette
// letters (`.` is blank). scripts/gen-ui-art.ts writes `playerSheetRows()` to
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

/** Sweetie 16 colours, keyed by the letter the rows use. */
export const playerPalette: Readonly<Record<string, string>> = {
  k: "#1a1c2c",
  p: "#5d275d",
  o: "#ef7d57",
  y: "#ffcd75",
  t: "#257179",
  b: "#3b5dc9",
  B: "#41a6f6",
  c: "#73eff7",
  w: "#f4f4f4",
};

export const playerFrameWidth = 16;
export const playerFrameHeight = 24;
/** Frames per walk cycle (`Entity.frameTotal`). */
export const playerFrames = 4;

/** One facing's frames, each a whole 16x24 frame. */
interface Facing {
  stand: readonly string[];
  step: readonly string[];
  otherStep: readonly string[];
}

/** Facing up: the back of the head, the headphone band across the hair. */
const up: Facing = {
  stand: [
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
  step: [
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
  otherStep: [
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
};

/** Facing down: the face, both ear cups. */
const down: Facing = {
  stand: [
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
  step: [
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
  otherStep: [
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
};

/** Facing right: one ear cup at the back of the head. Left is this, mirrored. */
const right: Facing = {
  stand: [
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
  step: [
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
  otherStep: [
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
};

const mirror = (rows: readonly string[]): string[] => rows.map((r) => [...r].reverse().join(""));

const left: Facing = {
  stand: mirror(right.stand),
  step: mirror(right.step),
  otherStep: mirror(right.otherStep),
};

/** Sheet rows top to bottom (`Entity.frameDirection`). */
export const sheetOrder: readonly Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"];

const facings: Readonly<Record<Direction, Facing>> = { UP: up, DOWN: down, LEFT: left, RIGHT: right };

/** The 4 frames of one facing, left to right: stand, step, stand, other step. */
export function playerFramesFor(dir: Direction): string[][] {
  const f = facings[dir];
  return [f.stand, f.step, f.stand, f.otherStep].map((rows) => [...rows]);
}

/** The whole sheet: `playerFrames` frames across, one row of frames per direction in `sheetOrder`. */
export function playerSheetRows(): string[] {
  return sheetOrder.flatMap((dir) => {
    const frames = playerFramesFor(dir);
    return frames[0]!.map((_, y) => frames.map((f) => f[y]).join(""));
  });
}
