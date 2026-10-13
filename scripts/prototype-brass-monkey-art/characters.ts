// PROTOTYPE (throwaway, #38): candidate Brass Monkey characters. Each is
// drawn as its fill (no outline) and given a 1 px black outline by
// `outline`. A monkey is a head (10 rows) over a body; the body is drawn
// once in stand-in letters (1 body, 2 belly, 3 near arm, 4 feet, T tail) and
// recoloured per monkey. The step frames bob 1 px down, as the hub player's do.
import { flipX, mirrorX, outline, overlay, recolour } from "../pixel-art.ts";

type Rows = readonly string[];
const blankRow = "................";
/** `row`, `n` times. */
const repeat = (n: number, row: string): string[] => Array.from({ length: n }, () => row);

/** Walk, jump and climb frames for one monkey, outlined. */
interface MonkeyFrames {
  walk: string[][];
  jump: string[];
  climb: string[][];
}

// Bodies, 6 rows under the 10-row head. Side view, facing right.
const body = {
  stand: ["..T...12221.....", ".T.T.11222113...", ".T..T11222113...", "..TT.11111133...", ".....44..44.....", blankRow],
  stepA: ["..T...12221.....", ".T.T.31122213...", ".T..T3112221....", "..TT..11111.....", "....44....44....", blankRow],
  stepB: ["..T...12221.....", ".T.T.1122233....", ".T..T1122213....", "..TT..11111.....", "......4444......", blankRow],
  jump: ["..T...12221.33..", ".T.T.11222133...", ".T..T1122211....", "..TT.1111111....", "....44.....44...", blankRow],
};
// From behind, climbing: the left arm up beside the head, the right down.
const climbArm = ["..33............", "..33............", "..33............", "..33............"];
const climbBody = [
  "..331111111.....",
  "...311111111....",
  ".....11111133...",
  ".....11111.33...",
  ".....44..33.....",
  ".....44.........",
];

/** A whole monkey from its heads and the colours of its body. */
function monkey(
  side: Rows,
  back: Rows,
  colours: Readonly<Record<"1" | "2" | "3" | "4" | "T", string>>,
  extra: { side?: Rows; back?: Rows } = {},
): MonkeyFrames {
  const paint = (rows: Rows): string[] => recolour(rows, colours);
  const frame = (bodyRows: Rows, bob: boolean): string[] => {
    let rows = [...side, ...paint(bodyRows)];
    if (extra.side) rows = overlay(rows, extra.side, 0, 0);
    // Bob: everything but the feet drops a pixel; the hip row goes under it.
    if (bob) rows = [blankRow, ...rows.slice(0, 13), ...rows.slice(14)];
    return outline(rows);
  };
  let climb = [...overlay(back, paint(climbArm), 0, 6), ...paint(climbBody)];
  if (extra.back) climb = overlay(climb, extra.back, 0, 0);
  return {
    walk: [frame(body.stand, false), frame(body.stepA, true), frame(body.stepB, true)],
    jump: frame(body.jump, false),
    climb: [outline(climb), outline(flipX(climb))],
  };
}

// ---- Monkey A, brass chimp: side view. o brass, y face and belly, r shade, l rivet.
const aSide = [
  blankRow,
  "......oooo......",
  ".....ooooooo....",
  "...rooooyyyo....",
  "..ryrooyykyy....",
  "..rlrooyykyyy...",
  "...rrooyyyyyy...",
  ".....ooyyrryy...",
  "......ooyyyy....",
  ".......ooo......",
];
const aBack = [
  blankRow,
  "......oooo......",
  ".....oooooo.....",
  "...rooooooooor..",
  "..ryroooooooryr.",
  "..rlroooooooorlr",
  "...rrooooooorr..",
  ".....oooooo.....",
  "......oooo......",
  ".......oo.......",
];
const monkeyA = monkey(aSide, aBack, { "1": "o", "2": "y", "3": "r", "4": "r", T: "o" });

// ---- Metallic takes on A, same silhouette. Each has a steel neck joint and
// a cyan eye.

// A1, polished brass: a white glint on the dome, a steel grille for a mouth.
const a1Side = [
  blankRow,
  "......oooo......",
  ".....oywoooo....",
  "...royyoyyyo....",
  "..ryrooyycky....",
  "..rlrooyycky....",
  "...rrooyyyyyy...",
  ".....ooyymlmy...",
  "......ooyyyy....",
  ".......mmm......",
];
const a1Back = overlay(aBack, ["......oywo......", "......yw........"], 0, 1).map((row, y) =>
  y === 9 ? ".......mm......." : row,
);
/** A white glint on the belly. */
const bellyGlint = [...repeat(10, blankRow), "........w.......", ".......w........"];
const monkeyA1 = monkey(a1Side, a1Back, { "1": "o", "2": "y", "3": "r", "4": "r", T: "o" }, { side: bellyGlint });

