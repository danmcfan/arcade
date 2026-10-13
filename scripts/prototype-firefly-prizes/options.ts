// Candidate decorations for the three Firefly prizes (#35). All new: no
// Firefly prize art exists yet. Rows of Sweetie 16 letters, `.` blank. Each
// option says where it stands relative to the Firefly cabinet (hub x 96..111,
// y 40..63; the Sweet Sam running shoes already fill the gap to its left).

interface Option {
  id: string;
  label: string;
  /** Top-left in hub-image coordinates. */
  x: number;
  y: number;
  /** Frames; more than one animates (a flicker or glow). */
  frames: readonly (readonly string[])[];
}

const lanternL1 = ["...kk...", "..k..k..", ".kkkkkk.", "kmyyyymk", "kygwwgyk", "kygwwgyk", "kmyyyymk", ".kkkkkk."];
const lanternL2 = ["..kkk...", ".k...k..", ".kkkkk..", "krorrrk.", "kroyorrk", "kroyorrk", "krrorrrk", ".kkkkk.."];
const lanternL3 = ["..kk....", ".k..k...", "kkkkkk..", "klgggk..", "kgylgk..", "kglggk..", "kkkkkk.."];

/** A wall bracket over a lantern: plate on the wall, an arm, a hook down at `hook`. */
const hung = (rows: readonly string[], hook: number): string[] => [
  "kk......",
  `km${"m".repeat(hook - 2)}k`.padEnd(8, "."),
  `kk${".".repeat(hook - 2)}k`.padEnd(8, "."),
  ...rows,
];

export const options = {
  lantern: [
    {
      id: "L1",
      label: "L1 new: brass storm lantern on a wall bracket",
      x: 112,
      y: 56,
      frames: [
        hung(lanternL1, 4),
        hung(
          lanternL1.map((r) => r.replaceAll("w", "y")),
          4,
        ),
      ],
    },
    {
      id: "L2",
      label: "L2 new: red paper lantern on a wall bracket",
      x: 112,
      y: 56,
      frames: [
        hung(lanternL2, 3),
        hung(
          lanternL2.map((r) => r.replaceAll("y", "o")),
          3,
        ),
      ],
    },
    {
      id: "L3",
      label: "L3 new: firefly jar on a wall bracket",
      x: 112,
      y: 57,
      frames: [
        hung(lanternL3, 2),
        hung(
          lanternL3.map((r) => r.replaceAll("y", "g")),
          2,
        ),
      ],
    },
  ],
  glowStick: [
    {
      id: "G1",
      label: "G1 new: lime stick",
      x: 120,
      y: 54,
      frames: [
        ["..kk", ".kgk", ".kgk", "kgwk", "kgk.", "kgk.", "kgk.", "kgk.", "kk.."],
        ["..kk", ".kGk", ".kgk", "kgwk", "kgk.", "kGk.", "kgk.", "kgk.", "kk.."],
      ],
    },
    {
      id: "G2",
      label: "G2 new: cyan stick hanging on the wall",
      x: 88,
      y: 30,
      frames: [
        [".k.", "k.k", ".k.", "kck", "kwk", "kck", "kck", "kck", "kck", ".k."],
        [".k.", "k.k", ".k.", "kck", "kck", "kBk", "kck", "kck", "kBk", ".k."],
      ],
    },
    {
      id: "G3",
      label: "G3 new: three sticks crossed on the wall",
      x: 112,
      y: 30,
      frames: [
        ["g.c.o", "g.c.o", ".gco.", ".gco.", "..c..", ".ocg.", ".ocg.", "o.c.g", "o.c.g"],
        ["G.c.o", "g.B.o", ".gco.", ".Gcr.", "..c..", ".ocg.", ".rBg.", "o.c.G", "o.c.g"],
      ],
    },
  ],
  wings: [
    {
      id: "W1",
      label: "W1 new: firefly wings pinned in a frame",
      x: 98,
      y: 27,
      frames: [
        [
          "kkkkkkkkkkkk",
          "kmmmmmmmmmmk",
          "kmnnnnnnnnmk",
          "kmcBnnnnBcmk",
          "kmccBkkBccmk",
          "kmncBkkBcnmk",
          "kmnccyyccnmk",
          "kmnnnyynnnmk",
          "kmnnnnnnnnmk",
          "kmmmmmmmmmmk",
          "kkkkkkkkkkkk",
        ],
      ],
    },
    {
      id: "W2",
      label: "W2 new: wings mounted bare on the wall",
      x: 98,
      y: 30,
      frames: [
        [
          ".kk......kk.",
          "kcBk....kBck",
          "kccBk..kBcck",
          ".kccBkkBcck.",
          "..kcckkcck..",
          "...kkyykk...",
          "....kyyk....",
          ".....kk.....",
        ],
      ],
    },
    {
      id: "W3",
      label: "W3 new: winged pennant",
      x: 98,
      y: 28,
      frames: [
        [
          "kkkkkkkkkkkk",
          "kbbbbbbbbbbk",
          ".kbcwbbwcbk.",
          ".kbccbbccbk.",
          "..kbcyycbk..",
          "..kbbyybbk..",
          "...kbbbbk...",
          "....kbbk....",
          ".....kk.....",
        ],
      ],
    },
  ],
} as const satisfies Record<string, readonly Option[]>;

// Where the three hang on the wall (hub wall: y 29..52; Firefly cabinet x 96..111,
// top y 40; the 8 px gap x 88..95 sits between it and Sweet Sam's cabinet).
// Positions override each option's own x, y.
type Spot = { x: number; y: number };
export const arrangements = [
  {
    id: "A1",
    label: "A1 new: flank (glow stick left of the cabinet, wings above, lantern right)",
    lantern: { x: 113, y: 36 },
    glowStick: { x: 90, y: 34 },
    wings: { x: 98, y: 31 },
  },
  {
    id: "A2",
    label: "A2 new: right (wings above, lantern and glow stick side by side right of it)",
    lantern: { x: 113, y: 36 },
    glowStick: { x: 124, y: 36 },
    wings: { x: 98, y: 31 },
  },
] as const satisfies readonly ({ id: string; label: string } & Record<keyof typeof options, Spot>)[];
