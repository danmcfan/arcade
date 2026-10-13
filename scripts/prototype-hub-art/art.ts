// PROTOTYPE (throwaway, #17 / PR #43): hub art options to choose between.
// Three options each for the player, the cabinets, the room and the prize
// counter, all in Sweetie 16, as rows of palette letters (`.` is blank).
// render.ts turns them into option sheets, in-room composites and a
// mix-and-match viewer. Once options are picked, the winners are redrawn into
// src/ui/ and this folder is deleted.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";

/** Sweetie 16, one letter per colour, shared by every option. */
export const pal: Readonly<Record<string, string>> = {
  k: "#1a1c2c", // black
  p: "#5d275d", // purple
  r: "#b13e53", // red
  o: "#ef7d57", // orange
  y: "#ffcd75", // yellow
  G: "#a7f070", // lime
  g: "#38b764", // green
  t: "#257179", // teal
  n: "#29366f", // navy
  b: "#3b5dc9", // blue
  B: "#41a6f6", // sky
  c: "#73eff7", // cyan
  w: "#f4f4f4", // white
  l: "#94b0c2", // light grey
  s: "#566c86", // slate
  d: "#333c57", // dark slate
};

export type Title = "brassMonkey" | "sweet" | "firefly";
export const titles: readonly Title[] = ["brassMonkey", "sweet", "firefly"];

export interface Option<T> {
  key: string;
  name: string;
  note: string;
  art: T;
}

function check(name: string, rows: readonly string[], w: number, h?: number): string[] {
  rows.forEach((r, i) => {
    if (r.length !== w) throw new Error(`${name} row ${i} is ${r.length} wide, want ${w}: "${r}"`);
  });
  if (h !== undefined && rows.length !== h) throw new Error(`${name} has ${rows.length} rows, want ${h}`);
  return [...rows];
}

// ---------------------------------------------------------------- player


/** gamer.png (the original Go sprite sheet, copied here from main as the reference) as palette letters, 64x96. */
function readGamer(): string[][] {
  const png = PNG.sync.read(readFileSync(join(import.meta.dir, "gamer.png")));
  const byHex = Object.fromEntries(Object.entries(pal).map(([k, v]) => [v.slice(1), k]));
  const grid: string[][] = [];
  for (let y = 0; y < png.height; y++) {
    const row: string[] = [];
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      if (png.data[i + 3] === 0) {
        row.push(".");
        continue;
      }
      const hex = [0, 1, 2].map((j) => png.data[i + j]!.toString(16).padStart(2, "0")).join("");
      const letter = byHex[hex];
      if (letter === undefined) throw new Error(`gamer.png has non-Sweetie colour #${hex}`);
      row.push(letter);
    }
    grid.push(row);
  }
  return grid;
}

type Sheet = string[][];
const fw = 16;
const fh = 24;
const dirRows = { UP: 0, DOWN: 1, LEFT: 2, RIGHT: 3 } as const;
type Dir = keyof typeof dirRows;

function eachFrame(sheet: Sheet, fn: (dir: Dir, ox: number, oy: number) => void): void {
  for (const dir of Object.keys(dirRows) as Dir[]) {
    for (let f = 0; f < 4; f++) fn(dir, f * fw, dirRows[dir] * fh);
  }
}

/** First row with any pixel in the frame at (ox, oy): walk frames bob 1 px. */
function topRow(sheet: Sheet, ox: number, oy: number): number {
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) if (sheet[oy + y]![ox + x] !== ".") return y;
  }
  return fh;
}

/** Recolour `from` to `to` in each frame, only in frame rows `fromRow` and below. */
function recolour(sheet: Sheet, map: Record<string, string>, fromRow: number): Sheet {
  const out = sheet.map((r) => [...r]);
  eachFrame(out, (_d, ox, oy) => {
    for (let y = fromRow; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const px = out[oy + y]![ox + x]!;
        if (map[px] !== undefined) out[oy + y]![ox + x] = map[px]!;
      }
    }
  });
  return out;
}

/**
 * Paint an overlay (drawn against the idle frame of each direction, whose
 * hair starts on row 3) onto every frame of that direction, following the
 * walk bob.
 */