// A2, brass and steel: a steel face plate, steel arms, feet and tail.
const a2Side = [
  blankRow,
  "......oooo......",
  ".....oywoooo....",
  "...royyolwll....",
  "..ryroollcll....",
  "..rlroollclll...",
  "...rroolllllm...",
  ".....oollkkll...",
  "......oommmm....",
  ".......mmm......",
];
const monkeyA2 = monkey(a2Side, a1Back, { "1": "o", "2": "y", "3": "m", "4": "m", T: "m" }, { side: bellyGlint });

// A3, clockwork: A1 with a bolt on its head, a gear turning behind a window
// in its chest and a wind-up key in its back.
const a3Side = overlay(a1Side, ["........ml......"], 0, 0);
const a3Chest = [...repeat(10, blankRow), ".l.....lml......", ".lmm...mkm......", ".l.....lml......"];
const a3Back = [...repeat(10, blankRow), ".......l........", "......lml.......", ".......m........"];
const monkeyA3 = monkey(
  a3Side,
  overlay(a1Back, ["........ml......"], 0, 0),
  { "1": "o", "2": "y", "3": "r", "4": "m", T: "m" },
  { side: a3Chest, back: a3Back },
);

export const monkeys = { a: monkeyA, a1: monkeyA1, a2: monkeyA2, a3: monkeyA3 };

// ---- Gnomes, 32×32, facing out: D&D gnomes, small with big heads, long
// pointed ears and big noses. Each is drawn as its left 12 columns, mirrored
// to 24 and centred in 32, so the raised arms of the throw frame clear the
// head; `asym` (24 wide) adds what only one side has.
const pad = (rows: Rows): string[] => rows.map((row) => `....${row}....`);

/** A gear held over the head, 10×8, at (11, 2) in the throw frames. */
const heldGear = [
  "...l..l...",
  "..llllll..",
  ".llmmmmll.",
  "llmmkkmmll",
  "llmmkkmmll",
  ".llmmmmll.",
  "..llllll..",
  "...l..l...",
];

/** The left arm raised: out from the shoulder, up past the ear, in to the gear. Each is [x, y], 2 px wide. */
const raisedArm: readonly (readonly [number, number])[] = [
  [5, 23],
  [5, 22],
  [4, 21],
  [4, 20],
  [3, 19],
  [3, 18],
  ...Array.from({ length: 6 }, (_, i) => [2, 12 + i] as const),
  [3, 11],
  [4, 10],
  [5, 9],
  [6, 8],
  [7, 7],
  [8, 6],
];
const raisedHand: readonly (readonly [number, number])[] = [
  [9, 5],
  [10, 5],
  [9, 6],
  [10, 6],
];

function setPixel(rows: string[], x: number, y: number, letter: string): void {
  const row = rows[y];
  if (row !== undefined) rows[y] = row.slice(0, x) + letter + row.slice(x + 1);
}

interface GnomeFrames {
  idle: string[];
  throw: string[];
}

/**
 * A gnome from its left half. `sleeve` colours each raised arm (left, right)
 * and `hand` each hand. `asym` and `throwAsym` (24 wide) are drawn over the
 * idle and throw frames.
 */
function gnome(
  left: Rows,
  sleeve: readonly [string, string],
  hand: readonly [string, string],
  asym: Rows = [],
  throwAsym: Rows = [],
): GnomeFrames {
  const whole = mirrorX(left);
  const idle = pad(asym.length > 0 ? overlay(whole, asym, 0, 0) : whole);
  // The idle arms (the outer 4 columns of rows 22-28) come off for the throw.
  const armless = whole.map((row, y) => (y >= 22 && y <= 28 ? "...." + row.slice(4, 20) + "...." : row));
  const raised = pad(throwAsym.length > 0 ? overlay(armless, throwAsym, 0, 0) : armless);
  for (const [x, y] of raisedArm) {
    for (const dx of [0, 1]) {
      setPixel(raised, x + dx, y, sleeve[0]);
      setPixel(raised, 31 - x - dx, y, sleeve[1]);
    }
  }
  for (const [x, y] of raisedHand) {
    setPixel(raised, x, y, hand[0]);
    setPixel(raised, 31 - x, y, hand[1]);
  }
  return { idle: outline(idle), throw: outline(overlay(raised, heldGear, 11, 2)) };
}

