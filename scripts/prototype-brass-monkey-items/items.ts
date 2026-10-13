// PROTOTYPE (throwaway, #38 phase 3): candidate Brass Monkey items, the gear
// and ember hazards and the bolt. Each frame is drawn as its fill and given a
// 1 px black outline by `outline`, as the monkey and the Gnome are. A gear's
// shape is drawn as a quarter mask and mirrored, then shaded by `shade`; the
// picked one becomes plain rows in src/brass-monkey/art.ts.
import { flipX, mirrorX, mirrorY, outline, recolour } from "../pixel-art.ts";

type Rows = readonly string[];

/** Shading letters, light to dark, and the hole's. */
interface Metal {
  hi: string;
  base: string;
  shade: string;
  dark: string;
}

const steel: Metal = { hi: "w", base: "l", shade: "m", dark: "d" };
const brass: Metal = { hi: "w", base: "y", shade: "o", dark: "r" };

/**
 * `mask` in `metal`, lit from the top left: the edges facing the light are
 * bright, the edges away from it in shade, and each hole is a black recess
 * whose near side is in shade.
 */
function shade(mask: Rows, metal: Metal): string[] {
  const h = mask.length;
  const w = mask[0]?.length ?? 0;
  const at = (x: number, y: number): string => mask[y]?.[x] ?? ".";
  return mask.map((row, y) =>
    row
      .split("")
      .map((px, x) => {
        if (px === "o") return "k";
        if (px !== "#") return px;
        const dx = x + 0.5 - w / 2;
        const dy = y + 0.5 - h / 2;
        const lit = (-dx - dy) / (Math.hypot(dx, dy) || 1);
        const near = [at(x - 1, y), at(x + 1, y), at(x, y - 1), at(x, y + 1)];
        if (near.includes("."))
          return lit > 0.75 ? metal.hi : lit < -0.8 ? metal.dark : lit < -0.3 ? metal.shade : metal.base;
        // Inside a hole, the side nearer the light is in shadow.
        const hole = [
          [x + 1, y],
          [x, y + 1],
          [x - 1, y],
          [x, y - 1],
        ].some(([hx = 0, hy = 0], i) => at(hx, hy) === "o" && i < 2);
        return hole ? metal.shade : metal.base;
      })
      .join(""),
  );
}

/** `rows` with a blank 1 px border for the outline. */
function pad(rows: Rows): string[] {
  const w = (rows[0]?.length ?? 0) + 2;
  const blank = ".".repeat(w);
  return [blank, ...rows.map((r) => `.${r}.`), blank];
}

/**
 * The 10×10 gear, hand-drawn: eight teeth, a square hub hole. Frame 1 has
 * teeth on the axes and diagonals, frame 2 is turned half a tooth. Each is
 * drawn as its top-left quarter and mirrored both ways.
 */
const smallMasks = [
  ["....#", ".##.#", ".####", "..###", "####o"],
  ["..##.", "..###", "#####", "#####", ".###o"],
].map((q) => mirrorY(mirrorX(q)));
const smallGear = (metal: Metal): string[][] => smallMasks.map((m) => outline(pad(shade(m, metal))));

/**
 * The 14×14 gear, hand-drawn the same way: eight teeth and four windows.
 * Frame 2 is turned half a tooth, which moves the windows from the diagonals
 * to the axes, so the turn shows.
 */
const bigMasks = [
  [".....##", ".....##", "..##.##", "..#####", "...#oo#", "####o##", "######o"],
  ["....##.", "....##.", "....###", "...###o", "######o", "#######", "..#oo#o"],
].map((q) => mirrorY(mirrorX(q)));
const bigGear = (metal: Metal): string[][] => bigMasks.map((m) => outline(pad(shade(m, metal))));

/** Gear candidates: rotation frames, rolling right. */
export const gears = {
  /** Steel, 12×12, the gear the Gnome holds over its head in the throw. */
  g1: smallGear(steel),
  /** Brass, 12×12, the monkey's metal. */
  g2: smallGear(brass),
  /** Steel, 16×16, eight teeth and four windows that show it turn. */
  g3: bigGear(steel),
};

/**
 * Ember candidates, each a 4-frame flicker. Drawn at 12×12 with the outline;
 * frames 3 and 4 are frames 1 and 2 mirrored, so the flame sways.
 */
