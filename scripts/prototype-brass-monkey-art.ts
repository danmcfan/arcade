// PROTOTYPE (throwaway, #38): the candidate Brass Monkey characters
// (prototype-brass-monkey-art/characters.ts), inlined into
// prototype-brass-monkey-art/viewer.html so the owner can compare them side
// by side and pick a metallic monkey and a D&D gnome before the art moves into
// src/brass-monkey/art.ts. `bun scripts/prototype-brass-monkey-art.ts` writes
// out/prototype-brass-monkey-art/index.html and prints its path.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { gnomes, monkeys } from "./prototype-brass-monkey-art/characters.ts";
import { sweetie } from "../src/ui/sweetie16.ts";

const data = {
  sweetie,
  monkeys: [
    { id: "A", name: "Brass chimp, as before", note: "The pick, unchanged, to compare against.", ...monkeys.a },
    {
      id: "A1",
      name: "Polished brass",
      note: "White glints on the dome and belly, a glowing cyan eye, a steel grille mouth, a steel neck joint.",
      ...monkeys.a1,
    },
    {
      id: "A2",
      name: "Brass and steel",
      note: "A1 with a steel face plate, and steel arms, feet and tail.",
      ...monkeys.a2,
    },
    {
      id: "A3",
      name: "Clockwork",
      note: "A1 with a bolt on its head, a gear in a chest window, a wind-up key, steel feet and tail.",
      ...monkeys.a3,
    },
  ],
  gnomes: [
    {
      id: "1",
      name: "Artificer",
      note: "A shock of white hair, goggles pushed up, a teal work coat with a belt.",
      ...gnomes.g1,
    },
    {
      id: "2",
      name: "Illusionist",
      note: "A flame of red hair, sly brows, a pointed goatee, a purple robe with gold trim.",
      ...gnomes.g2,
    },
    {
      id: "3",
      name: "Engineer",
      note: "Bald, welding goggles, white mutton chops, blue overalls, a steel claw for a right arm.",
      ...gnomes.g3,
    },
  ],
};

const dir = "scripts/prototype-brass-monkey-art";
const html = readFileSync(`${dir}/viewer.html`, "utf8").replace("/*DATA*/null", JSON.stringify(data));
mkdirSync("out/prototype-brass-monkey-art", { recursive: true });
writeFileSync("out/prototype-brass-monkey-art/index.html", html);
console.log("out/prototype-brass-monkey-art/index.html");
