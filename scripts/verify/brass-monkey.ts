// Brass Monkey played to the payout in a real browser (#39): `bun run verify brass-monkey`.
// The bot in scripts/gen-brass-monkey-play.ts plays a run from the hub
// (a token in the cabinet) in-process; the check replays its inputs in the
// page through the `?debug` test hook and, at each moment the issue names,
// checks the page's snapshot against the in-process one and writes a frame:
// the first climb, a jump over a gear, a bolt collected, a life lost, the
// girder floor finished, the conveyor floor, the escaped scene, game over and
// the payout it opens, and the hub after the payout. Then it records the
// whole run as a video. Files go to out/verify/brass-monkey/.

import { NO_INPUT, type Input } from "../../src/engine/input.ts";
import * as rng from "../../src/engine/rng.ts";
import { createScene } from "../../src/game/registry.ts";
import type { BrassMonkeySnapshot, GameSnapshot } from "../../src/game/snapshot.ts";
import type { InputScript } from "../../src/game/script.ts";
import { boltPoints, hazardPoints } from "../../src/brass-monkey/tuning.ts";
import { play } from "../gen-brass-monkey-play.ts";
import { isGameSnapshot, verify, type Verify } from "../harness.ts";

const seed = 163;
const run = play(seed, true);
if (!run.escaped) throw new Error(`seed ${seed} no longer escapes: re-pick it with the bot`);

/** Space pressed, let go, pressed again: skip the payout's count, then close it. */
const space: Input = { ...NO_INPUT, space: true };
const idle = (ticks: number): Input[] => Array.from({ length: ticks }, () => NO_INPUT);
const inputs: Input[] = [...run.inputs, ...idle(30), space, NO_INPUT, space, ...idle(10)];

const bm = (s: GameSnapshot): BrassMonkeySnapshot | null =>
  s.software === "brassMonkey" && s.sw !== null && "moving" in s.sw ? s.sw : null;

/** The moments to show: the first tick (1-based) each happens in the in-process replay. */
function moments(): [name: string, tick: number][] {
  rng.seed(seed);
  const scene = createScene("game");
  const found = new Map<string, number>();
  const mark = (name: string, tick: number): void => {
    if (!found.has(name)) found.set(name, tick);
  };
  let prev: BrassMonkeySnapshot | null = null;
  try {
    inputs.forEach((input, k) => {
      scene.step(input);
      const g = scene.snapshot();
      if (!("arcade" in g)) return;
      const m = bm(g);
      const t = k + 1;
      if (m !== null && prev !== null) {
        if (m.footing === "climb" && m.y < prev.y && m.y < 236) mark("1-climb", t);
        if (
          m.score - prev.score === hazardPoints &&
          m.hazards.some((h) => h.kind === "gear" && Math.abs(h.x - m.x) < 8)
        )
          mark("2-jumped-gear", t);
        if (m.score - prev.score === boltPoints) mark("3-bolt", t);
        if (m.phase === "dying" && prev.phase === "play") mark("4-life-lost", t + 20);
        if (m.phase === "clear") mark("5-floor-finished", t + 10);
        if (m.floor === 1 && m.phase === "play") mark("6-conveyor-floor", t + 200);
        if (m.phase === "escape") mark("7-escaped", t + 90);
        if (m.phase === "over") {
          mark("8-game-over-payout", t + 20);
          finalScore = m.score;
        }
      }
      if (g.software === null && prev !== null) mark("9-hub-after-payout", t);
      prev = m ?? prev;
    });
  } finally {
    scene.dispose?.();
  }
  return [...found].toSorted((a, b) => a[1] - b[1]);
}

/** The run's score at game over. */
let finalScore = 0;

let checks = 0;
function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

/** Expected snapshots at each moment, from the in-process replay. */
function expected(ticks: readonly number[]): Map<number, GameSnapshot> {
  rng.seed(seed);
  const scene = createScene("game");
  const out = new Map<number, GameSnapshot>();
  try {
    inputs.forEach((input, k) => {
      scene.step(input);
      const s = scene.snapshot();
      if (ticks.includes(k + 1) && "arcade" in s) out.set(k + 1, s);
    });
  } finally {
    scene.dispose?.();
  }
  return out;
}

const script = (from: number, to: number): InputScript => ({
  name: "brass-monkey-verify",
  scene: "game",
  seed,
  captureTicks: [],
  steps: inputs.slice(from, to).map((input) => ({ ticks: 1, input })),
});

function walkthrough(v: Verify): void {
  const shots = moments();
  const want = expected(shots.map(([, t]) => t));
  v.openHook("scene=game");
  v.page.eval(`window.__arcade.seed(${seed}); window.__arcade.load("game"); "ok"`);
  let at = 0;
  for (const [name, tick] of shots) {
    v.page.eval(`window.__arcade.runScript(${JSON.stringify(script(at, tick))}); "ok"`);
    at = tick;
    const got = v.snapshot(isGameSnapshot);
    const exp = want.get(tick);
    const m = bm(got);
    console.log(`${name} (tick ${tick}):`);
    check(JSON.stringify(got) === JSON.stringify(exp), "the page's snapshot is the in-process replay's", {
      page: m === null ? got.menu : { phase: m.phase, floor: m.floor, score: m.score, lives: m.lives },
    });
    if (name === "8-game-over-payout") {
      check(
        got.menu === "payout" && (got.payout?.score ?? 0) > 0,
        "game over opened the payout with the score",
        got.payout,
      );
      check(
        got.payout?.total === Math.floor(finalScore / 100),
        `it pays 1 ticket per 100 of the run's ${finalScore} points`,
        got.payout,
      );
    }
    if (name === "9-hub-after-payout") check(got.arcade.tickets > 0, "the tickets were paid", got.arcade.tickets);
    v.frame(name, 2);
  }
}

/** One character a tick, its bits the held keys: too many ticks for a JSON array on agent-browser's command line. */
const packed = inputs
  .map((i) => String.fromCodePoint(64 + (+i.up | (+i.down << 1) | (+i.left << 2) | (+i.right << 3) | (+i.space << 4))))
  .join("");

function video(v: Verify): void {
  console.log("video:");
  // Three ticks a frame: the whole run in under a minute.
  v.record(
    "run",
    () => {
      v.page.eval(
        `window.__arcade.pause(); window.__arcade.seed(${seed}); window.__arcade.load("game");
         window.__inputs = ${JSON.stringify(packed)}; window.__at = 0;
         window.__timer = setInterval(() => {
           for (let n = 0; n < 3 && window.__at < window.__inputs.length; n++) {
             const b = window.__inputs.charCodeAt(window.__at++) - 64;
             window.__arcade.step(1, { up: (b & 1) > 0, down: (b & 2) > 0, left: (b & 4) > 0, right: (b & 8) > 0, space: (b & 16) > 0 });
           }
         }, 16); "ok"`,
      );
      v.wait(Math.ceil(inputs.length / 3) * 17 + 1500);
    },
    { scene: "game" },
  );
  check(v.page.eval("String(window.__at)") === String(inputs.length), "the video played the whole run");
  const end = v.snapshot(isGameSnapshot);
  check(
    end.software === null && end.arcade.tickets === Math.floor(finalScore / 100),
    "and ended back in the hub, paid",
    {
      software: end.software,
      tickets: end.arcade.tickets,
    },
  );
}

await verify("brass-monkey", (v) => {
  walkthrough(v);
  video(v);
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
