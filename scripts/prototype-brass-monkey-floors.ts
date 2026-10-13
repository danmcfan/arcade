// PROTOTYPE (throwaway, #38 phase 1): the candidate Brass Monkey floor art
// (prototype-brass-monkey-floors/tiles.ts), inlined into
// prototype-brass-monkey-floors/viewer.html with the picked monkey, Gnome and
// items so the owner can pick the wall, girders, ladders, conveyor, exit door
// and the top of the girder floor before the art moves into
// src/brass-monkey/art.ts.
// `bun scripts/prototype-brass-monkey-floors.ts` writes
// out/prototype-brass-monkey-floors/index.html and prints its path.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  backdrops,
  conveyorSample,
  conveyors,
  doors,
  girderColours,
  girderShapes,
  ladderColours,
  ladderShapes,
  tops,
} from "./prototype-brass-monkey-floors/tiles.ts";
import { gnomes, monkeys } from "./prototype-brass-monkey-art/characters.ts";
import { bolts, embers, gears } from "./prototype-brass-monkey-items/items.ts";
import { sweetie } from "../src/ui/sweetie16.ts";

const data = {
  sweetie,
  monkey: monkeys.a1.walk,
  gnome: [gnomes.g1.idle, gnomes.g1.throw],
  gear: gears.g1,
  ember: embers.e1,
  bolt: bolts.b3,
  backdrops: [
    {
      id: "K1",
      name: "Black",
      tag: "original, recoloured",
      note: "The old workshop's near-black, as Sweetie 16 black. Nothing behind the girders.",
      tile: backdrops.k1,
    },
    {
      id: "K2",
      name: "Wall panels",
      tag: "new",
      note: "Riveted steel panels, 32 px square, their seams and rivets in dark grey: a factory wall that stays out of the way.",
      tile: backdrops.k2,
    },
    {
      id: "K3",
      name: "Brick",
      tag: "new",
      note: "Brick courses with dark grey mortar. Busier than the panels.",
      tile: backdrops.k3,
    },
  ],
  girderShapes: [
    {
      id: "S1",
      name: "Truss",
      tag: "original, imported",
      note: "The old workshop's girder, pixel for pixel: two flanges and a zigzag truss between.",
      rows: girderShapes.s1,
    },
    {
      id: "S2",
      name: "Plate with holes",
      tag: "new",
      note: "A solid plate girder with a row of lightening holes, lit along its top edge.",
      rows: girderShapes.s2,
    },
    {
      id: "S3",
      name: "Riveted I-beam",
      tag: "new",
      note: "An I-beam side on: lit flanges and a darker web with a rivet every 4 px.",
      rows: girderShapes.s3,
    },
  ],
  girderColours: [
    {
      id: "green",
      name: "Green",
      tag: "original, recoloured",
      note: "The old workshop's greens, as Sweetie 16 green and teal.",
      map: girderColours.green,
    },
    {
      id: "red",
      name: "Red",
      tag: "new",
      note: "The arcade classic's red girders. Stands apart from the steel gear, the brass monkey and the bolt.",
      map: girderColours.red,
    },
    {
      id: "blue",
      name: "Blue",
      tag: "new",
      note: "Painted blue steel: brass and fire read well on it.",
      map: girderColours.blue,
    },
    {
      id: "steel",
      name: "Steel",
      tag: "new",
      note: "Bare steel. The gear is steel too, so it reads less well on these.",
      map: girderColours.steel,
    },
    {
      id: "brass",
      name: "Brass",
      tag: "new",
      note: "Brass, like the monkey. The monkey and the bolt read less well on these.",
      map: girderColours.brass,
    },
  ],
  ladderShapes: [
    {
      id: "L1",
      name: "Thin",
      tag: "original, imported",
      note: "The old workshop's ladder: 1 px rails and a rung every 4 rows.",
      rows: ladderShapes.l1,
    },
    {
      id: "L2",
      name: "Shaded rails",
      tag: "new",
      note: "2 px rails, lit on the left and shaded on the right. Same rungs.",
      rows: ladderShapes.l2,
    },
  ],
  ladderColours: [
    {
      id: "white",
      name: "White",
      tag: "original, recoloured",
      note: "The old workshop's pale ladders, as Sweetie 16 white.",
      map: ladderColours.white,
    },
    { id: "cyan", name: "Cyan", tag: "new", note: "The arcade classic's cyan ladders.", map: ladderColours.cyan },
    { id: "yellow", name: "Yellow", tag: "new", note: "Safety yellow.", map: ladderColours.yellow },
    { id: "steel", name: "Steel", tag: "new", note: "Grey steel, quieter than white.", map: ladderColours.steel },
  ],
  conveyors: [
    {
      id: "C1",
      name: "Rubber belt",
      tag: "new",
      note: "A rubber belt with grey treads looped round a side frame in the girder colour (the one you pick), its hubs turning. The top runs one way, the bottom back.",
      ...conveyors.c1,
    },
    {
      id: "C2",
      name: "Hazard belt",
      tag: "new",
      note: "C1 with yellow and black stripes on the belt, so which way it runs shows from across the floor.",
      ...conveyors.c2,
    },
    {
      id: "C3",
      name: "Slats on a girder",
      tag: "new",
      note: "A belt of steel slats riding on top of the floor's own girder (the girder you pick), so both floors share one look.",
      ...conveyors.c3,
    },
  ],
  doors: [
    {
      id: "D1",
      name: "Steel door, lamp",
      tag: "new",
      note: "A panelled steel door in a dark frame, a brass handle, a green lamp above.",
      rows: doors.d1,
    },
    {
      id: "D2",
      name: "Brass porthole",
      tag: "new",
      note: "An arched brass door with a round cyan porthole, to match the monkey.",
      rows: doors.d2,
    },
    {
      id: "D3",
      name: "Roller shutter",
      tag: "new",
      note: "A shutter half up, daylight and grass showing under it, hazard stripes along its foot and a green lamp.",
      rows: doors.d3,
    },
    {
      id: "D4",
      name: "Steel door, EXIT sign",
      tag: "new",
      note: "D1 under a lit EXIT sign in place of the lamp. The door itself is shorter (17 px) to fit.",
      rows: doors.d4,
    },
  ],
  tops: [
    {
      id: "T1",
      name: "Platform, tall ladders",
      tag: "original",
      note: "As the old workshop: the small top platform (where the arcade classic's captive waits), now with the door on it, and the two tall ladders up behind the Gnome.",
      ...tops.t1,
    },
    {
      id: "T2",
      name: "Platform",
      tag: "original, trimmed",
      note: "T1 without the tall ladders, which led to the old score line and now lead nowhere.",
      ...tops.t2,
    },
    {
      id: "T3",
      name: "Door beside the Gnome",
      tag: "new",
      note: "No platform and no tall ladders: the door stands on the top girder just right of the Gnome.",
      ...tops.t3,
    },
  ],
  conveyorSample,
};

const dir = "scripts/prototype-brass-monkey-floors";
const html = readFileSync(`${dir}/viewer.html`, "utf8").replace(/\/\*DATA\*\/\s*null/u, () => JSON.stringify(data));
mkdirSync("out/prototype-brass-monkey-floors", { recursive: true });
writeFileSync("out/prototype-brass-monkey-floors/index.html", html);
console.log("out/prototype-brass-monkey-floors/index.html");