function overlay(sheet: Sheet, art: Record<Dir, readonly string[]>): Sheet {
  const out = sheet.map((r) => [...r]);
  eachFrame(out, (dir, ox, oy) => {
    const dy = topRow(out, ox, oy) - 3;
    art[dir].forEach((row, y) => {
      [...row].forEach((px, x) => {
        if (px !== ".") out[oy + y + dy]![ox + x] = px;
      });
    });
  });
  return out;
}

const gamer = readGamer();

/** Headphones over the original's hair: a cyan band and sky-blue cups. */
const headphones: Record<Dir, readonly string[]> = {
  UP: [
    "................",
    "................",
    "................",
    "................",
    "................",
    "..kcccccccccck..",
    ".kck........kck.",
    ".kBk........kBk.",
    ".kBk........kBk.",
    "kBBBk......kBBBk",
    "kBcBk......kBcBk",
    "kBBBk......kBBBk",
    ".kkk........kkk.",
  ],
  DOWN: [
    "................",
    "................",
    "................",
    "................",
    "................",
    "..kcccccccccck..",
    ".kck........kck.",
    ".kBk........kBk.",
    ".kBk........kBk.",
    "kBBBk......kBBBk",
    "kBcBk......kBcBk",
    "kBBBk......kBBBk",
    ".kkk........kkk.",
  ],
  LEFT: [
    "................",
    "................",
    "................",
    "................",
    ".......kck......",
    "........kck.....",
    ".........kBk....",
    ".........kBk....",
    ".........kBk....",
    ".........kBk....",
    "........kBBBk...",
    "........kBcBk...",
    "........kBBBk...",
    ".........kkk....",
  ],
  RIGHT: [
    "................",
    "................",
    "................",
    "................",
    "......kck.......",
    ".....kck........",
    "....kBk.........",
    "....kBk.........",
    "....kBk.........",
    "....kBk.........",
    "...kBBBk........",
    "...kBcBk........",
    "...kBBBk........",
    "....kkk.........",
  ],
};

export const players: readonly Option<Sheet>[] = [
  {
    key: "A",
    name: "Original",
    note: "gamer.png as it is: spiky black-and-purple hair, teal tee, jeans.",
    art: gamer,
  },
  {
    key: "B",
    name: "Red hoodie",
    note: "Same head and hair; red hoodie, blue jeans, white sneakers, so the body pops on dark floors.",
    art: recolour(gamer, { t: "r", d: "w" }, 16),
  },
  {
    key: "C",
    name: "Headphones",
    note: "Same head and hair plus cyan headphones; orange tee and white sneakers.",
    art: recolour(overlay(gamer, headphones), { t: "o", d: "w" }, 16),
  },
];

// ---------------------------------------------------------------- cabinets

/** A cabinet's colours: hi (lit marquee), mid (trim), body, dark (side/shade). */
export const cabinetColours: Readonly<Record<Title, { hi: string; mid: string; body: string; dark: string }>> = {
  brassMonkey: { hi: "G", mid: "g", body: "t", dark: "n" },
  sweet: { hi: "y", mid: "o", body: "r", dark: "p" },
  firefly: { hi: "c", mid: "B", body: "b", dark: "n" },
};

/** A tiny glimpse of each game on its screen, 8x5 (cropped for smaller screens). */
const screens: Readonly<Record<Title, readonly string[]>> = {
  brassMonkey: ["nnnnnnnn", "nnnnnnyn", "nnynnnnn", "nyyyngGg", "ggggnnnn"],
  sweet: ["nnnnnnnn", "nwnnyynn", "nnnyooyn", "nnnyooyn", "nnnnyynn"],
  firefly: ["knnnnknn", "nnGnnnnn", "nnnnnnyn", "nGnnknnn", "tttttttt"],
};

interface CabinetArt {
  /** Rows with 1 = hi, 2 = mid, 3 = body, 4 = dark, S = screen. */
  rows: readonly string[];
  /** Pixels painted on the floor in front, in hub-image offsets from the art's top-left. */
  glow?: boolean;
}

