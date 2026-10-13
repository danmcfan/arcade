// PROTOTYPE (throwaway, #46 / PR #59): inlines the Sweet Sam sprite rows into
// prototype-sweet-sam-art/viewer.html so the art can be steered with toggles
// before it is redrawn. go.json is the Go game's bear.png, bee.png and
// food.png as rows (`toRows` with their PICO-8 colours lettered as the nearest
// Sweetie 16 ones). `bun scripts/prototype-sweet-sam-art.ts` writes
// out/prototype-sweet-sam-art/index.html and prints its path.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { recolour } from "./pixel-art.ts";
import { bearDeath, bearWalk, beeEye, beeFlight, dazedFace, dazedFaceAt, walkCycle } from "../src/sweet-sam/art.ts";
import { sweetie } from "../src/ui/sweetie16.ts";

// The #59 smoke pot and bonus flower, left out of art.ts by the owner's picks;
// kept here so this playground still shows them.
const smokePotArt: readonly string[] = ["..mm..", ".llll.", "lwllll", "loroom", ".mmmm."];

/** The smoke rising from the pot, 6×2, one per frame, drawn just above it. */
const smokePotSmoke: readonly (readonly string[])[] = [
  ["....l.", "...w.."],
  ["...l..", "....w."],
  ["..l...", "...w.."],
  ["...l..", "..w..."],
];

/** The bonus flower, 16×16: a daisy on a stem. Not in the maze yet (#47). */
const bonusFlowerArt: readonly string[] = [
  "................",
  "......w..w......",
  "....w.wwww.w....",
  "...wwwwwwwwww...",
  "..wwwwyyyywwww..",
  "..wwwyooooywww..",
  "...wwyooooyww...",
  "..wwwwyyyywwww..",
  "...wwwwwwwwww...",
  "....w.wGGw.w....",
  "..gg...GG...gg..",
  ".gggg..GG..gggg.",
  "..gggg.GG.gggg..",
  "....gggGGggg....",
  ".......GG.......",
  "................",
];

const dir = "scripts/prototype-sweet-sam-art";
const parsed: unknown = JSON.parse(readFileSync(`${dir}/go.json`, "utf8"));
const go: Record<string, string[]> = {};
if (typeof parsed === "object" && parsed !== null)
  for (const [k, v] of Object.entries(parsed)) if (Array.isArray(v)) go[k] = v.map(String);

// Bear: `1` body, `2` belly and inner ears, as in the Go bear (body purple, belly red).
const bear = (rows: readonly string[]): string[] => recolour(rows, { r: "1", o: "2" });
// Bee: `1` body, `2` wings, `3` the white of the eye.
const [ex, ey] = beeEye;
const bee = (rows: readonly string[]): string[] =>
  recolour(rows, { y: "1", w: "2" }).map((row, y) => (y === ey - 1 ? row.slice(0, ex) + "3" + row.slice(ex + 1) : row));

// Go food.png: the dot is 2×2 white at x 3, the energizer a 6×6 white disc.
const goEnergizer = (go["food"] ?? []).slice(14, 20).map((r) => r.slice(1, 7));

const data = {
  sweetie,
  walk: {
    down: bearWalk.down.map((f) => bear(f)),
    up: bearWalk.up.map((f) => bear(f)),
    left: bearWalk.left.map((f) => bear(f)),
  },
  walkCycle,
  death: bearDeath.map((f) => bear(f)),
  dazedFace: bear(dazedFace),
  dazedFaceAt,
  flight: beeFlight.map((f) => bee(f)),
  beeEye,
  goEnergizer,
  smokePot: smokePotArt,
  smokePotSmoke,
  flower: bonusFlowerArt,
};

const html = readFileSync(`${dir}/viewer.html`, "utf8").replace("/*DATA*/null", JSON.stringify(data));
mkdirSync("out/prototype-sweet-sam-art", { recursive: true });
writeFileSync("out/prototype-sweet-sam-art/index.html", html);
console.log("out/prototype-sweet-sam-art/index.html");
