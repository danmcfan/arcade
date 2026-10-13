// PROTOTYPE (throwaway, #38 phase 1): candidate Brass Monkey floor art, the
// girder and conveyor tiles, ladders, the exit door and the wall behind them,
// and the girder floor's layout imported from the old workshop.png. Tiles
// are drawn in shading digits (1 lit, 2 base, 3 shade, 4 dark) and recoloured
// per colour option; the viewer lays them out. The picked ones become plain
// rows in src/brass-monkey/art.ts.
import { outline } from "../pixel-art.ts";

/** Each girder is 8×8, tiled along the floor; a sloped girder steps 1 px every 16 px. */
export const girderShapes = {
  /** The old workshop's truss, imported from workshop.png (`G` rows to 2, `t` rows to 3). */
  s1: ["22222222", "33333333", "..222...", ".22.22..", "22...22.", "2.....22", "22222222", "33333333"],
  /** A plate girder with a row of lightening holes, lit along the top. */
  s2: ["11111111", "22222222", "2..22..2", "2..22..2", "22222222", "33333333", "44444444", "........"],
  /** An I-beam seen side on: flanges top and bottom, a riveted web between. */
  s3: ["11111111", "22222222", "33333333", "31333133", "33333333", "22222222", "44444444", "........"],
};

/** Girder colours: what each shading digit becomes. */
export const girderColours = {
  green: { 1: "g", 2: "G", 3: "t", 4: "n" },
  red: { 1: "o", 2: "r", 3: "p", 4: "p" },
  blue: { 1: "B", 2: "b", 3: "n", 4: "n" },
  steel: { 1: "w", 2: "l", 3: "m", 4: "d" },
  brass: { 1: "y", 2: "o", 3: "r", 4: "p" },
};

/**
 * Ladders are 8 wide and tiled by row: row `y % 4` of a ladder at height y,
 * so every rung lines up with the old workshop's (on rows where y % 4 is 1).
 */
export const ladderShapes = {
  /** The old workshop's: 1 px rails, a rung every 4 rows. Imported. */
  l1: ["2......2", "22222222", "2......2", "2......2"],
  /** 2 px rails, lit on the left and shaded on the right. */
  l2: ["12....23", "12222223", "12....23", "12....23"],
};

export const ladderColours = {
  white: { 1: "w", 2: "w", 3: "l" },
  cyan: { 1: "w", 2: "c", 3: "B" },
  yellow: { 1: "w", 2: "y", 3: "o" },
  steel: { 1: "w", 2: "l", 3: "m" },
};

/** The wall behind the floor, as a tile repeated across the 224×256 screen. */
export const backdrops = {
  /** Black, like the old workshop's near-black (#040c06 is not Sweetie 16). */
  k1: ["k"],
  /** Riveted wall panels, 32×32, their seams and rivets in dark grey. */
  k2: panels(),
  /** Brick, 16×8 courses, its mortar in dark grey. */
  k3: [
    "kkkkkkkdkkkkkkkk",
    "kkkkkkkdkkkkkkkk",
    "kkkkkkkdkkkkkkkk",
    "dddddddddddddddd",
    "kkkkkkkkkkkkkkkd",
    "kkkkkkkkkkkkkkkd",
    "kkkkkkkkkkkkkkkd",
    "dddddddddddddddd",
  ],
};

function panels(): string[] {
  const rows: string[] = [];
  for (let y = 0; y < 32; y++) {
    let row = "";
    for (let x = 0; x < 32; x++) {
      const seam = x === 31 || y === 31;
      const rivet = (x === 3 || x === 27) && (y === 3 || y === 27);
      row += seam || rivet ? "d" : "k";
    }
    rows.push(row);
  }
  return rows;
}

/**
 * A conveyor is 8 px tall like a girder: a left end, a middle tiled along it
 * and a right end, each with 4 frames. Frames run in order for a belt moving
 * right and backwards for one moving left; the top moves 1 px a frame.
 */
interface Conveyor {
  left: string[][];
  middle: string[][];
  right: string[][];
}

/** `pattern` (one period) laid along `w` px, moved `shift` px right. */
function tread(pattern: string, w: number, shift: number): string {
  const n = pattern.length;
  let s = "";
  for (let x = 0; x < w; x++) s += pattern[(((x - shift) % n) + n) % n];
  return s;
}

