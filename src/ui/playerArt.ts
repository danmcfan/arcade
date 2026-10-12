// Pixel-art source for the player's sprite sheet (ADR 0006): rows of palette
// letters (`.` is blank). scripts/gen-ui-art.ts writes `playerSheetRows()` to
// src/assets/images/player.png.
//
// The sheet is 4 frames across (stand, step, stand, other step) and one row
// per facing direction, in the order of `newPlayer().frameDirection`
// (src/arcade/entity.ts): up, down, left, right. Each frame is 16x24, the
// player's collision box. A dark outline and bright, warm clothes keep the
// player readable on both colours of the hub floor.

import type { Direction } from "../engine/input.ts";

/** Sweetie 16 colours, keyed by the letter the rows use. */
export const playerPalette: Readonly<Record<string, string>> = {
  k: "#1a1c2c",
  r: "#b13e53",
  o: "#ef7d57",
  y: "#ffcd75",
  d: "#3b5dc9",
  w: "#f4f4f4",
};

export const playerFrameWidth = 16;
export const playerFrameHeight = 24;
/** Frames per walk cycle (`Entity.frameTotal`). */
export const playerFrames = 4;

/** One facing: rows 0..18 (head and body) and three leg poses for rows 19..23. */
interface Facing {
  body: readonly string[];
  stand: readonly string[];
  step: readonly string[];
  otherStep: readonly string[];
}

const frontLegs = {
  stand: [
    "...kkddddddkk...",
    "....kddkkddk....",
    "....kddkkddk....",
    "....kwwkkwwk....",
    ".....kk..kk.....",
  ],
  step: [
    "...kkddddddkk...",
    "....kddkkddk....",
    "....kwwkkddk....",
    ".....kk.kwwk....",
    ".........kk.....",
  ],
  otherStep: [
    "...kkddddddkk...",
    "....kddkkddk....",
    "....kddkkwwk....",
    "....kwwk.kk.....",
    ".....kk.........",
  ],
};

const down: Facing = {
  body: [
    "................",
    "................",
    "................",
    "................",
    ".....kkkkkk.....",
    "....krrrrrrk....",
    "...krrrorrrrk...",
    "..krrrorrrrrrk..",
    "..krrrrrrrrrrk..",
    "..krkyyyyyykrk..",
    "..kryyyyyyyyrk..",
    "..kyykyyyykyyk..",
    "..kyykyyyykyyk..",
    "...kyyyyyyyyk...",
    "...kkkyyyykkk...",
    "..kooooooooook..",
    "..kokooooookok..",
    "..kokyyyyyykok..",
    "..kykrrrrrrkyk..",
  ],
  ...frontLegs,
};

const up: Facing = {
  body: [
    "................",
    "................",
    "................",
    "................",
    ".....kkkkkk.....",
    "....krrrrrrk....",
    "...krrrorrrrk...",
    "..krrrorrrrrrk..",
    "..krrrrrrrrrrk..",
    "..krrrrrrrrrrk..",
    "..krrrrrrrrrrk..",
    "..kyrrrrrrrryk..",
    "..kykrrrrrrkyk..",
    "...kkrrrrrrkk...",
    "...kkkyyyykkk...",
    "..kooooooooook..",
    "..kokooooookok..",
    "..kokyyyyyykok..",
    "..kykrrrrrrkyk..",
  ],
  ...frontLegs,
};

const right: Facing = {
  body: [
    "................",
    "................",
    "................",
    "................",
    "....kkkkkk......",
    "...krrrrrrk.....",
    "..krrorrrrrk....",
    "..krorrrrrrrk...",
    "..krrrrrrkkkk...",
    "..krrrrkyyyyyk..",
    "..krrrkyyyykyk..",
    "..krrkyyyyykyk..",
    "..krrkyyyyyyyk..",
    "...kkyyyyyykk...",
    "....kkyyyk......",
    "....kooooook....",
    "....kooooook....",
    "....kyyyyyyk....",
    "....krrrrrrk....",
  ],
  stand: [
    "....kddddddk....",
    ".....kddddk.....",
    ".....kddddk.....",
    ".....kwwwwwk....",
    "......kkkkk.....",
  ],
  step: [
    "....kddddddk....",
    "...kddkkkddk....",
    "...kddk.kddk....",
    "..kwwwk.kwwwk...",
    "...kkk...kkk....",
  ],
  otherStep: [
    "....kddddddk....",
    ".....kddddk.....",
    "....kwwkddk.....",
    ".....kkkwwwk....",
    "........kkk.....",
  ],
};

const mirror = (rows: readonly string[]): string[] => rows.map((r) => [...r].reverse().join(""));

const left: Facing = {
  body: mirror(right.body),
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
  return [f.stand, f.step, f.stand, f.otherStep].map((legs) => [...f.body, ...legs]);
}

/** The whole sheet: `playerFrames` frames across, one row of frames per direction in `sheetOrder`. */
export function playerSheetRows(): string[] {
  return sheetOrder.flatMap((dir) => {
    const frames = playerFramesFor(dir);
    return frames[0]!.map((_, y) => frames.map((f) => f[y]).join(""));
  });
}
