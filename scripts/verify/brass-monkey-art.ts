// Brass Monkey's characters and items (#38) in a real browser (`bun run verify brass-monkey-art`).
// Part 1 drives the `?debug` test hook: the monkey walks right, turns and
// walks left, and at each stop the canvas is checked pixel by pixel against
// the generated sheets: the monkey's frame for its walk step (flipped when it
// faces left) and the Gnome's idle frame on the top girder. Part 2 writes
// every generated sheet scaled up, the frames the game does not draw yet
// included (jump, climb, the Gnome's throw, the gear, the ember and the bolt,
// #39). Part 3 records Brass Monkey played with the keyboard. Files go to
// out/verify/brass-monkey-art/.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import type { BrassMonkeySnapshot } from "../../src/game/snapshot.ts";
import { snap } from "../../src/engine/surface.ts";
import { cabinetInsetLeft, cabinetInsetTop } from "../../src/ui/cabinet.ts";
import { decodeDataUrl, isRecord } from "../browser.ts";
import { brassMonkeyArtFiles, brassMonkeyImagesDir } from "../gen-brass-monkey-art.ts";
import { isGameSnapshot, upscale, verify, type Verify } from "../harness.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

const sheet = (file: string): PNG => PNG.sync.read(readFileSync(join(brassMonkeyImagesDir, file)));
const monkey = sheet("monkey.png");
const gnome = sheet("gnome.png");

/** The workshop's top-left on the canvas: centred in the cabinet screen, under a 16 px band. */
const originX = cabinetInsetLeft;
const originY = cabinetInsetTop + 16;

function canvas(v: Verify): PNG {
  return PNG.sync.read(decodeDataUrl(v.page.eval("window.__arcade.frame()")));
}

function isBrassMonkeySnapshot(x: unknown): x is BrassMonkeySnapshot {
  return isRecord(x) && typeof x["x"] === "number" && typeof x["frame"] === "number" && typeof x["left"] === "boolean";
}

function brassMonkeySnapshot(v: Verify): BrassMonkeySnapshot {
  const g = v.snapshot(isGameSnapshot);
  if (g.software !== "brassMonkey" || !isBrassMonkeySnapshot(g.sw))
    throw new Error(`not in Brass Monkey: ${g.software}`);
  return g.sw;
}

const px = (png: PNG, x: number, y: number): number => png.data.readUInt32BE((y * png.width + x) * 4);

/**
 * Whether every opaque pixel of the `size` square at column `col` of `src`
 * is on the canvas at (x, y), mirrored when `flip`.
 */
function drawnExactly(frame: PNG, src: PNG, col: number, size: number, x: number, y: number, flip = false): boolean {
  for (let sy = 0; sy < size; sy++) {
    for (let sx = 0; sx < size; sx++) {
      const s = px(src, col * size + sx, sy);
      if ((s & 255) === 0) continue;
      const cx = x + (flip ? size - 1 - sx : sx);
      if (px(frame, cx, y + sy) !== s) return false;
    }
  }
  return true;
}

function checkFrame(v: Verify, name: string): void {
  const s = brassMonkeySnapshot(v);
  const frame = canvas(v);
  const column = [0, 1, 0, 2][Math.trunc(s.frame)] ?? 0;
  console.log(`${name} (x ${s.x}, frame ${s.frame.toFixed(1)}, ${s.left ? "left" : "right"}):`);
  check(
    drawnExactly(frame, monkey, column, 16, snap(originX + s.x - 8), snap(originY + s.y - 8), s.left),
    `the monkey is walk frame ${column + 1}${s.left ? ", flipped to face left" : ""}`,
  );
  check(drawnExactly(frame, gnome, 0, 32, originX + 24, originY + 52), "the Gnome stands idle on the top girder");
  v.frame(name, 2);
}

function play(v: Verify): void {
  v.openHook("scene=game");
  v.page.eval(`window.__arcade.seed(1); window.__arcade.load("game", { software: "brassMonkey" }); "ok"`);
  v.step(1);
  checkFrame(v, "1-start");
  for (const ticks of [3, 5, 5, 5]) {
    v.step(ticks, { right: true });
    checkFrame(v, `2-walking-right-${brassMonkeySnapshot(v).x}`);
  }
  v.step(40, { left: true });
  checkFrame(v, "3-walking-left");
}

function sheets(v: Verify): void {
  console.log("sprite sheets:");
  for (const { file, render } of brassMonkeyArtFiles) {
    const png = PNG.sync.write(render());
    writeFileSync(join(v.dir, `sheet-${file}`), upscale(png, 8));
    check(
      Buffer.compare(readFileSync(join(brassMonkeyImagesDir, file)), png) === 0,
      `${file} is the committed file (written 8x)`,
    );
  }
}

function video(v: Verify): void {
  console.log("video:");
  v.record(
    "playing",
    () => {
      v.page.eval(`window.__arcade.load("game", { software: "brassMonkey" }); "ok"`);
      v.wait(800);
      v.key("ArrowRight", 1800);
      v.wait(400);
      v.key("ArrowLeft", 1200);
      v.wait(400);
      v.key("ArrowRight", 600);
      v.wait(800);
    },
    { scene: "game" },
  );
  check(brassMonkeySnapshot(v).x > 16, "the recording played Brass Monkey: the monkey walked", brassMonkeySnapshot(v));
  v.screenshot("playing-screenshot");
}

await verify("brass-monkey-art", (v) => {
  play(v);
  sheets(v);
  video(v);
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