/**
 * A belt looped round a side frame painted in the girder's colour (digits 2
 * and 3, recoloured with the girder): the top run moves one way, the bottom
 * run back, and a dark hub every 8 px turns, its light mark going round a
 * quarter each frame. `top` and `under` are the belt's two rows, each one
 * period; `under` is moved 1 px further, so stripes run diagonally.
 */
function beltLoop(top: string, under: string): Conveyor {
  const frames = [0, 1, 2, 3];
  const marks = [
    [0, 0],
    [1, 0],
    [1, 1],
    [0, 1],
  ];
  /** Rows 3 and 4 with a 2×2 hub at x, its mark at frame f. */
  const hub = (row: string, y: number, x: number, f: number): string => {
    const [mx = 0, my = 0] = marks[f] ?? [];
    const px = (dx: number): string => (dx === mx && y === my ? "w" : "d");
    return row.slice(0, x) + px(0) + px(1) + row.slice(x + 2);
  };
  const rows = (f: number, part: keyof Conveyor): string[] => {
    const t = tread(top, 8, f);
    const u = tread(under, 8, f + 1);
    const b = tread(top, 8, -f);
    const bu = tread(under, 8, -f - 1);
    const e = under[0] ?? "d";
    if (part === "middle") {
      return [t, u, "22222222", hub("33333333", 0, 3, f), hub("33333333", 1, 3, f), "22222222", bu, b];
    }
    // The ends: the belt rounds the end of the frame, a hub in the end.
    if (part === "left") {
      return [
        `..${t.slice(2)}`,
        `.${u.slice(1)}`,
        `${e}2222222`,
        `${e}${hub("3333333", 0, 1, f)}`,
        `${e}${hub("3333333", 1, 1, f)}`,
        `${e}2222222`,
        `.${bu.slice(1)}`,
        `..${b.slice(2)}`,
      ];
    }
    return [
      `${t.slice(0, 6)}..`,
      `${u.slice(0, 7)}.`,
      `2222222${e}`,
      `${hub("3333333", 0, 5, f)}${e}`,
      `${hub("3333333", 1, 5, f)}${e}`,
      `2222222${e}`,
      `${bu.slice(0, 7)}.`,
      `${b.slice(0, 6)}..`,
    ];
  };
  const left = frames.map((f) => rows(f, "left"));
  const middle = frames.map((f) => rows(f, "middle"));
  const right = frames.map((f) => rows(f, "right"));
  return { left, middle, right };
}

/**
 * A belt riding on top of a girder: 2 rows of belt over the girder's lower 6
 * rows, with a small drum at each end. The girder part is filled in by the
 * viewer from the picked girder (its rows 2–7); here it is `#`.
 */
function beltOnGirder(top: string, edge: string): Conveyor {
  const frames = [0, 1, 2, 3];
  const girder = Array.from({ length: 6 }, () => "########");
  const middle = frames.map((f) => [tread(top, 8, f), edge.repeat(8)].concat(girder));
  const left = frames.map((f) => [`.${tread(top, 8, f).slice(1)}`, edge.repeat(8)].concat(girder));
  const right = frames.map((f) => [`${tread(top, 8, f).slice(0, 7)}.`, edge.repeat(8)].concat(girder));
  return { left, middle, right };
}

export const conveyors = {
  /** A rubber belt with grey treads, looped round a frame in the girder's colour. */
  c1: beltLoop("lmmm", "dddd"),
  /** The same loop with hazard stripes, so the belt's direction shows from afar. */
  c2: beltLoop("yykk", "yykk"),
  /** A belt of steel slats riding on top of the floor's girder. */
  c3: beltOnGirder("lllm", "d"),
};