const top6 = repeat(6, "............");

// Gnome 1, artificer: a shock of white hair and bushy brows, goggles pushed
// up, a teal work coat with a belt and buckle.
const g1 = gnome(
  [
    ...top6,
    "............",
    "....w..ww..w",
    "....ww.wwwww",
    "...wwwwwwwww",
    "..wwwmmmmmmm",
    "..wwmcccmmmm",
    "..wwmcwcmmmm",
    "..wwwmmmoooo",
    "o..wwooooooo",
    "oo.wowwwoooo",
    ".oowooookooy",
    "..woooookoro",
    "..wroooooroo",
    "...ooooooorr",
    "...woooookkk",
    "....oooooooo",
    ".....tttttww",
    "...ntttttttw",
    "..nnttttttyw",
    "..nnddddddyy",
    "..nntttttttt",
    "..oottttttt.",
    ".....mmmm...",
    ".....mmmm...",
    "....kkkkk...",
    "....kkkkkk..",
  ],
  ["n", "n"],
  ["o", "o"],
);

// Gnome 2, illusionist: a flame of red hair, sly brows, a pointed goatee, a
// purple robe with gold trim.
const g2 = gnome(
  [
    "............",
    "............",
    "............",
    "............",
    "..........rr",
    ".........rrr",
    "......r.rrrr",
    ".....rrrrrrr",
    "....rrrrrrrr",
    "...rrrrrrrrr",
    "...rrrrrrrrr",
    "..rrrrrrrrrr",
    "..rrrooooooo",
    "o.rroooooooo",
    "oo.rokkkoooo",
    ".oooowkooooo",
    "..oooooooory",
    "..oroooooroy",
    "...oooooorro",
    "...ooooookkk",
    "....ooooorrr",
    "....ppppyyrr",
    "..p.pppppyyr",
    ".pp.ppppppyy",
    ".pp.pppppppy",
    ".pp.pppppppy",
    ".oo.pppppppy",
    "....pppppppy",
    "....yyyyyyyy",
    ".....mm.....",
    "....kkkk....",
    "...kkkkk....",
  ],
  ["p", "p"],
  ["o", "o"],
);

// Gnome 3, engineer: bald with a shine, welding goggles over the eyes, white
// mutton chops and moustache, a red shirt under blue overalls, and a steel
// arm on the right with a claw.
const g3Claw = [
  ...repeat(23, "........................"),
  "....................ml..",
  "....................lm..",
  "....................ml..",
  "....................lm..",
  "...................l..l.",
  "...................l..l.",
];
const g3Shine = [
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........................",
  "........yw..............",
  ".......yy...............",
];
const g3ClawRaised = [
  "........................",
  "........................",
  "........................",
  "..............l..l......",
  "..............l..l......",
  "..............ll........",
];
const g3 = gnome(
  [
    ...top6,
    "............",
    "........oooo",
    "......oooooo",
    ".....ooooooo",
    "....oooooooo",
    "...ooooooooo",
    "o..mmmmmmmmm",
    "oo.mccccmmmm",
    ".oomcwccmooo",
    "..wmccccmooo",
    "..wwmmmmooory",
    "..wwwoooorroy",
    "..wwwwoooorro",
    "..wwwwwwwwww",
    "...wwwwwwwww",
    "....wwwookkk",
    "...rrrbbbbbb",
    "..rrrrbbbbbb",
    "..rrrrbbbyyb",
    "..rrbbbbbbbb",
    "..rrbbbbbbbb",
    "..oobbbbbbbb",
    "......bbbb..",
    "......bbbb..",
    ".....kkkkk..",
    "....kkkkkk..",
  ].map((row) => row.slice(0, 12)),
  ["r", "m"],
  ["o", "l"],
  overlay(g3Claw, g3Shine, 0, 0),
  overlay([...g3ClawRaised, ...repeat(4, "........................")], g3Shine, 0, 0),
);

export const gnomes = { g1, g2, g3 };

/** Every frame by name, for the scratch sheet. */
export const sheet = {
  ...Object.fromEntries(Object.entries(monkeys).map(([k, m]) => [`monkey-${k}`, [...m.walk, m.jump, ...m.climb]])),
  ...Object.fromEntries(Object.entries(gnomes).map(([k, g]) => [`gnome-${k}`, [g.idle, g.throw]])),
};