const classic = check(
  "classic",
  [
    ".kkkkkkkkkkkkkk.",
    "k22222222222222k",
    "k21111111111112k",
    "k22222222222222k",
    "kkkkkkkkkkkkkkkk",
    ".k333333333334k.",
    ".k3kkkkkkkkkk4k.",
    ".k3kSSSSSSSSk4k.",
    ".k3kSSSSSSSSk4k.",
    ".k3kSSSSSSSSk4k.",
    ".k3kSSSSSSSSk4k.",
    ".k3kSSSSSSSSk4k.",
    ".k3kkkkkkkkkk4k.",
    ".k333333333334k.",
    "kkkkkkkkkkkkkkkk",
    "k2k222222222222k",
    "k2k222221212222k",
    "kkkkkkkkkkkkkkkk",
    ".k333333333334k.",
    ".k3333kkkk3334k.",
    ".k3333k11k3334k.",
    ".k3333kkkk3334k.",
    ".k333333333334k.",
    ".kkkkkkkkkkkkkk.",
  ],
  16,
  24,
);

/** Seen a little from the left: the top and the right side panel show. */
const deep = check(
  "deep",
  [
    "..kkkkkkkkkkkkkk",
    ".k333333333333kk",
    "kkkkkkkkkkkkk44k",
    "k22222222222k44k",
    "k21111111112k44k",
    "k22222222222k44k",
    "kkkkkkkkkkkkk44k",
    "k33333333333k44k",
    "k3kkkkkkkkk3k44k",
    "k3kSSSSSSSk3k44k",
    "k3kSSSSSSSk3k44k",
    "k3kSSSSSSSk3k44k",
    "k3kSSSSSSSk3k44k",
    "k3kkkkkkkkk3k44k",
    "k33333333333k44k",
    "kkkkkkkkkkkkk44k",
    "k22222222222k44k",
    "k2k21212222kk44k",
    "kkkkkkkkkkkkk44k",
    "k33333333333k44k",
    "k333kkkkk333k44k",
    "k333k111k333k4k.",
    "k333kkkkk333kk..",
    "kkkkkkkkkkkkk...",
  ],
  16,
  24,
);

/** Slim body, wide lit marquee with chaser bulbs, neon ring round the screen, light spill on the floor. */
const neon = check(
  "neon",
  [
    "kkkkkkkkkkkkkkkk",
    "k11111111111111k",
    "k1w11w11w11w111k",
    "k11111111111111k",
    "kkkkkkkkkkkkkkkk",
    "..k3333333333k..",
    "..k3111111113k..",
    "..k31SSSSSS13k..",
    "..k31SSSSSS13k..",
    "..k31SSSSSS13k..",
    "..k31SSSSSS13k..",
    "..k31SSSSSS13k..",
    "..k3111111113k..",
    ".kkkkkkkkkkkkkk.",
    ".k2k2222222222k.",
    ".k2k2121212222k.",
    ".kkkkkkkkkkkkkk.",
    "..k3333333333k..",
    "..k3333333333k..",
    "..k33kkkkkk33k..",
    "..k33k1111k33k..",
    "..k33kkkkkk33k..",
    "..k3333333333k..",
    "..kkkkkkkkkkkk..",
  ],
  16,
  24,
);

export const cabinets: readonly Option<CabinetArt>[] = [
  { key: "A", name: "Classic upright", note: "Front-on: lit marquee, recessed screen showing its game, joystick panel, glowing coin door.", art: { rows: classic } },
  { key: "B", name: "Three-quarter", note: "Seen a little from the left, so the top and side panel give it depth.", art: { rows: deep } },
  { key: "C", name: "Neon", note: "Slim body, chaser-bulb marquee, neon ring round the screen, and a pool of its light on the floor.", art: { rows: neon, glow: true } },
];

/** One cabinet in its title's colours, with its screen. */
export function cabinetRows(art: CabinetArt, title: Title): string[] {
  const c = cabinetColours[title];
  const scr = screens[title];
  // Screen pixels are numbered left to right within their row of `S`s.
  let firstScreenRow = -1;
  return art.rows.map((row, y) => {
    const sx = row.indexOf("S");
    if (sx >= 0 && firstScreenRow < 0) firstScreenRow = y;
    return [...row]
      .map((px, x) => {
        switch (px) {
          case "1":
            return c.hi;
          case "2":
            return c.mid;
          case "3":
            return c.body;
          case "4":
            return c.dark;
          case "S":
            return scr[y - firstScreenRow]?.[x - sx] ?? "n";
          default:
            return px;
        }
      })
      .join("");
  });
}

