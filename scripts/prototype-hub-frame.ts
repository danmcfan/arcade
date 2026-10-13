// PROTOTYPE (throwaway, #72): inlines the hub room's rows into
// prototype-hub-frame/viewer.html so the owner can steer how the walls and
// floor extend to fill the 160×144 frame. `bun scripts/prototype-hub-frame.ts`
// writes out/prototype-hub-frame/index.html and prints its path.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { hubRoomRows } from "./gen-ui-art.ts";
import { counterRect } from "../src/arcade/prizeCounter.ts";
import { prizes } from "../src/arcade/prizes.ts";
import { counterArt } from "../src/ui/counterArt.ts";
import { playerFramesFor } from "../src/ui/playerArt.ts";
import { prizeArt } from "../src/ui/prizeArt.ts";
import { sweetie } from "../src/ui/sweetie16.ts";

const data = {
  palette: sweetie,
  room: hubRoomRows(),
  counter: { rows: counterArt, x: counterRect.x, y: counterRect.y },
  prizes: prizes.map((p) => ({ rows: prizeArt[p.id], x: p.x, y: p.y })),
  walk: { LEFT: playerFramesFor("LEFT"), RIGHT: playerFramesFor("RIGHT") },
};

const html = readFileSync("scripts/prototype-hub-frame/viewer.html", "utf8").replace(
  "/*DATA*/null",
  JSON.stringify(data),
);
mkdirSync("out/prototype-hub-frame", { recursive: true });
writeFileSync("out/prototype-hub-frame/index.html", html);
console.log("out/prototype-hub-frame/index.html");
