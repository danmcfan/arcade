// Bees leave the home as in Pac-Man (#155) in a real browser
// (`bun run verify sweet-sam-bee-release`). Two runs, each played headless
// first to find its ticks, then replayed through the `?debug` test hook:
//
// 1. The idle timer: the bear holds Down from the start, eats the drops on
//    its way into the bottom-left corner and stops there. 4 s after its last
//    drop teal leaves the home, and 4 s later orange.
// 2. The global counter: the bot (seed 12) loses a life; pink, teal and orange
//    wait in the home until 7, 17 and 32 drops are eaten after the death.
//
// Writes a frame at each stop and a video of each run to
// out/verify/sweet-sam-bee-release/.

import { NO_INPUT, type Input } from "../../src/engine/input.ts";
import * as rng from "../../src/engine/rng.ts";
import { addSoundListener } from "../../src/engine/audio.ts";
import type { InputScript } from "../../src/game/script.ts";
import type { SweetSamSnapshot } from "../../src/game/snapshot.ts";
import { levelValues } from "../../src/sweet-sam/levels.ts";
import { globalDotLimits } from "../../src/sweet-sam/release.ts";
import { bobPixels, homeY } from "../../src/sweet-sam/update.ts";
import { SweetSamSoftware } from "../../src/sweet-sam/software.ts";
import { loadFixture, replayLive, skipTo } from "../fixture-replay.ts";
import { check, isGameSnapshot, verify, type Verify } from "../harness.ts";
import { compress, play } from "../sweet-sam-bot.ts";

function sweetSam(v: Verify): SweetSamSnapshot {
  const g = v.snapshot(isGameSnapshot);
  if (g.software !== "sweetSam" || g.sw === null || !("modeTicks" in g.sw)) throw new Error("not in Sweet Sam");
  return g.sw;
}

/** Where each bee waits in the home: it bobs there, so only its x is kept. */
const spots = new Map<string, number>();

/** The highest y a bee bobs up to in the home. */
const bobTop = homeY - bobPixels;

/** Whether the bee of `kind` is still at its spot in the home: same x, within its bob. */
function waiting(s: SweetSamSnapshot, kind: string): boolean {
  const e = s.enemies.find((b) => b.kind === kind);
  return e !== undefined && e.home && e.x === spots.get(kind) && e.y >= bobTop;
}

const eaten = (s: SweetSamSoftware): number => s.items.filter((i) => i === null).length;

/** Script ticks: tick 1 is a hub tick, then one game update per tick. */
function script(name: string, seed: number, inputs: readonly Input[]): InputScript {
  return {
    name,
    scene: "game",
    software: "sweetSam",
    seed,
    captureTicks: [],
    steps: [{ ticks: 1, input: {} }, ...compress(inputs)],
  };
}

// Run 1, headless: the tick each bee is released and the last drop eaten before.
const down: Input = { ...NO_INPUT, down: true };
const idleInputs: Input[] = [];
const idle = { lastDrop: 0, teal: 0, orange: 0 };
{
  const off = addSoundListener(() => {});
  rng.seed(1);
  const s = new SweetSamSoftware(0);
  for (let t = 2; (idle.orange === 0 || t <= idle.orange + 300) && t < 2000; t++) {
    const before = eaten(s);
    s.update(down);
    idleInputs.push(down);
    if (eaten(s) > before) idle.lastDrop = t;
    for (const kind of ["teal", "orange"] as const) {
      if (idle[kind] === 0 && s.enemies.find((e) => e.kind === kind)?.dotMinimum === 0) idle[kind] = t;
    }
  }
  off();
}
const idleScript = script("sweet-sam-bee-release-idle", 1, idleInputs);
const idleTicks = levelValues(1).idleReleaseTicks;

// Run 2, headless: the bot until 40 drops after its first lost life.
let deathPlay = 0;
let ticks = 1;
const dropsAt: number[] = [];
let lives = -1;
let dropsBefore = 0;
const run = play(12, 1, (s) => {
  ticks++;
  if (lives < 0) lives = s.lives;
  if (deathPlay === 0 && s.lives < lives && s.stateMachine.currentId() === "PLAY") {
    deathPlay = ticks;
    dropsBefore = eaten(s);
  }
  if (deathPlay > 0 && eaten(s) - dropsBefore > dropsAt.length) dropsAt.push(ticks);
  return dropsAt.length >= 40;
});
const globalScript = script("sweet-sam-bee-release-global", 12, run.inputs);

await verify("sweet-sam-bee-release", (v) => {
  v.openHook("scene=game");
  v.dismissNotice();

  console.log("idle timer:");
  loadFixture(v, idleScript);
  skipTo(v, idleScript, 0, idle.teal - 1);
  const s0 = sweetSam(v);
  check(idle.teal - idle.lastDrop === idleTicks, `teal is freed ${idleTicks} ticks after the last drop`, idle);
  check(s0.enemies.find((e) => e.kind === "teal")?.dotMin !== 0, `tick ${idle.teal - 1}: teal still waits`);
  v.frame("1-idle-teal-waits", 2);
  skipTo(v, idleScript, idle.teal - 1, idle.teal);
  check(sweetSam(v).enemies.find((e) => e.kind === "teal")?.dotMin === 0, `tick ${idle.teal}: teal is freed`);
  skipTo(v, idleScript, idle.teal, idle.teal + 180);
  check(sweetSam(v).enemies.find((e) => e.kind === "teal")?.home === false, "and is out of the home 3 s later");
  v.frame("2-idle-teal-out", 2);
  check(idle.orange - idle.teal === idleTicks, `orange is freed ${idleTicks} ticks after teal`, idle);
  skipTo(v, idleScript, idle.teal + 180, idle.orange + 180);
  check(sweetSam(v).enemies.find((e) => e.kind === "orange")?.home === false, "then orange leaves too");
  v.frame("3-idle-orange-out", 2);

  console.log("global counter after a lost life:");
  loadFixture(v, globalScript);
  skipTo(v, globalScript, 0, deathPlay);
  const start = sweetSam(v);
  for (const e of start.enemies) spots.set(e.kind, e.x);
  check(
    start.enemies.slice(1).every((e) => e.home),
    "after the lost life pink, teal and orange wait in the home",
  );
  v.frame("4-after-death-all-home", 2);
  let at = deathPlay;
  for (const kind of ["pink", "teal", "orange"] as const) {
    const n = globalDotLimits[kind];
    const tick = dropsAt[n - 1] ?? 0;
    skipTo(v, globalScript, at, tick - 1);
    check(waiting(sweetSam(v), kind), `${n - 1} drops after the death: ${kind} still waits`);
    skipTo(v, globalScript, tick - 1, tick + 30);
    at = tick + 30;
    check(!waiting(sweetSam(v), kind), `${n} drops: ${kind} leaves`);
    v.frame(`${kind === "pink" ? 5 : kind === "teal" ? 6 : 7}-${kind}-leaves-at-${n}`, 2);
  }

  v.record(
    "idle-timer",
    () => {
      v.dismissNotice();
      loadFixture(v, idleScript);
      skipTo(v, idleScript, 0, idle.lastDrop - 60);
      replayLive(v, idleScript, idle.lastDrop - 60, idle.orange + 90);
      v.wait(500);
    },
    { scene: "game" },
  );
  v.record(
    "global-counter",
    () => {
      v.dismissNotice();
      loadFixture(v, globalScript);
      skipTo(v, globalScript, 0, deathPlay - 60);
      replayLive(v, globalScript, deathPlay - 60, at);
      v.wait(500);
    },
    { scene: "game" },
  );
  v.assertNoErrors();
});