const livingEmber = [
  [
    "............",
    "......k.....",
    ".....kyk....",
    "....kyyok...",
    "...kyyyyok..",
    "..kyywyyyok.",
    "..kykyykyok.",
    "..kykyykyrk.",
    "..kyyyyyork.",
    "...koyyorrk.",
    "....krrrkk..",
    ".....kkk....",
  ],
  [
    "............",
    ".....k......",
    "....kyk.....",
    "....kyyok...",
    "...kyyyyok..",
    "..kyywyyyok.",
    "..kykyykyok.",
    "..kykyykyrk.",
    "..kyyyyyork.",
    "...koyyorrk.",
    "....krrrkk..",
    ".....kkk....",
  ],
];
const coalEmber = [
  [
    "............",
    "......k.....",
    ".....kyk....",
    "....kyyok...",
    "...kyywyok..",
    "...koyyyork.",
    "..kdroyordk.",
    ".kddrrorrddk",
    ".kdpddoddpdk",
    ".kpdddrdpppk",
    "..kppdppppk.",
    "...kkkkkkk..",
  ],
  [
    "............",
    ".....k......",
    "....kyk.....",
    "....kyyok...",
    "...kyyywok..",
    "...koyyyork.",
    "..kdroyordk.",
    ".kddrrorrddk",
    ".kdpddoddpdk",
    ".kpdddrdpppk",
    "..kppdppppk.",
    "...kkkkkkk..",
  ],
];
const wispEmber = [
  [
    "............",
    ".......k....",
    "......kok...",
    ".....koyk...",
    "....koyyok..",
    "...koyywyk..",
    "..kroywwyok.",
    "..kroywwyok.",
    "..krooyyork.",
    "...krroorrk.",
    "....krrrrk..",
    ".....kkkk...",
  ],
  [
    "............",
    "....k.......",
    "...kok......",
    "...kyok.....",
    "...koyyok...",
    "..koyywyok..",
    "..kroywwyok.",
    "..kroywwyok.",
    "..krooyyork.",
    "...krroorrk.",
    "....krrrrk..",
    ".....kkkk...",
  ],
];
const sway = (two: string[][]): string[][] => [...two, ...two.map((f) => flipX(f))];

export const embers = {
  /** A living flame with two eyes, the classic. */
  e1: sway(livingEmber),
  /** A lump of coal glowing through its cracks, a flame licking off the top. */
  e2: sway(coalEmber),
  /** A flame alone, no face: white-hot core, red edge. */
  e3: sway(wispEmber),
};

/** A bolt's resting frame and the glint that runs over it (frames 2-4). */
function glinting(rest: Rows, glints: readonly (readonly [number, number])[]): string[][] {
  return [
    [...rest],
    ...glints.map(([gx, gy]) =>
      rest.map((row, y) =>
        row
          .split("")
          .map((px, x) =>
            px !== "." && px !== "k" && ((x === gx && Math.abs(y - gy) <= 1) || (y === gy && Math.abs(x - gx) <= 1))
              ? "w"
              : px,
          )
          .join(""),
      ),
    ),
  ];
}

/** Standing up: a hex head (light, lit and shaded faces) over a threaded shank, 10×14 with the outline. */
const hexBolt = outline(
  pad([
    ".wllllm.",
    "wwllllmd",
    "wwllllmd",
    "wwllllmd",
    ".mmmmmd.",
    "..wllm..",
    "..mmmd..",
    "..wllm..",
    "..mmmd..",
    "..wllm..",
    "..mmmd..",
    "...lm...",
  ]),
);
/** A hex nut face on, flat top and bottom, 12×11 with the outline. */
const hexNut = outline(
  pad([
    "..wwwwyy..",
    ".wyyyyyyy.",
    ".wyykkyyo.",
    "wyykkkkyoo",
    "wyykkkkyoo",
    "wyykkkkyoo",
    ".yyykkyyo.",
    ".yyyyyyoo.",
    "..oooorr..",
  ]),
);

export const bolts = {
  /** Steel hex bolt, standing. */
  b1: glinting(hexBolt, [
    [2, 3],
    [4, 2],
    [6, 3],
  ]),
  /** Brass hex nut, face on. */
  b2: glinting(hexNut, [
    [2, 5],
    [4, 2],
    [8, 3],
  ]),
  /** Brass hex bolt, standing: b1 in the monkey's metal. */
  b3: glinting(recolour(hexBolt, { l: "y", m: "o", d: "r" }), [
    [2, 3],
    [4, 2],
    [6, 3],
  ]),
};
