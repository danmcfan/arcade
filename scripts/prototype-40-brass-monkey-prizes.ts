// Playground for the Brass Monkey prize decorations (#40): Oil can, Spring
// boots and Pocket watch, drawn by the Brass Monkey cabinet in the hub. The
// owner steers the art here before any PR (docs/agents/pixel-art.md).
// `bun scripts/prototype-40-brass-monkey-prizes.ts` writes
// out/prototype-40-brass-monkey-prizes/index.html.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prizeArt } from "../src/ui/prizeArt.ts";
import { sweetie } from "../src/ui/sweetie16.ts";
import { arrangements, options } from "./prototype-40-brass-monkey-prizes/options.ts";

const root = join(import.meta.dir, "..");
const dir = join(root, "scripts/prototype-40-brass-monkey-prizes");
const out = join(root, "out/prototype-40-brass-monkey-prizes");

const hub = readFileSync(join(root, "src/assets/images/arcade.png")).toString("base64");
const data = {
  palette: sweetie,
  options,
  arrangements,
  sweetSam: [
    { rows: prizeArt.honeyJar, x: 65, y: 55 },
    { rows: prizeArt.runningShoes, x: 87, y: 58 },
    { rows: prizeArt.sleepyBees, x: 74, y: 28 },
  ],
  hub: `data:image/png;base64,${hub}`,
};

const html = readFileSync(join(dir, "viewer.html"), "utf8").replace("/*DATA*/ null", JSON.stringify(data));
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "index.html"), html);
console.log(join(out, "index.html"));
