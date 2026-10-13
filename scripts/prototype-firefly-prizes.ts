// Playground for the Firefly prize decorations (#35): Lantern, Glow stick and
// Wings by the Firefly cabinet in the hub. Writes
// out/prototype-firefly-prizes/index.html; the owner picks one option per knob.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { prizeArt } from "../src/ui/prizeArt.ts";
import { sweetie } from "../src/ui/sweetie16.ts";
import { options } from "./prototype-firefly-prizes/options.ts";

const root = new URL("..", import.meta.url).pathname;
const hub = `data:image/png;base64,${readFileSync(`${root}src/assets/images/arcade.png`).toString("base64")}`;
const data = {
  sweetie,
  hub,
  sweetSam: [
    { rows: prizeArt.honeyJar, x: 65, y: 55 },
    { rows: prizeArt.runningShoes, x: 87, y: 58 },
    { rows: prizeArt.sleepyBees, x: 74, y: 28 },
  ],
  options,
};
const viewer = readFileSync(`${root}scripts/prototype-firefly-prizes/viewer.html`, "utf8");
mkdirSync(`${root}out/prototype-firefly-prizes`, { recursive: true });
writeFileSync(`${root}out/prototype-firefly-prizes/index.html`, viewer.replace("/*DATA*/ null", JSON.stringify(data)));
console.log("wrote out/prototype-firefly-prizes/index.html");
