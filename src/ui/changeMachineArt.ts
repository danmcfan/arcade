// Pixel-art source for the hub's change machine (#198), drawn by the owner in
// Aseprite and imported with `bun run pixel import`: a machine standing square
// against the right wall, its front turned toward the room, a dollar sign on
// its face. The owner then picked a polished version from two rounds of
// prototypes: a full outline, a grey ramp down the side face, a solid kick
// plate, rivets at the top panel's corners, and the dollar sign twinkling.
// 16x32: its bottom 16 rows stand on the solid 16x16 spot, the rest rises
// above it. scripts/gen-ui-art.ts derives the twinkle's frames from
// `changeMachine` and `changeMachineSweeps` and writes them, left to right, to
// src/assets/images/change-machine.png; src/arcade/changeMachine.ts plays them.

export const changeMachineWidth = 16;
export const changeMachineHeight = 32;

/** The machine at rest: every frame of the twinkle starts from these rows. */
export const changeMachine: readonly string[] = [
  "...kkkkkkkkkkkkk",
  "...kmmmmmmmmmmmk",
  "...kmlmmmmmmmlmk",
  "...kmmmmmmmmmmmk",
  "...kmmmmmmmmmmmk",
  "...kmmmmmmmmmmmk",
  "...kmmmmmmmmmmmk",
  "...kmmmmmmmmmmmk",
  "...kmmmmmmmmmmmk",
  "...kmlmmmmmmmlmk",
  "...kmmmmmmmmmmmk",
  "..kkdddddddddddk",
  ".kmkdddddgdddddk",
  "klmkddddGGGddddk",
  "klmkdddGGGGGdddk",
  "klmkddGGdgdGGddk",
  "klmkddGGdgdGGddk",
  "klmkddGGdgdddddk",
  "klmkdddGGGGGdddk",
  "klmkdddddgdGGddk",
  "klkdddGGdgdGGddk",
  "kkddddGGdgdGGddk",
  "kddddddGGGGGdddk",
  "kdddddddGGGddddk",
  "kddddddddgdddddk",
  "kddddddddddddddk",
  "kddddddddddddddk",
  "kGGGGGGGGGGGGGGk",
  "kmmmmmmmmmmmmmmk",
  "kddddddddddddddk",
  "kddddddddddddddk",
  "kkkkkkkkkkkkkkkk",
];

/**
 * The twinkle, one entry per frame: null holds the machine at rest; a number
 * lights the dollar sign's green (G) pixels inside `changeMachineSign` lime (g) along the two diagonals
 * where x + y is that number or one more, so a band of light sweeps down-left
 * across the sign.
 */
export const changeMachineSweeps: readonly (number | null)[] = [null, null, null, 16, 18, 20, 22, 24, 26, 28];

/** The face around the dollar sign: the only part of the machine the twinkle lights. */
export const changeMachineSign = { x: 4, y: 12, w: 11, h: 13 } as const;

/** Ticks each twinkle frame shows. */
export const changeMachineFrameTicks = 8;