// ---------------------------------------------------------------- rooms

export const roomW = 160;
export const roomH = 144;
/** The walkable floor and the visible wall face, in hub-image coordinates (as on main). */
export const floor = { x: 24, y: 56, w: 112, h: 64 } as const;
const wallTop = 24;

type RoomFn = (x: number, y: number) => string;

function inRoom(fn: RoomFn): RoomFn {
  return (x, y) => {
    if (x < floor.x || x >= floor.x + floor.w || y < wallTop || y >= floor.y + floor.h) return "k";
    return fn(x - floor.x, y);
  };
}

/** Light slate checker; two-tone panelled wall with a rail. */
const diner: RoomFn = inRoom((x, y) => {
  if (y < floor.y) {
    if (y === wallTop) return "d";
    if (y < 42) return "p";
    if (y === 42) return "l";
    if (y === 43) return "s";
    if (y >= 54) return y === 54 ? "s" : "k";
    // Wainscot panels, 16 px wide.
    const px = x % 16;
    if (px === 0) return "k";
    if (y === 44 || px === 1) return "d";
    return "n";
  }
  const fy = y - floor.y;
  if (fy === 0) return "d"; // the wall's shadow on the floor
  const sq = Math.trunc(x / 8) + Math.trunc(fy / 8);
  return sq % 2 === 0 ? "l" : "s";
});

/** Dark navy carpet with a sparse confetti print; dark wall with a cyan neon tube. */
const confetti = [
  "................",
  "..b.............",
  ".bbb.......p....",
  "..b.......p.....",
  ".........p......",
  "....t...........",
  "................",
  "..............c.",
  "........y.......",
  "....p...........",
  "...ppp......t...",
  "............tt..",
  ".b..............",
  "..........c.....",
  "......t.........",
  "................",
] as const;
const carpet: RoomFn = inRoom((x, y) => {
  if (y < floor.y) {
    if (y === wallTop) return "k";
    if (y === 25) return "B";
    if (y === 26) return "c";
    if (y === 27) return "B";
    if (y === 28) return "n";
    if (y >= 53) return y === 53 ? "p" : y === 54 ? "r" : "k";
    return "d";
  }
  const fy = y - floor.y;
  if (fy === 0) return "k";
  const px = confetti[fy % 16]![x % 16]!;
  return px === "." ? "n" : px;
});

/** Big pale stone tiles; navy wall with a sky racing stripe. */
const tiles: RoomFn = inRoom((x, y) => {
  if (y < floor.y) {
    if (y === wallTop) return "k";
    if (y >= 36 && y <= 38) return y === 37 ? "B" : "b";
    if (y >= 53) return y === 53 ? "l" : y === 54 ? "s" : "k";
    return "n";
  }
  const fy = y - floor.y;
  if (fy === 0) return "s";
  const tx = x % 16;
  const ty = (fy - 1) % 16;
  if (tx === 15 || ty === 15) return "s"; // grout
  if (tx === 0 || ty === 0) return "w"; // lit edge
  return "l";
});

export const rooms: readonly Option<RoomFn>[] = [
  { key: "A", name: "Diner", note: "Light slate checker (calmer than main's black-and-white) under a purple wall with navy wainscot and a rail.", art: diner },
  { key: "B", name: "Arcade carpet", note: "Dark navy arcade carpet with a sparse confetti print; dark wall lit by a cyan neon tube.", art: carpet },
  { key: "C", name: "Stone tiles", note: "Big pale 16 px tiles with lit edges; navy wall with a sky-blue stripe.", art: tiles },
];

export function roomRows(fn: RoomFn): string[] {
  const rows: string[] = [];
  for (let y = 0; y < roomH; y++) {
    let r = "";
    for (let x = 0; x < roomW; x++) r += fn(x, y);
    rows.push(r);
  }
  return rows;
}

// ---------------------------------------------------------------- prize counter

/** 3x5 capitals for the booth's sign. */
const font3: Record<string, readonly string[]> = {
  P: ["###", "#.#", "###", "#..", "#.."],
  R: ["##.", "#.#", "##.", "#.#", "#.#"],
  I: ["###", ".#.", ".#.", ".#.", "###"],
  Z: ["###", "..#", ".#.", "#..", "###"],
  E: ["###", "#..", "##.", "#..", "###"],
  S: [".##", "#..", ".#.", "..#", "##."],
};

