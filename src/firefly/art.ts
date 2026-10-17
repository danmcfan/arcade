// Pixel-art source for Firefly (ADR 0006): the firefly, its spark, the Moth, its morph,
// Wasp and Owl, the hit effect and the night background. Every sprite is rows
// of Sweetie 16 letters (`sweetie` in src/ui/sweetie16.ts, `.` is blank).
// scripts/gen-firefly-art.ts writes them to src/assets/images/firefly/
// (`bun run art`), and gen-firefly-art.test.ts fails when the committed PNGs
// drift from this file.

import type { SweetieLetter } from "../ui/sweetie16.ts";

/**
 * Enemy sheets hold one frame per 15° of heading, clockwise from up: row
 * `trunc(angle / 90)`, column `trunc((angle % 90) / 15)` (`frameAngle` in
 * game.ts). The source rows below are the frame facing up; `bun run art`
 * rotates them into the rest.
 */
export const rotationColumns = 6;
export const rotationRows = 4;
export const rotationStep = 15;

/** The player: a firefly seen from above, wings out, its tail glowing. 16×16, facing up. */
export const fireflyArt: readonly string[] = [
  "................",
  "....l......l....",
  ".....l....l.....",
  "......kmmk......",
  ".....roooor.....",
  ".....oorroo.....",
  "...l.dmmmmd.l...",
  "..lwdmlmmlmdwl..",
  ".lwldmlmmlmdlwl.",
  ".lwwdmlmmlmdwwl.",
  ".lwldmlmmlmdlwl.",
  "..ll.dmmmmd.ll..",
  ".....ggyygg.....",
  "....gyywwyyg....",
  "....gywwwwyg....",
  ".....gyyyyg.....",
];

/**
 * A captured firefly: the firefly's rows turned red, so the player sees it is
 * held by the Owl above it. `bun run art` recolours `fireflyArt`: the grey
 * wings and antennae red, the white glow and yellow light orange, the lime tail
 * red and the body purple.
 */
export const captiveColours: Readonly<Record<string, SweetieLetter>> = { l: "r", w: "o", m: "p", g: "r", y: "o" };

/**
 * The spark: a drop of light the firefly shoots upwards. 8×8, drawn with its
 * top-left at the spark's position (4 left of the firefly's centre).
 */
export const sparkArt: readonly string[] = [
  "........",
  "...ww...",
  "..gwwg..",
  "..gyyg..",
  "...yy...",
  "...gg...",
  "...GG...",
  "........",
];

/** The Moth: pale wings and a striped, furry body. 16×16, facing up. */
export const mothArt: readonly string[] = [
  "................",
  "....l......l....",
  ".....l....l.....",
  "..mm..lyyl..mm..",
  ".mlwlm.oo.mlwlm.",
  "mlwwwlmyymlwwwlm",
  "mlwpwlloollwpwlm",
  "mllwllloolllwllm",
  ".mllllmyymllllm.",
  "..mllm.oo.mllm..",
  "..mlwlmyymlwlm..",
  "..mllm.oo.mllm..",
  "...mm..yy..mm...",
  ".......oo.......",
  "................",
  "................",
];

/**
 * The morph a Moth splits into: a green scorpion with red claws and a red
 * sting, after Galaga's scorpion trio. 16×16, facing up.
 */
export const morphArt: readonly string[] = [
  "................",
  "...r........r...",
  "..ro........or..",
  "..r.o......o.r..",
  "..rr........rr..",
  "...rk.kGGk.kr...",
  "....kGgGGgGk....",
  ".m..kGgyygGk..m.",
  "..m.kGGGGGGk.m..",
  ".m..kGgyygGk..m.",
  "..m..kGGGGk..m..",
  "......kGGk......",
  "......krrk......",
  "......roor......",
  ".......kk.......",
  "................",
];

/** The Wasp: a yellow and black striped body under blue wings. 16×16, facing up. */
export const waspArt: readonly string[] = [
  "................",
  ".....o....o.....",
  "......o..o......",
  "......kyyk......",
  "..cc..kyyk..cc..",
  ".cBBc.ykky.cBBc.",
  ".cBBBckyykcBBBc.",
  "..cBBBkkkkBBBc..",
  "...ccc.kk.ccc...",
  "......yyyy......",
  ".....kyyyyk.....",
  ".....kkkkkk.....",
  ".....yyyyyy.....",
  "......kkkk......",
  "......yyyy......",
  ".......kk.......",
];

/** The Owl: a big bird with ear tufts and round eyes, wings spread. 16×16, facing up. */
export const owlArt: readonly string[] = [
  "................",
  "...p........p...",
  "...pp......pp...",
  "...prpppppprp...",
  "...prrrrrrrrp...",
  "...pyyyooyyyp...",
  "..ppykyooykypp..",
  ".pooyyyyyyyyoop.",
  "pooyoorrrrooyoop",
  "prrrrrryyrrrrrrp",
  ".rprprroorrprpr.",
  ".p.p.proorp.p.p.",
  ".....prrrrp.....",
  "......prrp......",
  ".....pp..pp.....",
  "................",
];

/**
 * The Owl after its first hit: the same rows with its warm feathers turned
 * blue, so the player sees it is hurt. `bun run art` recolours `owlArt`.
 */
export const owlHurtColours: Readonly<Record<string, SweetieLetter>> = { r: "b", o: "B", y: "c" };

/** An enemy shot: a falling ember. 4×8, drawn centred on the shot's position. */
export const shotArt: readonly string[] = ["....", ".rr.", "roor", "ryyr", "ryyr", "roor", ".rr.", "...."];

