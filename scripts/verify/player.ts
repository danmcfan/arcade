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
import { sweetie, type SweetieLetter } from "../../src/ui/sweetie16.ts";
import { decodeDataUrl } from "../browser.ts";
import { isGameSnapshot, upscale, verify, type Verify } from "../harness.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

/** The hub image sits 16 px in from the canvas edge (`buffer` in src/arcade/draw.ts). */
const margin = 16;

function canvas(v: Verify): PNG {
  return PNG.sync.read(decodeDataUrl(v.page.eval("window.__arcade.frame()")));
}

function isLetter(ch: string): ch is SweetieLetter {
  return ch in sweetie;
}

/** The player's 16x24 box as drawn: its top-left on the canvas and its pixels. */
function crop(png: PNG, left: number, top: number): PNG {
  const out = new PNG({ width: playerFrameWidth, height: playerFrameHeight });
  for (let y = 0; y < playerFrameHeight; y++)
    png.data.copy(
      out.data,
      y * playerFrameWidth * 4,
      ((top + y) * png.width + left) * 4,
      ((top + y) * png.width + left + playerFrameWidth) * 4,
    );
  return out;
}

/** The art's opaque pixels that the drawn box does not show, as "x,y" (empty when it matches). */
function mismatches(drawn: PNG, rows: readonly string[]): string[] {
  const bad: string[] = [];
  rows.forEach((row, y) => {
    Array.from(row).forEach((ch, x) => {
      if (!isLetter(ch)) return;
      const i = (y * drawn.width + x) * 4;
      const hex = `#${[0, 1, 2].map((j) => (drawn.data[i + j] ?? 0).toString(16).padStart(2, "0")).join("")}`;
      if (hex !== sweetie[ch]) bad.push(`${x},${y}`);
    });
  });
  return bad;
}

/** Each facing and the key that turns the player to it. The side walks cross the open carpet; up comes last, as it ends at the cabinets. */
const walks: [Direction, Partial<Input>][] = [
  ["DOWN", { down: true }],
  ["LEFT", { left: true }],
  ["RIGHT", { right: true }],
  ["UP", { up: true }],
];

/** Walks each way for one whole cycle, checking every tick; returns the drawn frames, a row per facing. */
function walkCycles(v: Verify): PNG[][] {
  console.log("walk cycles (hub, ?scene=game):");
  v.openHook("scene=game");
  v.step(1);
  const sheet: PNG[][] = [];
  for (const [dir, input] of walks) {
    const drawn: PNG[] = [];
    let ticks = 0;
    let wrong: string[] = [];
    while (drawn.length < playerFrames && ticks < 60) {
      v.step(1, input);
      ticks++;
      const p = v.snapshot(isGameSnapshot).arcade.player;
      const frame = Math.trunc(p.frame);
      const box = crop(
        canvas(v),
        Math.trunc(p.x + margin - playerFrameWidth / 2),
        Math.trunc(p.y + margin - playerFrameHeight / 2),
      );
      const bad = mismatches(box, playerFramesFor(dir)[frame] ?? []);
      if (bad.length > 0 && wrong.length === 0) wrong = [`tick ${ticks} frame ${frame}`, ...bad.slice(0, 8)];
      if (frame === drawn.length) drawn.push(box);
    }
    check(v.snapshot(isGameSnapshot).arcade.player.dir === dir, `walking ${dir.toLowerCase()} faces ${dir}`);
    check(drawn.length === playerFrames, `${dir}: the walk reaches all ${playerFrames} frames`, drawn.length);
    check(wrong.length === 0, `${dir}: every tick draws playerArt.ts's frame for the facing and walk frame`, wrong);
    v.frame(`hub-${dir.toLowerCase()}`);
    sheet.push(drawn);
  }
  return sheet;
}

/** The drawn frames, a row per facing on dark grey, scaled up. */
function writeSheet(sheet: PNG[][], path: string): void {
  const gap = 4;
  const out = new PNG({
    width: gap + playerFrames * (playerFrameWidth + gap),
    height: gap + sheet.length * (playerFrameHeight + gap),
  });
  for (let i = 0; i < out.data.length; i += 4) out.data.set([0x33, 0x3c, 0x57, 255], i);
  for (const [r, row] of sheet.entries())
    for (const [c, png] of row.entries())
      png.bitblt(
        out,
        0,
        0,
        png.width,
        png.height,
        gap + c * (playerFrameWidth + gap),
        gap + r * (playerFrameHeight + gap),
      );
  writeFileSync(path, upscale(PNG.sync.write(out), 8));
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
