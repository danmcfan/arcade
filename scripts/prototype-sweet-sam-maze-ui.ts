// PROTOTYPE (throwaway, #46 / PR #59): inlines the Sweet Sam maze, the pixel
// font, the cabinet strip and the picked sprites into
// prototype-sweet-sam-maze-ui/viewer.html, so the text can be steered with
// toggles before it is redrawn; the maze and cabinet are the owner's picks. The
// Go "1UP" and "HIGH SCORE" (baked into the Go maze), READY!, digits and points
// come from git (`main`), lettered as the nearest Sweetie 16 colours. `bun scripts/prototype-sweet-sam-maze-ui.ts` writes
// out/prototype-sweet-sam-maze-ui/index.html and prints its path.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import { toRows } from "./pixel-art.ts";
import { newItems } from "../src/sweet-sam/entity.ts";
import { glyphs } from "../src/ui/glyphs.ts";
import { sweetie } from "../src/ui/sweetie16.ts";

const dir = "scripts/prototype-sweet-sam-maze-ui";
const img = "src/assets/images";
const read = (path: string): PNG => PNG.sync.read(readFileSync(path));
const fromMain = (path: string): Buffer => execFileSync("git", ["show", `main:${path}`]);

// Rows with each colour lettered as the nearest Sweetie 16 one (for the Go art's PICO-8 colours).
function nearestRows(png: PNG): string[] {
  const pal = Object.entries(sweetie).map(([k, css]) => [k, parseInt(css.slice(1), 16)] as const);
  const rows: string[] = [];
  for (let y = 0; y < png.height; y++) {
    let row = "";
    for (let x = 0; x < png.width; x++) {
      const i = (y * png.width + x) * 4;
      if ((png.data[i + 3] ?? 0) < 128) {
        row += ".";
        continue;
      }
      const [r, g, b] = [png.data[i] ?? 0, png.data[i + 1] ?? 0, png.data[i + 2] ?? 0];
      let best = ".";
      let bestD = Infinity;
      for (const [k, c] of pal) {
        const d = (r - (c >> 16)) ** 2 + (g - ((c >> 8) & 255)) ** 2 + (b - (c & 255)) ** 2;
        if (d < bestD) [best, bestD] = [k, d];
      }
      row += best;
    }
    rows.push(row);
  }
  return rows;
}

// "1UP", "HIGH" and "SCORE", cut from the top 7 rows of the Go maze: each word's
// rows (`w` ink) and its x, split where 4 or more blank columns fall between words.
function goLabels(maze: string[]): { x: number; rows: string[] }[] {
  const top = maze.slice(0, 7).map((r) => r.replaceAll(/[^w]/gu, "."));
  const inked = (x: number): boolean => top.some((r) => r[x] === "w");
  const wordGoesOn = (x: number): boolean => [0, 1, 2, 3].some((g) => inked(x + g));
  const words: { x: number; rows: string[] }[] = [];
  let x = 0;
  while (x < 224) {
    if (!inked(x)) {
      x++;
      continue;
    }
    let end = x;
    while (end < 224 && wordGoesOn(end)) end++;
    const from = x;
    words.push({ x: from, rows: top.map((r) => r.slice(from, end)) });
    x = end;
  }
  return words;
}

const bees = read(`${img}/sweet-sam/bees.png`);
const data = {
  sweetie,
  maze: toRows(read(`${img}/sweet-sam/maze.png`)),
  items: newItems().flatMap((e) => (e === null ? [] : [{ x: e.x, y: e.y, pot: e.powerPellet }])),
  glyphs,
  bear: toRows(read(`${img}/sweet-sam/bear.png`), sweetie, 0, 0, 16, 16),
  bees: [0, 1, 2, 3].map((n) => toRows(bees, sweetie, n * 64, 0, 16, 16)),
  drop: toRows(read(`${img}/sweet-sam/honey-drop.png`), sweetie, 0, 0, 8, 12),
  pot: toRows(read(`${img}/sweet-sam/honey-pot.png`), sweetie, 0, 0, 8, 12),
  cabinet: toRows(read(`${img}/cabinet.png`), sweetie, 0, 0, 336, 428),
  goReady: nearestRows(PNG.sync.read(fromMain(`${img}/ready.png`))),
  goDigits: nearestRows(PNG.sync.read(fromMain(`${img}/digits.png`))),
  goLabels: goLabels(nearestRows(PNG.sync.read(fromMain(`${img}/hive.png`)))),
  goBonus: nearestRows(PNG.sync.read(fromMain(`${img}/bonus.png`))),
};

const html = readFileSync(`${dir}/viewer.html`, "utf8").replace("/*DATA*/null", JSON.stringify(data));
mkdirSync("out/prototype-sweet-sam-maze-ui", { recursive: true });
writeFileSync("out/prototype-sweet-sam-maze-ui/index.html", html);
console.log("out/prototype-sweet-sam-maze-ui/index.html");
