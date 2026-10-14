// The player's sprite (#90) in a real browser (`bun run verify player`).
// Part 1 drives the `?debug` test hook in the hub (`?scene=game`): it walks
// the player in each direction for a whole walk cycle and checks, on every
// tick, that the pixels drawn where the player stands are the frame of
// src/ui/playerArt.ts for its facing and walk frame. It writes a frame per
// facing and walk-cycle.png: each facing's four frames as the game drew
// them. Part 2 records walking round the hub. Files go to out/verify/player/.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import type { Direction, Input } from "../../src/engine/input.ts";
import { playerFrameHeight, playerFrames, playerFramesFor, playerFrameWidth } from "../../src/ui/playerArt.ts";
import { decodeDataUrl } from "../browser.ts";
import { isGameSnapshot, upscale, verify, type Verify } from "../harness.ts";
import { empty, toPng, toRows } from "../pixel-art.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

/** The hub image sits 16 px in from the canvas edge (`buffer` in src/arcade/draw.ts). */
const margin = 16;
/** Ticks a walk may take to show every frame: one cycle is 40 (`frameIncrement` 0.1 over 4 frames). */
const tickLimit = 60;

/** The player's 16x24 box as drawn this tick, as Sweetie 16 letters. */
function drawnBox(v: Verify, x: number, y: number): string[] {
  const png = PNG.sync.read(decodeDataUrl(v.page.eval("window.__arcade.frame()")));
  const left = Math.trunc(x + margin - playerFrameWidth / 2);
  const top = Math.trunc(y + margin - playerFrameHeight / 2);
  return toRows(png, undefined, left, top, playerFrameWidth, playerFrameHeight);
}

/** The art's opaque pixels that the drawn box does not show, as "x,y" (empty when it matches). */
function mismatches(drawn: readonly string[], art: readonly string[]): string[] {
  return art.flatMap((row, y) =>
    Array.from(row).flatMap((ch, x) => (ch !== empty && drawn[y]?.[x] !== ch ? [`${x},${y}`] : [])),
  );
}

/** Each facing and the key that turns the player to it. The side walks cross the open carpet; up comes last, as it ends at the cabinets. */
const facingKeys: [Direction, Partial<Input>][] = [
  ["DOWN", { down: true }],
  ["LEFT", { left: true }],
  ["RIGHT", { right: true }],
  ["UP", { up: true }],
];

/** Walks each way for one whole cycle, checking every tick; returns the drawn frames, a row per facing. */
function walkCycles(v: Verify): string[][][] {
  console.log("walk cycles (hub, ?scene=game):");
  v.openHook("scene=game");
  v.step(1);
  const sheet: string[][][] = [];
  for (const [dir, input] of facingKeys) {
    const drawn: string[][] = [];
    let ticks = 0;
    let firstMismatch: string[] = [];
    while (drawn.length < playerFrames && ticks < tickLimit) {
      v.step(1, input);
      ticks++;
      const p = v.snapshot(isGameSnapshot).arcade.player;
      const frame = Math.trunc(p.frame);
      const box = drawnBox(v, p.x, p.y);
      const bad = mismatches(box, playerFramesFor(dir)[frame] ?? []);
      if (bad.length > 0 && firstMismatch.length === 0)
        firstMismatch = [`tick ${ticks} frame ${frame}`, ...bad.slice(0, 8)];
      if (frame === drawn.length) drawn.push(box);
    }
    check(v.snapshot(isGameSnapshot).arcade.player.dir === dir, `walking ${dir.toLowerCase()} faces ${dir}`);
    check(drawn.length === playerFrames, `${dir}: the walk reaches all ${playerFrames} frames`, drawn.length);
    check(
      firstMismatch.length === 0,
      `${dir}: every tick draws playerArt.ts's frame for the facing and walk frame`,
      firstMismatch,
    );
    v.frame(`hub-${dir.toLowerCase()}`);
    sheet.push(drawn);
  }
  return sheet;
}

/** The drawn frames, a row per facing on dark grey (`d`), scaled up. */
function writeSheet(sheet: string[][][], path: string): void {
  const gap = 4;
  const width = gap + playerFrames * (playerFrameWidth + gap);
  const spacer = "d".repeat(gap);
  const rows = Array.from({ length: gap }, () => "d".repeat(width));
  for (const frames of sheet) {
    for (let y = 0; y < playerFrameHeight; y++)
      rows.push(spacer + frames.map((f) => (f[y] ?? "").replaceAll(empty, "d") + spacer).join(""));
    rows.push(...Array.from({ length: gap }, () => "d".repeat(width)));
  }
  writeFileSync(path, upscale(PNG.sync.write(toPng(rows)), 8));
}

function recordWalk(v: Verify): void {
  console.log("video:");
  v.record(
    "walkthrough",
    () => {
      v.wait(600);
      for (const [code, ms] of [
        ["ArrowLeft", 900],
        ["ArrowDown", 500],
        ["ArrowRight", 1600],
        ["ArrowUp", 700],
        ["ArrowLeft", 800],
        ["ArrowDown", 400],
      ] as const) {
        v.key(code, ms);
        v.wait(400);
      }
    },
    { scene: "game" },
  );
  check(v.snapshot(isGameSnapshot).software === null, "the recording stays in the hub");
}

await verify("player", (v) => {
  const sheet = walkCycles(v);
  const path = join(v.dir, "walk-cycle.png");
  writeSheet(sheet, path);
  console.log(`  wrote ${path}`);
  recordWalk(v);
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