/** The exit door, 16 wide, bottom row on the floor; outlined in black but not along the bottom. */
const doorFills = {
  /** A steel door in a dark frame, rivets and a brass handle, a green lamp above. */
  d1: [
    "................",
    "......gggg......",
    "......gGGg......",
    "................",
    ".dddddddddddddd.",
    ".dmmmmmmmmmmmmd.",
    ".dmwllllllllmmd.",
    ".dmlwllllllllmd.",
    ".dmllllllllllmd.",
    ".dmmmmmmmmmmmmd.",
    ".dmlllllllllmmd.",
    ".dmllllllllllmd.",
    ".dmllllllllllmd.",
    ".dmllllllllyymd.",
    ".dmllllllllyomd.",
    ".dmllllllllllmd.",
    ".dmmmmmmmmmmmmd.",
    ".dmlllllllllmmd.",
    ".dmllllllllllmd.",
    ".dmllllllllllmd.",
    ".dmllllllllllmd.",
    ".dmllllllllllmd.",
    ".dmmmmmmmmmmmmd.",
    ".dddddddddddddd.",
  ],
  /** A brass door with an arched top and a round cyan porthole. */
  d2: [
    "................",
    ".....oooooo.....",
    "...ooyyyyyyoo...",
    "..oyyyyyyyyyyo..",
    ".oyyyyoooyyyyyo.",
    ".oyyyokccoyyyyo.",
    ".oyyoccwccoyyyo.",
    ".oyyocwcccoyyyo.",
    ".oyyoccccboyyyo.",
    ".oyyyocbboyyyyo.",
    ".oyyyyoooyyyyyo.",
    ".oyyyyyyyyyyyyo.",
    ".orrrrrrrrrrrro.",
    ".oyyyyyyyyyyyyo.",
    ".oyyyyyyyyywwyo.",
    ".oyyyyyyyyyrryo.",
    ".oyyyyyyyyyyyyo.",
    ".orrrrrrrrrrrro.",
    ".oyyyyyyyyyyyyo.",
    ".oyyyyyyyyyyyyo.",
    ".oyyyyyyyyyyyyo.",
    ".oyyyyyyyyyyyyo.",
    ".orrrrrrrrrrrro.",
    ".oooooooooooooo.",
  ],
  /** A roller shutter, half open onto daylight, with hazard stripes along its foot. */
  d3: [
    "................",
    "......gggg......",
    "......gGGg......",
    "................",
    "dddddddddddddddd",
    "dmmmmmmmmmmmmmmd",
    "dlllllllllllllld",
    "dmmmmmmmmmmmmmmd",
    "dlllllllllllllld",
    "dmmmmmmmmmmmmmmd",
    "dlllllllllllllld",
    "dmmmmmmmmmmmmmmd",
    "dyykkyykkyykkyyd",
    "dkyykkyykkyykkyd",
    "dBBBBBBBBBBBBBBd",
    "dBBBBBBBBBBBBBBd",
    "dcBBBBBBBBBBBBBd",
    "dBBBBBBBBBBBBBBd",
    "dGGGGGGGGGGGGGGd",
    "dgGGGGGGGgGGGGGd",
    "dGGGGgGGGGGGGgGd",
    "dGGGGGGGGGGGGGGd",
    "dGGGGGGGGGGGGGGd",
    "dddddddddddddddd",
  ],
  /** The steel door under a lit EXIT sign. */
  d4: [
    ".mmmmmmmmmmmmmmm",
    ".mgggkgkgkgkgggm",
    ".mgkkkgkgkgkkgkm",
    ".mggkkkgkkgkkgkm",
    ".mgkkkgkgkgkkgkm",
    ".mgggkgkgkgkkgkm",
    ".mmmmmmmmmmmmmmm",
    "................",
    ".dddddddddddddd.",
    ".dmmmmmmmmmmmmd.",
    ".dmwllllllllmmd.",
    ".dmlwllllllllmd.",
    ".dmllllllllllmd.",
    ".dmmmmmmmmmmmmd.",
    ".dmlllllllllmmd.",
    ".dmllllllllyymd.",
    ".dmllllllllyomd.",
    ".dmllllllllllmd.",
    ".dmmmmmmmmmmmmd.",
    ".dmlllllllllmmd.",
    ".dmllllllllllmd.",
    ".dmllllllllllmd.",
    ".dmmmmmmmmmmmmd.",
    ".dddddddddddddd.",
  ],
};

export const doors = {
  d1: outline(doorFills.d1),
  d2: outline(doorFills.d2),
  d3: outline(doorFills.d3),
  d4: outline(doorFills.d4),
};

/** One girder of a floor: 8 px columns from x0 up to x1, each at its own y (the girder's top). */
export interface Girder {
  x0: number;
  x1: number;
  y: (x: number) => number;
}

