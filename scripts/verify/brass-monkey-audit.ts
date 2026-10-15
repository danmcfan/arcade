// Brass Monkey's gameplay audit (#138) in a real browser: `bun run verify brass-monkey-audit`.
// Each part shows one finding filed from the audit, as frames for its issue:
//
// 1. The monkey jumps left, uphill, on a sloped girder and drops through it
//    to the girder below, losing a life (seed 20, the parity bot's own run).
// 2. A jump scores 100 for a gear rolling along the girder below, 26 px under
//    the monkey's feet (seed 8, a small bot that waits on the girder at y 187).
// 3. A save whose high score came from another cabinet: Brass Monkey's first
//    run shows it as its own HIGH SCORE.
//
// The inputs are played in-process first, then replayed in the page through
// the `?debug` test hook, whose snapshot must match. Files go to
// out/verify/brass-monkey-audit/.

import { NO_INPUT, type Input } from "../../src/engine/input.ts";
import * as rng from "../../src/engine/rng.ts";
import { createScene } from "../../src/game/registry.ts";
import type { BrassMonkeySnapshot, GameSnapshot } from "../../src/game/snapshot.ts";
import { girderFloor, girderTop } from "../../src/brass-monkey/floors.ts";
import { hazardPoints } from "../../src/brass-monkey/tuning.ts";
import { saveKey } from "../../src/title/save.ts";
import { play } from "../gen-brass-monkey-play.ts";
import { isGameSnapshot, isTitleSnapshot, verify, type Verify } from "../harness.ts";

let checks = 0;
function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

const bm = (s: GameSnapshot): BrassMonkeySnapshot | null =>
  s.software === "brassMonkey" && s.sw !== null && "moving" in s.sw ? s.sw : null;

/** The monkey on 0-based tick `k` of `ticks`. */
function monkeyAt(ticks: readonly GameSnapshot[], k: number): BrassMonkeySnapshot {
  const s = ticks[k];
  const m = s === undefined ? null : bm(s);
  if (m === null) throw new Error(`no Brass Monkey on tick ${k + 1}`);
  return m;
}

/** Each tick's snapshot of `inputs` played straight into Brass Monkey from `seed`. */
function replay(seed: number, inputs: readonly Input[]): GameSnapshot[] {
  rng.seed(seed);
  const scene = createScene("game", { software: "brassMonkey" });
  try {
    return inputs.map((i) => {
      scene.step(i);
      const s = scene.snapshot();
      if (!("arcade" in s)) throw new Error("not the game scene");
      return s;
    });
  } finally {
    scene.dispose?.();
  }
}

/**
 * Open the page through the test hook. A headless browser can report a
 * touch-first device, which puts up the "needs a keyboard" notice: a key
 * press and a few real frames take it down.
 */
function open(v: Verify, query?: string): void {
  v.openHook(query);
  v.page.eval(
    `window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", code: "KeyZ" }));
     window.dispatchEvent(new KeyboardEvent("keyup", { key: "z", code: "KeyZ" }));
     window.__arcade.resume(); "ok"`,
  );
  v.wait(200);
  v.page.eval(`window.__arcade.pause(); "ok"`);
}

/** Load Brass Monkey from `seed` in the page and play `inputs` up to each tick in `at` (1-based), checking and framing each. */
function showInPage(v: Verify, seed: number, inputs: readonly Input[], shots: readonly [string, number][]): void {
  const want = replay(seed, inputs);
  open(v, "scene=game");
  v.page.eval(`window.__arcade.seed(${seed}); window.__arcade.load("game", { software: "brassMonkey" }); "ok"`);
  let from = 0;
  for (const [name, tick] of shots) {
    // One character a tick, its bits the held keys: a JSON script is too long for agent-browser's command line.
    const packed = inputs
      .slice(from, tick)
      .map((i) =>
        String.fromCodePoint(64 + (+i.up | (+i.down << 1) | (+i.left << 2) | (+i.right << 3) | (+i.space << 4))),
      )
      .join("");
    v.page.eval(
      `for (const c of ${JSON.stringify(packed)}) {
         const b = c.charCodeAt(0) - 64;
         window.__arcade.step(1, { up: (b & 1) > 0, down: (b & 2) > 0, left: (b & 4) > 0, right: (b & 8) > 0, space: (b & 16) > 0 });
       } "ok"`,
    );
    from = tick;
    const got = v.snapshot(isGameSnapshot);
    check(JSON.stringify(got) === JSON.stringify(want[tick - 1]), `${name}: the page's snapshot is the in-process one`);
    v.frame(name, 3);
  }
}

/** The top of the girder floor's girder `n` at x. */
const top = (n: number, x: number): number => {
  const g = girderFloor.girders[n];
  if (g === undefined) throw new Error(`no girder ${n}`);
  return girderTop(g, x);
};

