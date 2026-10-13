// Sweet Sam's honey and beehive art (#46) in a real browser
// (`bun run verify sweet-sam-art`). Part 1 replays the sweet-sam-clear
// fixture (seed 11, a bot clearing the maze) through the `?debug` test hook
// and stops where the art matters: the start (the bear, the four bees, honey
// drops, honey pots, READY!), a honey pot eaten, a sleepy bee eaten with its
// points, sleepy bees, a lost life and the waking flash. At each stop it
// checks the bear and every bee on the canvas against the generated sheets,
// in the frame the game picks for them, and that the wax shows wherever no
// sprite is. Part 2 writes every generated sheet scaled up, the bear's death
// frames included (#47 uses them). Part 3 records the
// same replay as a video. Files go to out/verify/sweet-sam-art/.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import type { InputScript, InputStep } from "../../src/game/script.ts";
import type { SweetSamEnemySnapshot, SweetSamSnapshot } from "../../src/game/snapshot.ts";
import type { Direction } from "../../src/engine/input.ts";
import { snap } from "../../src/engine/surface.ts";
import { beeOrder, frameSize } from "../../src/sweet-sam/art.ts";
import { cabinetInsetLeft, cabinetInsetTop } from "../../src/ui/cabinet.ts";
import { inputPath, loadScript } from "../../test/parity/fixtures.ts";
import { decodeDataUrl, isRecord } from "../browser.ts";
import { planCaptures } from "../capture-frames.ts";
import { isWax, sweetSamArtFiles, sweetSamImagesDir } from "../gen-sweet-sam-art.ts";
import { isGameSnapshot, upscale, verify, type Verify } from "../harness.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

const sheet = (file: string): PNG => PNG.sync.read(readFileSync(join(sweetSamImagesDir, file)));
const maze = sheet("maze.png");
const bear = sheet("bear.png");
const bees = sheet("bees.png");
/** Each bee's sheet in bees.png, stacked in `beeOrder`. */
const beeSheetHeight = bees.height / beeOrder.length;

const script = loadScript(inputPath("sweet-sam-clear"));

/** Where the replay stops, in order, and what each stop shows (ticks from the fixture's trace). */
const stops = [
  { tick: 1, name: "1-start", shows: "the bear, four different bees, honey drops, honey pots and READY!" },
  { tick: 382, name: "2-honey-pot-eaten", shows: "a honey pot eaten: the bees out of the home fall asleep" },
  { tick: 387, name: "3-sleepy-bee-eaten", shows: "a sleepy bee eaten: its points and a cyan burst" },
  { tick: 1239, name: "4-sleepy-bees", shows: "sleepy bees, eyes shut" },
  { tick: 4879, name: "5-life-lost", shows: "a life lost: a red burst, one bear fewer below the maze" },
  { tick: 7977, name: "6-waking-flash", shows: "sleepy bees flashing awake" },
] as const;

/** The canvas at logical resolution, decoded. */
function canvas(v: Verify): PNG {
  return PNG.sync.read(decodeDataUrl(v.page.eval("window.__arcade.frame()")));
}

function isSweetSamSnapshot(x: unknown): x is SweetSamSnapshot {
  return isRecord(x) && Array.isArray(x["enemies"]) && isRecord(x["player"]) && typeof x["lives"] === "number";
}

function sweetSam(v: Verify): SweetSamSnapshot {
  const g = v.snapshot(isGameSnapshot);
  if (g.software !== "sweetSam" || !isSweetSamSnapshot(g.sw)) throw new Error(`not in Sweet Sam: ${g.software}`);
  return g.sw;
}

const px = (png: PNG, x: number, y: number): number => png.data.readUInt32BE((y * png.width + x) * 4);

/** A 16×16 frame of `src` drawn at canvas (x, y). */
interface Placed {
  what: string;
  src: PNG;
  sx: number;
  sy: number;
  x: number;
  y: number;
}

/** True when `p` draws an opaque pixel at canvas (x, y). */
function covers(p: Placed, x: number, y: number): boolean {
  const fx = x - p.x;
  const fy = y - p.y;
  return fx >= 0 && fx < frameSize && fy >= 0 && fy < frameSize && (px(p.src, p.sx + fx, p.sy + fy) & 255) !== 0;
}

/** Share of the frame's opaque pixels that show on the canvas exactly, leaving out those `above` covers. */
function shown(frame: PNG, p: Placed, above: readonly Placed[]): number {
  let opaque = 0;
  let same = 0;
  for (let y = 0; y < frameSize; y++) {
    for (let x = 0; x < frameSize; x++) {
      const s = px(p.src, p.sx + x, p.sy + y);
      if ((s & 255) === 0 || above.some((a) => covers(a, p.x + x, p.y + y))) continue;
      opaque++;
      if (px(frame, p.x + x, p.y + y) === s) same++;
    }
  }
  return opaque === 0 ? 0 : same / opaque;
}