/** One ladder: 8 wide at x, from row top to row bottom inclusive. */
export interface Ladder {
  x: number;
  top: number;
  bottom: number;
}

/**
 * The girder floor, imported from the old workshop.png (224×256): six sloped
 * girders, the top platform, and every ladder, broken ones as two pieces.
 * The bottom girder is flat where the monkey walks today (x 0–111, y 248).
 */
const girders: Girder[] = [
  { x0: 0, x1: 224, y: (x) => (x < 112 ? 248 : 254 - Math.floor(x / 16)) },
  { x0: 0, x1: 208, y: (x) => 208 + Math.floor(x / 16) },
  { x0: 16, x1: 224, y: (x) => 188 - Math.floor(x / 16) },
  { x0: 0, x1: 208, y: (x) => 142 + Math.floor(x / 16) },
  { x0: 16, x1: 224, y: (x) => 122 - Math.floor(x / 16) },
  { x0: 0, x1: 208, y: (x) => (x < 144 ? 84 : 76 + Math.floor(x / 16)) },
];
const platform: Girder = { x0: 88, x1: 136, y: (): number => 56 };

const ladders: Ladder[] = [
  { x: 32, top: 128, bottom: 143 },
  { x: 32, top: 194, bottom: 209 },
  { x: 72, top: 126, bottom: 145 },
  { x: 96, top: 190, bottom: 213 },
  { x: 112, top: 157, bottom: 180 },
  { x: 184, top: 95, bottom: 110 },
  { x: 184, top: 161, bottom: 176 },
  { x: 184, top: 227, bottom: 242 },
  // Broken: a stub under the girder above and a stub on the girder below.
  { x: 64, top: 154, bottom: 159 },
  { x: 64, top: 176, bottom: 183 },
  { x: 80, top: 221, bottom: 223 },
  { x: 80, top: 240, bottom: 247 },
  { x: 88, top: 92, bottom: 95 },
  { x: 88, top: 104, bottom: 116 },
  { x: 168, top: 120, bottom: 127 },
  { x: 168, top: 144, bottom: 151 },
];
/** The ladder from the top girder up to the top platform. */
const platformLadder: Ladder = { x: 128, top: 64, bottom: 83 };
/** The two tall ladders behind the Gnome, up from the top girder (Kong's, in the arcade). */
const tallLadders: Ladder[] = [
  { x: 64, top: 32, bottom: 83 },
  { x: 80, top: 32, bottom: 83 },
];

/** A girder as its 8 px columns, each `[x, y]`. */
const columns = (g: Girder): [number, number][] => {
  const out: [number, number][] = [];
  for (let x = g.x0; x < g.x1; x += 8) out.push([x, g.y(x)]);
  return out;
};

/** The top of the girder floor, one per option: where the exit door stands and what reaches it. */
export const tops = {
  t1: {
    girders: [...girders, platform].map((g) => columns(g)),
    ladders: [...ladders, platformLadder, ...tallLadders],
    door: [104, 56],
  },
  t2: {
    girders: [...girders, platform].map((g) => columns(g)),
    ladders: [...ladders, platformLadder],
    door: [104, 56],
  },
  t3: {
    girders: girders.map((g) => columns(g)),
    ladders,
    door: [72, 84],
  },
};

/**
 * A sample conveyor floor, only to judge the conveyor tiles in place; #39
 * lays out the real one. Flat girders top and bottom, three rows of belts
 * between, each split in two belts running opposite ways.
 */
export const conveyorSample = {
  girders: [
    { x0: 0, x1: 224, y: (): number => 248 },
    { x0: 0, x1: 208, y: (): number => 84 },
  ].map((g) => columns(g)),
  /** Belts: x0, x1 (exclusive), y, moving right? */
  belts: [
    [16, 104, 208, true],
    [120, 208, 208, false],
    [8, 96, 168, false],
    [128, 216, 168, true],
    [16, 104, 128, true],
    [120, 208, 128, false],
  ],
  ladders: [
    { x: 24, top: 216, bottom: 247 },
    { x: 192, top: 216, bottom: 247 },
    { x: 104, top: 176, bottom: 207 },
    { x: 56, top: 136, bottom: 167 },
    { x: 160, top: 136, bottom: 167 },
    { x: 104, top: 92, bottom: 127 },
  ],
  door: [104, 84],
};