function fallThrough(v: Verify): void {
  console.log("1. a jump uphill drops through the girder:");
  const seed = 20;
  const inputs = play(seed, false).inputs.slice(0, 700);
  const ticks = replay(seed, inputs);
  // The jump: left from x 94 on the girder at y 142, which rises 1 px every 16 px to the left.
  const jump = ticks.findIndex((s) => bm(s)?.footing === "air") + 1;
  const through = ticks.findIndex((s, k) => {
    const m = bm(s);
    return k > jump && m !== null && m.footing === "air" && m.y > top(4, m.x) + 1;
  });
  const dead = ticks.findIndex((s) => bm(s)?.phase === "dying") + 1;
  const m = monkeyAt(ticks, Math.max(0, through));
  check(
    jump > 0 && through > jump,
    "the monkey jumps, then is below the girder it jumped from while still in the air",
    {
      jump,
      through,
      m: { x: m.x, y: m.y, top: top(4, m.x) },
    },
  );
  const d = monkeyAt(ticks, dead - 1);
  check(d.y > 180 && d.lives === 2, "and lands on the girder below and loses a life", d);
  showInPage(v, seed, inputs, [
    ["1a-jump-uphill", jump + 14],
    ["1b-through-the-girder", through + 1],
    ["1c-life-lost", dead + 4],
  ]);
}

/** A small bot: up to the girder at y 187, wait at x 60, jump a gear coming along it or rolling on the girder below. */
function scoreBelowInputs(seed: number): { inputs: Input[]; tick: number } | null {
  rng.seed(seed);
  const scene = createScene("game", { software: "brassMonkey" });
  const snap = (): BrassMonkeySnapshot => {
    const s = scene.snapshot();
    const m = "arcade" in s ? bm(s) : null;
    if (m === null) throw new Error("not in Brass Monkey");
    return m;
  };
  const route = [{ x: 188, up: true }, { x: 36, up: true }, { x: 60 }];
  const inputs: Input[] = [NO_INPUT];
  scene.step(NO_INPUT);
  let leg = 0;
  let climbing = false;
  let prevSpace = false;
  let jumpY = 0;
  try {
    for (let k = 0; k < 3000; k++) {
      const m = snap();
      if (m.phase !== "play" || m.lives < 3) return null;
      const wp = route[leg];
      if (wp === undefined) return null;
      if (leg < 2 && (wp.up === true ? climbing && m.footing === "ground" : Math.abs(m.x - wp.x) <= 1)) leg++;
      climbing = m.footing === "climb";
      const to = route[leg] ?? wp;
      const i: Input = { ...NO_INPUT };
      if (m.footing === "climb") i.up = true;
      else if (m.footing === "ground") {
        if (Math.abs(m.x - to.x) > 1) {
          i.left = to.x < m.x;
          i.right = to.x > m.x;
        } else if (to.up === true) i.up = true;
        for (const h of m.hazards) {
          const coming = Math.sign(m.x - h.x) === h.dir;
          const ahead = Math.abs(h.x - m.x);
          if (coming && Math.abs(h.y - m.y) < 4 && ahead >= 16 && ahead <= 18) i.space = true;
          const below = h.y - m.y;
          if (leg === 2 && coming && h.footing === "ground" && below > 12 && below <= 32 && ahead < 14) i.space = true;
        }
      }
      if (i.space && prevSpace) i.space = false;
      prevSpace = i.space;
      if (i.space) jumpY = m.y;
      inputs.push(i);
      scene.step(i);
      const a = snap();
      const from = jumpY;
      const near = a.hazards.filter((h) => Math.abs(h.x - a.x) < 6);
      if (
        leg === 2 &&
        a.score - m.score === hazardPoints &&
        near.some((h) => h.y - from > 15) &&
        !near.some((h) => Math.abs(h.y - from) < 6)
      )
        return { inputs, tick: inputs.length };
    }
  } finally {
    scene.dispose?.();
  }
  return null;
}

function scoreBelow(v: Verify): void {
  console.log("2. a jump scores a gear on the girder below:");
  const seed = 8;
  const found = scoreBelowInputs(seed);
  if (found === null) throw new Error(`seed ${seed} no longer scores a gear below: re-pick it`);
  const { inputs, tick } = found;
  const at = replay(seed, inputs);
  const before = monkeyAt(at, tick - 2);
  const m = monkeyAt(at, tick - 1);
  const gear = m.hazards.find((h) => Math.abs(h.x - m.x) < 6);
  check(m.score - before.score === hazardPoints && gear !== undefined, `the jump scores ${hazardPoints}`);
  check(
    gear !== undefined && gear.y - top(3, m.x) > 15 && Math.abs(gear.y - top(2, gear.x)) <= 1,
    "for a gear on the girder at y 208, not the one the monkey jumped from",
    { gear, monkeyGirder: top(3, m.x) },
  );
  showInPage(v, seed, inputs, [
    ["2a-gear-on-girder-below", tick - 12],
    ["2b-scored", tick],
  ]);
}

function sharedHighScore(v: Verify): void {
  console.log("3. another cabinet's high score:");
  const save = { v: 3, highScore: 54321, tokens: 2, tickets: 0, prizes: [], player: { x: 80, y: 92, dir: "DOWN" } };
  open(v);
  v.page.eval(`localStorage.setItem(${JSON.stringify(saveKey)}, ${JSON.stringify(JSON.stringify(save))}); "ok"`);
  open(v);
  v.tap("space"); // Continue
  v.step(40, { left: true });
  v.step(40, { up: true });
  v.step(1, { up: true, space: true });
  v.step(30);
  const g = v.snapshot(isTitleSnapshot).game;
  const m = g === null ? null : bm(g);
  check(
    m !== null && m.score === 0 && m.highScore === 54321,
    "a first Brass Monkey run shows the save's 54321 as its high score",
    m,
  );
  v.frame("3-high-score-from-save", 3);
}

await verify("brass-monkey-audit", (v) => {
  fallThrough(v);
  scoreBelow(v);
  sharedHighScore(v);
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
