// Candidate decorations for the three Brass Monkey prizes (#40). All new: no
// Brass Monkey prize art exists yet. Rows of Sweetie 16 letters, `.` blank.
// Everything hangs on the wall around the Brass Monkey cabinet (hub x 48..63,
// top at y 40); the wall runs from y 27 down to the floor line at y 54.

interface Option {
  id: string;
  label: string;
  rows: readonly string[];
}

/** A wall peg with a short cord down to the sprite's hanging point at column `at`. */
const peg = (rows: readonly string[], at: number): string[] => {
  const w = rows[0]?.length ?? 0;
  const line = (c: string): string => ".".repeat(at) + c + ".".repeat(w - at - 1);
  return [line("m"), line("k"), ...rows];
};

/** A wall shelf under the sprite: a plank and two brackets. */
const shelf = (rows: readonly string[]): string[] => {
  const w = (rows[0]?.length ?? 0) + 2;
  return [...rows.map((r) => `.${r}.`), "k".repeat(w), `k${"o".repeat(w - 2)}k`, `.k${".".repeat(w - 4)}k.`];
};

const gooseneck = [
  "..k.......",
  ".kmk......",
  ".kmk....kk",
  "kkkkk..klk",
  "kllmmkklk.",
  "klwlmmlk..",
  "kllllmk...",
  "klllllk...",
  "kkkkkkk...",
];
const squat = [
  "....k.....",
  "...kok....",
  "..kkkkk..k",
  ".kyyyyokkk",
  "kywyyyyok.",
  "kyrrrryok.",
  "kyyyyyyok.",
  "kkkkkkkkk.",
];
const drum = [
  ".kk.....",
  ".kmk....",
  "kkkkkkk.",
  "krrrrrk.",
  "kwwwwwk.",
  "krkwkrk.",
  "kwwwwwk.",
  "krrrrrk.",
  "kkkkkkk.",
];

const bootShort = [
  "kkkk......",
  "kook......",
  "kook......",
  "kookkkk...",
  "kooooook..",
  "kkkkkkkk..",
  "..kllk....",
  ".kllk.....",
  "..kllk....",
  ".kkkkk....",
];
const bootRed = [
  "kkkk......",
  "krrk......",
  "krrk......",
  "krrrkkkk..",
  "krrrrrrrk.",
  "kwwwwwwwk.",
  "kkkkkkkkk.",
  "..kyyk....",
  ".kyyk.....",
  "..kkkk....",
];
const sneaker = [
  "..kkkk....",
  ".kbbbbk...",
  "kbwbbbbkk.",
  "kbbbbbbbbk",
  "kwwwwwwwwk",
  "kkkkkkkkkk",
  "...kllk...",
  "..kllk....",
  "...kllk...",
  "..kkkkk...",
];

const watchChain = [
  ".....k.....",
  "....kyk....",
  ".....k.....",
  "....kyk....",
  "..kkkkkkk..",
  ".kywwwwwyk.",
  "kywwwkwwwyk",
  "kywwwkwwwyk",
  "kywwwkkkwyk",
  "kywwwwwwwyk",
  ".kywwwwwyk.",
  "..kkkkkkk..",
];
const watchOpen = [
  "....klk....",
  "..kkkkkkk..",
  ".klllllllk.",
  "kllllllllk.",
  "kkkkkkkkkkk",
  ".kwwwkwwwk.",
  "kwwwwkwwwwk",
  "kwwwwkkkwwk",
  "kwwwwwwwwwk",
  ".kwwwwwwwk.",
  "..kkkkkkk..",
];
const gearClock = [
  ".k.kkk.k.",
  "kokooooko",
  ".koyyyok.",
  "koywkwyok",
  "koywkwyok",
  "koywkkyok",
  ".koyyyok.",
  "kokooooko",
  ".k.kkk.k.",
];

export const options: Record<"oil" | "boots" | "watch", readonly Option[]> = {
  oil: [
    { id: "O1", label: "O1 new: steel gooseneck oiler on a shelf", rows: shelf(gooseneck) },
    { id: "O2", label: "O2 new: squat brass oil can, red label, on a shelf", rows: shelf(squat) },
    { id: "O3", label: "O3 new: red-and-white oil drum on a shelf", rows: shelf(drum) },
  ],
  boots: [
    { id: "B1", label: "B1 new: tan boot on a steel spring, hung from a peg", rows: peg(bootShort, 1) },
    { id: "B2", label: "B2 new: red boot, white sole, brass spring, hung from a peg", rows: peg(bootRed, 1) },
    { id: "B3", label: "B3 new: blue sneaker on a steel spring, hung from a peg", rows: peg(sneaker, 4) },
  ],
  watch: [
    { id: "W1", label: "W1 new: gold pocket watch on its chain", rows: watchChain },
    { id: "W2", label: "W2 new: silver watch, lid open, hung from a peg", rows: peg(watchOpen, 5) },
    { id: "W3", label: "W3 new: brass gear clock, hung from a peg", rows: peg(gearClock, 4) },
  ],
};

/** Where each prize hangs: left x and bottom y (exclusive) in hub coordinates. */
export const arrangements = [
  {
    id: "A1",
    label: "A1: can and boot side by side on the wall left of the cabinet, watch above it",
    oil: { x: 36, bottom: 52 },
    boots: { x: 25, bottom: 52 },
    watch: { centre: 56, bottom: 39 },
  },
  {
    id: "A2",
    label: "A2: around the cabinet: can to its left, boot and watch above it",
    oil: { x: 35, bottom: 52 },
    boots: { x: 48, bottom: 39 },
    watch: { centre: 66, bottom: 39 },
  },
];
