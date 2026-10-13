// PROTOTYPE (throwaway, #72): inlines the hub room's rows into
// prototype-hub-frame/viewer.html so the owner can steer how the walls and
// floor extend to fill the 160×144 frame. `bun scripts/prototype-hub-frame.ts`
// writes out/prototype-hub-frame/index.html and prints its path.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { hubRoomRows } from "./gen-ui-art.ts";
import { counterRect } from "../src/arcade/prizeCounter.ts";
import { prizes } from "../src/arcade/prizes.ts";
import { counterArt } from "../src/ui/counterArt.ts";
import { glyphs } from "../src/ui/glyphs.ts";
import { icons } from "../src/ui/icons.ts";
import { playerFramesFor } from "../src/ui/playerArt.ts";
import { prizeArt } from "../src/ui/prizeArt.ts";
import { sweetie } from "../src/ui/sweetie16.ts";

// The wall prizes in flight, copied from PR #73 (Firefly) and PR #74 (Brass
// Monkey) so the owner can judge the room with them hanging. Wings is the
// left half; mirrored here as their generator does.
const wingsHalf = [".kk...", "kcBk..", "kccBk.", ".kccBk", "..kcck", "...kky", "....ky", ".....k"];
const inFlight = [
  {
    pr: 73,
    x: 113,
    y: 36,
    rows: [
      "kk......",
      "kmmmk...",
      "kk..k...",
      "...kk...",
      "..k..k..",
      ".kkkkkk.",
      "kmyyyymk",
      "kygwwgyk",
      "kygwwgyk",
      "kmyyyymk",
      ".kkkkkk.",
    ],
  },
  { pr: 73, x: 92, y: 34, rows: [".k.", "k.k", ".k.", "kck", "kwk", "kck", "kck", "kck", "kck", ".k."] },
  { pr: 73, x: 98, y: 31, rows: wingsHalf.map((r) => r + Array.from(r).toReversed().join("")) },
  {
    pr: 74,
    x: 35,
    y: 41,
    rows: [
      ".....k......",
      "....kok.....",
      "...kkkkk..k.",
      "..kyyyyokkk.",
      ".kywyyyyok..",
      ".kyrrrryok..",
      ".kyyyyyyok..",
      ".kkkkkkkkk..",
      "kkkkkkkkkkkk",
      "kooooooooook",
      ".k........k.",
    ],
  },
  {
    pr: 74,
    x: 48,
    y: 27,
    rows: [
      ".m........",
      ".k........",
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
    ],
  },
  {
    pr: 74,
    x: 62,
    y: 28,
    rows: [
      "....m....",
      "....k....",
      ".k.kkk.k.",
      "kokooooko",
      ".koyyyok.",
      "koywkwyok",
      "koywkwyok",
      "koywkkyok",
      ".koyyyok.",
      "kokooooko",
      ".k.kkk.k.",
    ],
  },
];

const data = {
  inFlight,
  glyphs,
  icons,
  palette: sweetie,
  room: hubRoomRows(),
  counter: { rows: counterArt, x: counterRect.x, y: counterRect.y },
  prizes: prizes.map((p) => ({ rows: prizeArt[p.id], x: p.x, y: p.y })),
  walk: { LEFT: playerFramesFor("LEFT"), RIGHT: playerFramesFor("RIGHT") },
};

const html = readFileSync("scripts/prototype-hub-frame/viewer.html", "utf8").replace(/\/\*DATA\*\/\s*null/u, () =>
  JSON.stringify(data),
);
mkdirSync("out/prototype-hub-frame", { recursive: true });
writeFileSync("out/prototype-hub-frame/index.html", html);
console.log("out/prototype-hub-frame/index.html");