const bearRows: Record<Direction, number> = { DOWN: 0, UP: 1, LEFT: 2, RIGHT: 3 };
const beeRows: Record<Direction, number> = { DOWN: 0, UP: 1, LEFT: 1, RIGHT: 0 };

/** Where draw.ts draws an entity at (x, y) this tick: centred, moved by the camera shake. */
function at(s: SweetSamSnapshot, x: number, y: number): { x: number; y: number } {
  return { x: snap(x - 8 + cabinetInsetLeft + s.shake[0]), y: snap(y - 8 + cabinetInsetTop + s.shake[1]) };
}

/** A bee in the frame the game picks: its own sheet, sleepy rows +2, waking rows +2 more. */
function placeBee(s: SweetSamSnapshot, e: SweetSamEnemySnapshot): Placed {
  let row = beeRows[e.dir];
  if (e.blue > 0) row += e.flash ? 4 : 2;
  const look = e.blue > 0 ? (e.flash ? "waking" : "sleepy") : "awake";
  return {
    what: `${e.kind} bee (${look})`,
    src: bees,
    sx: frameSize * Math.trunc(e.frame),
    sy: beeOrder.indexOf(e.kind) * beeSheetHeight + frameSize * row,
    ...at(s, e.x, e.y),
  };
}

function placeBear(s: SweetSamSnapshot): Placed {
  const p = s.player;
  return {
    what: "bear",
    src: bear,
    sx: frameSize * Math.trunc(p.frame),
    sy: frameSize * bearRows[p.dir],
    ...at(s, p.x, p.y),
  };
}

/** Where particle bursts are flying (maze coordinates): an eaten bee's popup, or the caught bear. */
function bursts(s: SweetSamSnapshot): { x: number; y: number }[] {
  if (s.particlesActive === 0) return [];
  const out = s.popups.map((p) => ({ x: p.x, y: p.y }));
  if (s.state === "DEATHWAIT" || s.state === "FINALDEATHWAIT") out.push({ x: s.player.x, y: s.player.y });
  return out;
}

/** How far a burst's particles fly, in pixels. */
const burstReach = 48;

const nearBurst = (s: SweetSamSnapshot, x: number, y: number): boolean =>
  bursts(s).some((b) => Math.abs(b.x - x) < burstReach && Math.abs(b.y - y) < burstReach);

/** Wax pixels of maze.png, away from every sprite and burst, that differ on the canvas. */
function waxMisses(frame: PNG, s: SweetSamSnapshot, boxes: Placed[]): number {
  const ox = cabinetInsetLeft + s.shake[0];
  const oy = cabinetInsetTop + s.shake[1];
  let misses = 0;
  for (let y = 0; y < maze.height; y++) {
    for (let x = 0; x < maze.width; x++) {
      if (!isWax(x, y) || nearBurst(s, x, y)) continue;
      const cx = snap(x + ox);
      const cy = snap(y + oy);
      // Sprites, popups and particles can overlap the wax by up to a tile.
      if (boxes.some((b) => cx >= b.x - 8 && cx < b.x + 24 && cy >= b.y - 24 && cy < b.y + 24)) continue;
      if (px(frame, cx, cy) !== px(maze, x, y)) misses++;
    }
  }
  return misses;
}

function checkStop(v: Verify, name: string, shows: string): SweetSamSnapshot {
  const s = sweetSam(v);
  const frame = canvas(v);
  console.log(`${name} (tick ${v.snapshot(isGameSnapshot).tick}): ${shows}`);
  const placed = s.enemies.map((e) => ({ e: { x: e.x, y: e.y }, p: placeBee(s, e) }));
  if (!s.player.hidden) placed.unshift({ e: s.player, p: placeBear(s) });
  placed.forEach(({ e, p }, i) => {
    if (nearBurst(s, e.x, e.y)) {
      console.log(`  --  the ${p.what} is under a particle burst: not compared`);
      return;
    }
    // Later sprites draw over earlier ones.
    const share = shown(
      frame,
      p,
      placed.slice(i + 1).map((l) => l.p),
    );
    check(share >= 0.9, `the ${p.what} is drawn from its generated sheet`, share.toFixed(2));
  });
  check(
    waxMisses(
      frame,
      s,
      placed.map((l) => l.p),
    ) === 0,
    "the honeycomb wax shows wherever no sprite is",
  );
  v.frame(name, 2);
  return s;
}