/**
 * The hit effect: 5 frames of a burst of light, each 32×32. Each frame is
 * written as its top-left quarter (16×16, the centre at its bottom-right
 * corner); `bun run art` mirrors it into the other three. Frames sit left to
 * right in one sheet, drawn centred on the enemy that was hit.
 */
export const hitQuarters: readonly (readonly string[])[] = [
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
    "................",
    "................",
    "................",
    "................",
    "...............y",
    "..............yw",
    ".............yww",
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
    "...............g",
    "...............y",
    "..........g....y",
    "...........y..yw",
    "............yyww",
    "...........yywww",
    "..........yywwww",
    ".......gyyywwwww",
  ],
  [
    "................",
    "................",
    "................",
    "................",
    "...............g",
    "................",
    "......g........y",
    ".......y........",
    "................",
    "...........g....",
    "....g...........",
    ".....y.........g",
    "..............gg",
    ".............gyy",
    "............gyyw",
    "....gy..g...gyww",
  ],
  [
    "................",
    "...............G",
    "................",
    "...G...........g",
    "....g...........",
    "................",
    "........g.......",
    "................",
    "..G.............",
    "...g.......G....",
    "............g...",
    "...............G",
    "..........G.....",
    "................",
    "............G.Gg",
    ".G.g.....G....gy",
  ],
  [
    "...............t",
    "................",
    "..t.............",
    "................",
    "........G.......",
    "................",
    "................",
    ".t..............",
    "................",
    "..........t.....",
    "................",
    "....t...........",
    "................",
    "................",
    "...............t",
    "t...........t...",
  ],
];

/** The night sky behind the playfield: 224×288, the cabinet screen inside its insets. */
export const backgroundWidth = 224;
export const backgroundHeight = 288;

/**
 * The sky from the top down: each stop is a row and its colour. Rows between
 * two stops blend from one colour to the next with a 4×4 ordered dither.
 */
export const skyStops: readonly { y: number; color: SweetieLetter }[] = [
  { y: 0, color: "k" },
  { y: 200, color: "k" },
  { y: 248, color: "n" },
];

/** Star shapes, centred on a star's position. */
export const starArt = {
  dim: ["m"],
  bright: ["l"],
  twinkle: [".m.", "mwm", ".m."],
} as const satisfies Record<string, readonly string[]>;

export type StarKind = keyof typeof starArt;

/** Every star in the sky: x, y (its centre) and its shape. */
export const stars: readonly (readonly [x: number, y: number, kind: StarKind])[] = [
  [121, 56, "bright"],
  [180, 94, "dim"],
  [93, 173, "bright"],
  [60, 142, "twinkle"],
  [159, 62, "dim"],
  [46, 101, "bright"],
  [133, 150, "dim"],
  [180, 34, "twinkle"],
  [200, 5, "twinkle"],
  [196, 89, "bright"],
  [105, 167, "dim"],
  [133, 70, "dim"],
  [93, 77, "twinkle"],
  [163, 67, "bright"],
  [19, 174, "dim"],
  [23, 70, "dim"],
  [28, 211, "dim"],
  [45, 31, "dim"],
  [164, 209, "dim"],
  [193, 184, "bright"],
  [186, 115, "dim"],
  [166, 238, "dim"],
  [218, 70, "bright"],
  [63, 93, "dim"],
  [92, 33, "dim"],
  [125, 16, "dim"],
  [33, 61, "bright"],
  [164, 147, "bright"],
  [10, 233, "bright"],
  [173, 47, "dim"],
  [145, 3, "dim"],
  [109, 204, "bright"],
  [147, 120, "dim"],
  [140, 190, "twinkle"],
  [28, 116, "twinkle"],
  [5, 140, "dim"],
  [210, 150, "dim"],
  [62, 10, "bright"],
  [8, 20, "dim"],
  [75, 230, "dim"],
  [214, 220, "twinkle"],
  [118, 104, "dim"],
];

/**
 * The grass at the bottom of the screen: a 56×21 tile of silhouettes, repeated
 * across the width and standing on the bottom row. `.` shows the sky.
 */
export const grassTile: readonly string[] = [
  ".............................................k..........",
  ".............................................k..........",
  ".............................................k........k.",
  ".....................................k........k.......k.",
  "......................k..............k........k.......k.",
  "...k..................k..............k........k.......k.",
  "...k............k.....k.k............k.......k.k......k.",
  "..kk............k.....k.k............k.......k.k......k.",
  "..kk.....k......k....kk..k.........k.k........kk......k.",
  ".kk.k....k......k.....k.kk.k.....kkkkk........kkk......k",
  "kk..k.....k.....k....kk..k.kk....kkkkk....k....kk......k",
  "kkk.k.....k....k.....kk..k.kk.k.kkkk.kk..k..k..kkk..k..k",
  "kkk.kk....k....kk...kkkk.kkkk.k.kkkkkkkk.k.k..kkkk..k..k",
  "kkk.kkk....kk..kk...kkkkk.kkkk..kkkkkkkk.k.k..kkkk..k.kk",
  "kkkkkk.k...kkk.kk....kkkk.kkkk.kkkkkkkk.kk.k.k..kk..k..k",
  "kkkkkkkkkkkkk.kkk....kkkk.kkkkkkkkkkkkkkkk.kkkk.kk..kk.k",
  "kkkkkkkkkkkkkkkkk....kkkkkkkkkkkkkkkkkkkkkkkkkk.kkk.kkkk",
  "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
  "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
  "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
  "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
];
