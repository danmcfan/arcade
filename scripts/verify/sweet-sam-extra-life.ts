// The extra life at 10,000 points (#154) in a real browser
// (`bun run verify sweet-sam-extra-life`). The headless bot plays seed 2 until
// the score passes 10,000; the check replays its inputs through the `?debug`
// test hook and shows the lives row going from two spare bears to three as
// the score crosses 10,000, with the extra-life sound. Writes a frame either
// side and a video of the crossing to out/verify/sweet-sam-extra-life/.

import type { InputScript } from "../../src/game/script.ts";
import type { SweetSamSnapshot } from "../../src/game/snapshot.ts";
import { extraLifeScore } from "../../src/sweet-sam/constants.ts";
import { loadFixture, replayLive, skipTo } from "../fixture-replay.ts";
import { isGameSnapshot, verify, type Verify } from "../harness.ts";
import { compress, play } from "../sweet-sam-bot.ts";

function check(ok: boolean, what: string, got?: unknown): void {
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

function sweetSam(v: Verify): SweetSamSnapshot {
  const g = v.snapshot(isGameSnapshot);
  if (g.software !== "sweetSam" || g.sw === null || !("modeTicks" in g.sw)) throw new Error("not in Sweet Sam");
  return g.sw;
}

const seed = 2;
const afterTicks = 240;
// Script ticks: tick 1 is a hub tick, then one bot input per tick.
let ticks = 1;
let crossing = 0;
const run = play(seed, 1, (s) => {
  ticks++;
  if (crossing === 0 && s.scoreValue >= extraLifeScore) crossing = ticks - 1;
  return crossing > 0 && ticks - crossing > afterTicks;
});
const script: InputScript = {
  name: "sweet-sam-extra-life",
  scene: "game",
  software: "sweetSam",
  seed,
  captureTicks: [],
  steps: [{ ticks: 1, input: {} }, ...compress(run.inputs)],
};
const end = run.ticks + 1;

await verify("sweet-sam-extra-life", (v) => {
  v.openHook("scene=game");
  v.dismissNotice();
  loadFixture(v, script);

  skipTo(v, script, 0, crossing - 1);
  const before = sweetSam(v);
  check(before.score < extraLifeScore, `tick ${crossing - 1}: score ${before.score}, below 10,000`);
  v.frame("1-before-10000", 2);
  v.page.eval("window.__arcade.sounds()");

  skipTo(v, script, crossing - 1, crossing);
  const at = sweetSam(v);
  const heard = v.page.eval("JSON.stringify(window.__arcade.sounds())");
  check(at.score >= extraLifeScore, `tick ${crossing}: score ${at.score} reaches 10,000`);
  check(at.lives === before.lives + 1, `lives ${before.lives} → ${at.lives}`, at.lives);
  check(heard.includes("play:ticket"), "the extra-life sound plays", heard);

  skipTo(v, script, crossing, end);
  const later = sweetSam(v);
  check(later.lives === at.lives, `${afterTicks} ticks on, still ${at.lives} lives`, later.lives);
  v.frame("2-after-10000", 2);

  v.record(
    "extra-life",
    () => {
      v.dismissNotice();
      loadFixture(v, script);
      skipTo(v, script, 0, crossing - 180);
      replayLive(v, script, crossing - 180, end);
      v.wait(500);
    },
    { scene: "game" },
  );
  v.assertNoErrors();
});
