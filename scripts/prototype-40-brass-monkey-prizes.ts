// Playground for the Brass Monkey prize decorations (#40): Oil can, Spring
// boots and Pocket watch, drawn by the Brass Monkey cabinet in the hub. The
// owner steers the art here before any PR (docs/agents/pixel-art.md).
// `bun scripts/prototype-40-brass-monkey-prizes.ts` writes
// out/prototype-40-brass-monkey-prizes/index.html.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prizeArt } from "../src/ui/prizeArt.ts";
import { sweetie } from "../src/ui/sweetie16.ts";

const root = join(import.meta.dir, "..");
const dir = join(root, "scripts/prototype-40-brass-monkey-prizes");
const out = join(root, "out/prototype-40-brass-monkey-prizes");

/**
 * New candidates (all new; nothing to import). The knobs recolour the body
 * letters: l/m/w on the oil can and the spring, o on the boot, y on the watch case.
 */
const candidates = {
  oilCanGoose: [
    "..k.......",
    ".kmk......",
    ".kmk....kk",
    "kkkkk..klk",
    "kllmmkklk.",
    "klwlmmlk..",
    "kllllmk...",
    "klllllk...",
    "kkkkkkk...",
  ],
  oilCanSquat: [
    "....k.....",
    "...kmk....",
    "..kkkkk..k",
    ".kllllmkkk",
    "klwllllmk.",
    "kllllllmk.",
    "kllllllmk.",
    "kkkkkkkkk.",
  ],
  springBoot: [
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
  ],
  springBootTall: [
    "kkkk......",
    "kook......",
    "kook......",
    "kookkkk...",
    "kooooook..",
    "kkkkkkkk..",
    "..kllk....",
    ".kllk.....",
    "..kllk....",
    ".kllk.....",
    "..kllk....",
    ".kkkkk....",
  ],
  watchHanging: [
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
  ],
  watchOpen: [
    "....kyk....",
    "..kkkkkkk..",
    ".kyyyyyyyk.",
    "kyyyyyyyyyk",
    "kkkkkkkkkkk",
    ".kwwwkwwwk.",
    "kwwwwkwwwwk",
    "kwwwwkkkwwk",
    "kwwwwwwwwwk",
    ".kwwwwwwwk.",
    "..kkkkkkk..",
  ],
};

const hub = readFileSync(join(root, "src/assets/images/arcade.png")).toString("base64");
const data = { palette: sweetie, candidates, sweetSam: prizeArt, hub: `data:image/png;base64,${hub}` };

const html = readFileSync(join(dir, "viewer.html"), "utf8").replace("/*DATA*/ null", JSON.stringify(data));
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "index.html"), html);
console.log(join(out, "index.html"));
