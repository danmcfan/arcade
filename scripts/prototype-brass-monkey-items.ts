// PROTOTYPE (throwaway, #38 phase 3): the candidate Brass Monkey items
// (prototype-brass-monkey-items/items.ts), inlined into
// prototype-brass-monkey-items/viewer.html with the picked monkey and Gnome so
// the owner can pick a gear, an ember and a bolt before the art moves into
// src/brass-monkey/art.ts (the picks: gear=G1 ember=E1 bolt=B3).
// `bun scripts/prototype-brass-monkey-items.ts` writes
// out/prototype-brass-monkey-items/index.html and prints its path.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { bolts, embers, gears } from "./prototype-brass-monkey-items/items.ts";
import { gnomes, monkeys } from "./prototype-brass-monkey-art/characters.ts";
import { sweetie } from "../src/ui/sweetie16.ts";

const data = {
  sweetie,
  monkey: monkeys.a1.walk,
  gnome: [gnomes.g1.idle, gnomes.g1.throw],
  gears: [
    {
      id: "G1",
      name: "Steel, small",
      tag: "new, from the Gnome's held gear",
      note: "Eight teeth and a square hub, in the steel of the gear the Gnome lifts in its throw frame. Two frames, turned half a tooth.",
      frames: gears.g1,
    },
    {
      id: "G2",
      name: "Brass, small",
      tag: "new",
      note: "G1 in the monkey's brass. Picking it also means recolouring the gear in the Gnome's throw frame to match.",
      frames: gears.g2,
    },
    {
      id: "G3",
      name: "Steel, big",
      tag: "new",
      note: "As big as the monkey. Eight teeth and four windows that swap between the diagonals and the axes as it turns.",
      frames: gears.g3,
    },
  ],
  embers: [
    {
      id: "E1",
      name: "Living ember",
      tag: "new",
      note: "A flame with two eyes, like the arcade classic. Flickers and sways over 4 frames.",
      frames: embers.e1,
    },
    {
      id: "E2",
      name: "Coal",
      tag: "new",
      note: "A lump of coal glowing through its cracks, a flame licking off the top. No face.",
      frames: embers.e2,
    },
    {
      id: "E3",
      name: "Flame",
      tag: "new",
      note: "A flame alone, no face: a white-hot core and a red edge.",
      frames: embers.e3,
    },
  ],
  bolts: [
    {
      id: "B1",
      name: "Steel bolt",
      tag: "new",
      note: "Standing on its threads: a hex head with a lit face and a shaded face. A glint runs over the head now and then.",
      frames: bolts.b1,
    },
    {
      id: "B2",
      name: "Brass nut",
      tag: "new",
      note: "A hex nut face on, in brass. The same glint.",
      frames: bolts.b2,
    },
    {
      id: "B3",
      name: "Brass bolt",
      tag: "new",
      note: "B1 in the monkey's brass.",
      frames: bolts.b3,
    },
  ],
};

const dir = "scripts/prototype-brass-monkey-items";
const html = readFileSync(`${dir}/viewer.html`, "utf8").replace(/\/\*DATA\*\/\s*null/u, () => JSON.stringify(data));
mkdirSync("out/prototype-brass-monkey-items", { recursive: true });
writeFileSync("out/prototype-brass-monkey-items/index.html", html);
console.log("out/prototype-brass-monkey-items/index.html");