/** Run the fixture from the last stop to `tick`, inputs and all. */
function plan(): { tick: number; steps: InputStep[] }[] {
  return planCaptures({ ...script, captureTicks: stops.map((s) => s.tick) });
}

function runSteps(v: Verify, steps: InputStep[]): void {
  const chunk: InputScript = { ...script, steps, captureTicks: [] };
  v.page.eval(`window.__arcade.runScript(${JSON.stringify(chunk)}); "ok"`);
}

function load(v: Verify): void {
  v.page.eval(
    `(() => { const a = window.__arcade; a.pause(); a.seed(${script.seed}); a.load("game", { software: "sweetSam" }); return "ok"; })()`,
  );
}

function play(v: Verify): void {
  v.openHook("scene=game");
  load(v);
  const steps = plan();
  stops.forEach((stop, i) => {
    const part = steps[i];
    if (part === undefined) throw new Error(`no steps to tick ${stop.tick}`);
    runSteps(v, part.steps);
    const s = checkStop(v, stop.name, stop.shows);
    if (stop.tick === 1) {
      check(
        new Set(s.enemies.map((e) => e.kind)).size === 4 && s.enemies.every((e) => e.blue === 0),
        "four bees, awake",
      );
      check(s.items === 244, "every honey drop and honey pot is out", s.items);
    }
    if (stop.tick === 382) {
      const out = s.enemies.filter((e) => !e.home);
      check(out.length > 0 && out.every((e) => e.blue > 0), "a honey pot eaten: every bee out of the home is sleepy");
    }
    if (stop.tick === 387) {
      check(s.popups.length === 1 && s.popups[0]?.frameIdx === 0, "a sleepy bee eaten: 200 points float above it");
      check(s.particlesActive > 0, "and a burst of particles", s.particlesActive);
    }
    if (stop.tick === 1239)
      check(s.enemies.filter((e) => e.blue > 0 && !e.flash).length >= 3, "at least three bees asleep");
    if (stop.tick === 4879)
      check(s.state === "DEATHWAIT" && s.lives === 2 && s.particlesActive > 0, "a bee caught the bear: a life lost");
    if (stop.tick === 7977)
      check(
        s.enemies.some((e) => e.flash),
        "a sleepy bee flashes awake",
      );
  });
}

function sheets(v: Verify): void {
  console.log("sprite sheets:");
  for (const { file, render } of sweetSamArtFiles) {
    const png = PNG.sync.write(render());
    const scale = file === "maze.png" ? 3 : 8;
    writeFileSync(join(v.dir, `sheet-${file}`), upscale(png, scale));
    check(
      Buffer.compare(readFileSync(join(sweetSamImagesDir, file)), png) === 0,
      `${file} is the committed file (written ${scale}x)`,
    );
  }
}

/** Replay `ticks` ticks of the fixture a few at a time, so the video runs at about game speed. */
function replayLive(v: Verify, from: number, to: number): void {
  const inputs = planCaptures({ ...script, captureTicks: [from, to] })[1]?.steps ?? [];
  // Re-chunk into 6-tick pieces, each followed by its 100 ms of wall-clock.
  let pending: InputStep[] = [];
  let ticks = 0;
  const flush = (): void => {
    if (pending.length === 0) return;
    runSteps(v, pending);
    v.wait(ticks * 16);
    pending = [];
    ticks = 0;
  };
  for (const step of inputs) {
    let left = step.ticks;
    while (left > 0) {
      const n = Math.min(left, 6 - ticks);
      pending.push({ ...step, ticks: n });
      ticks += n;
      left -= n;
      if (ticks === 6) flush();
    }
  }
  flush();
}

/** Jump straight to `tick` (no video time spent). */
function skipTo(v: Verify, from: number, tick: number): void {
  const part = planCaptures({ ...script, captureTicks: [from, tick] })[1];
  if (part !== undefined) runSteps(v, part.steps);
}

function video(v: Verify): void {
  console.log("video:");
  v.record(
    "replay",
    () => {
      load(v);
      runSteps(v, plan()[0]?.steps ?? []);
      v.wait(600);
      // The start, READY!, the first honey pot, a sleepy bee eaten, more honey.
      replayLive(v, 1, 1300);
      // A life lost.
      skipTo(v, 1300, 4800);
      replayLive(v, 4800, 4960);
      // Sleepy bees flashing awake.
      skipTo(v, 4960, 7900);
      replayLive(v, 7900, 8040);
      v.wait(500);
    },
    { scene: "game" },
  );
  check(sweetSam(v).score > 0, "the recording replayed Sweet Sam", sweetSam(v).score);
  v.screenshot("replay-screenshot");
}

await verify("sweet-sam-art", (v) => {
  play(v);
  sheets(v);
  video(v);
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