function stamp(rows: string[], text: string, x0: number, y0: number, ink: string): string[] {
  const g = rows.map((r) => [...r]);
  [...text].forEach((ch, i) => {
    font3[ch]!.forEach((line, y) => {
      [...line].forEach((px, x) => {
        if (px === "#") g[y0 + y]![x0 + i * 4 + x] = ink;
      });
    });
  });
  return g.map((r) => r.join(""));
}

/** The counter on main, with glass glints and a darker kick board. */
const glassCase = check(
  "glassCase",
  [
    ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
    "kyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyk",
    "kooooooooooooooooooooooooooooooooooooook",
    "krrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrk",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
    "krkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkrk",
    "krkcwnnnnnnnnnncnnnnnnnnnnnnncnnnnnnnkrk",
    "krkwnnnnynnnnnBBnnnoonoonnrrnrrnnngnnkrk",
    "krknnnyyyyynnBwBBnnooooonnrrrrrnngggnkrk",
    "krknnnnyyynnnBBBBnnoyoyonnnrrrnnnnGnnkrk",
    "krknnnnynynnnnBBnnnnooonnnnnrnnnnnGnnkrk",
    "krkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkrk",
    "kppppppppppppppppppppppppppppppppppppppk",
    ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
  ],
  40,
  14,
);

/** White top with a till and a ticket roll; red-and-white candy-stripe front with a PRIZES sign. */
const booth = check(
  "booth",
  stamp(
    [
      ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
      "kwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwk",
      "kwkookwwwwwwwwwwwwwwwwwwwwwwwwwkkkkkkwwk",
      "kwkoykllllllllllllllllllllllllkGGGGkkllk",
      "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
      "krwwrrwkkkkkkkkkkkkkkkkkkkkkkkkkkkwwrrwk",
      "krwwrrwkyyyyyyyyyyyyyyyyyyyyyyyyykwwrrwk",
      "krwwrrwkyyyyyyyyyyyyyyyyyyyyyyyyykwwrrwk",
      "krwwrrwkyyyyyyyyyyyyyyyyyyyyyyyyykwwrrwk",
      "krwwrrwkyyyyyyyyyyyyyyyyyyyyyyyyykwwrrwk",
      "krwwrrwkyyyyyyyyyyyyyyyyyyyyyyyyykwwrrwk",
      "krwwrrwkkkkkkkkkkkkkkkkkkkkkkkkkkkwwrrwk",
      "krwwrrwwrrwwrrwwrrwwrrwwrrwwrrwwrrwwrrwk",
      ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
    ],
    "PRIZES",
    9,
    6,
    "r",
  ),
  40,
  14,
);

/** Plush prizes sit on the counter and peek over its top; purple front with gold trim. */
const plush = check(
  "plush",
  [
    "..kk..kk.....kkk...........kkkk.....kk..",
    ".kook.kook..kyyyk.........kBBBBk...kGGk.",
    ".koooooook.kyykyyk...kkk..kBwBBk..kGrGGk",
    ".kokooookok.kyyyyook.krrrk.kBBBk..kkGGGk",
    "kkkooyyookkkkkyyykkkkrrrrkkkkkkkkkkkGkkk",
    "kyykyyyykyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyk",
    "kooooooooooooooooooooooooooooooooooooook",
    "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
    "kyppppppppppppppppppppppppppppppppppppyk",
    "kyppyyyyppppyyyyppppyyyyppppyyyyppppppyk",
    "kyppyooyppppyooyppppyooyppppyooyppppppyk",
    "kyppyyyyppppyyyyppppyyyyppppyyyyppppppyk",
    "kyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyk",
    ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
  ],
  40,
  14,
);

export const counters: readonly Option<readonly string[]>[] = [
  { key: "A", name: "Glass case", note: "Main's counter, tidied: glass glints over the prizes, a purple kick board.", art: glassCase },
  { key: "B", name: "Ticket booth", note: "Candy-stripe front with a PRIZES sign; a till and a ticket roll on the white top.", art: booth },
  { key: "C", name: "Plush shelf", note: "Plushies (bear, duck, ball, flower) peek over the top; purple front with gold trim and ticket panels.", art: plush },
];
