// PROTOTYPE (throwaway, #75): inlines the hub room, the current counter, the
// prizes, the player's walk frames and the collision walls into
// prototype-prize-desk/viewer.html so the owner can steer the wrap-around
// prize desk and its employee. `bun scripts/prototype-prize-desk.ts` writes
// out/prototype-prize-desk/index.html and prints its path.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { hubRoomRows } from "./gen-ui-art.ts";
import { newWalls } from "../src/arcade/collision.ts";
import { newPlayer } from "../src/arcade/entity.ts";
import { counterRect } from "../src/arcade/prizeCounter.ts";
import { prizes } from "../src/arcade/prizes.ts";
import { counterArt } from "../src/ui/counterArt.ts";
import { playerFramesFor } from "../src/ui/playerArt.ts";
import { prizeArt } from "../src/ui/prizeArt.ts";
import { sweetie } from "../src/ui/sweetie16.ts";

const player = newPlayer();
const data = {
  palette: sweetie,
  room: hubRoomRows(),
  counter: { rows: counterArt, rect: counterRect },
  prizes: prizes.map((p) => ({ rows: prizeArt[p.id], x: p.x, y: p.y })),
  walk: {
    UP: playerFramesFor("UP"),
    DOWN: playerFramesFor("DOWN"),
    LEFT: playerFramesFor("LEFT"),
    RIGHT: playerFramesFor("RIGHT"),
  },
  walls: newWalls(),
  start: { x: player.x, y: player.y, w: player.width, h: player.height },
};

const html = readFileSync("scripts/prototype-prize-desk/viewer.html", "utf8").replace(/\/\*DATA\*\/ ?null/u, () =>
  JSON.stringify(data),
);
mkdirSync("out/prototype-prize-desk", { recursive: true });
writeFileSync("out/prototype-prize-desk/index.html", html);
console.log("out/prototype-prize-desk/index.html");
