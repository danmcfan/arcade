// Sleepy bees pause the scatter/chase timer (#152) in a real browser
// (`bun run verify sweet-sam-sleepy-timer`). Replays the sweet-sam-levels
// fixture through the `?debug` test hook: the bear eats a honey pot at tick
// 620 in chase (re-picked for #201), and `modeTicks` holds at its value for the whole sleepy time,
// then counts down again in the same mode. Writes a frame at each stop and a
// video of the sleepy stretch to out/verify/sweet-sam-sleepy-timer/.

import type { SweetSamSnapshot } from "../../src/game/snapshot.ts";
import { inputPath, loadScript } from "../../test/parity/fixtures.ts";
import { loadFixture, replayLive, skipTo } from "../fixture-replay.ts";
import { isGameSnapshot, verify, type Verify } from "../harness.ts";

function check(ok: boolean, what: string, got?: unknown): void {
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

function sweetSam(v: Verify): SweetSamSnapshot {
  const g = v.snapshot(isGameSnapshot);
  if (g.software !== "sweetSam" || g.sw === null || !("modeTicks" in g.sw)) throw new Error("not in Sweet Sam");
  return g.sw;
}

const sleepy = (s: SweetSamSnapshot): boolean => s.enemies.some((e) => e.blue > 0);

const levels = loadScript(inputPath("sweet-sam-levels"));

await verify("sweet-sam-sleepy-timer", (v) => {
  v.openHook("scene=game");
  v.dismissNotice();
  loadFixture(v, levels);

  skipTo(v, levels, 0, 619);
  const before = sweetSam(v);
  check(!sleepy(before), "tick 619: no bee is sleepy yet", before.enemies);
  v.frame("1-before-honey-pot", 2);

  skipTo(v, levels, 619, 624);
  const start = sweetSam(v);
  check(sleepy(start), "tick 624: the honey pot made the bees sleepy");
  const held = start.modeTicks;
  v.frame("2-sleepy", 2);

  skipTo(v, levels, 624, 1560);
  const end = sweetSam(v);
  check(sleepy(end), "tick 1560: still sleepy");
  check(
    end.modeTicks === held && end.modeIndex === start.modeIndex,
    `modeTicks held at ${held} through 936 sleepy ticks`,
    [end.modeIndex, end.modeTicks],
  );
  v.frame("3-sleepy-ending", 2);

  skipTo(v, levels, 1560, 1600);
  const after = sweetSam(v);
  check(!sleepy(after), "tick 1600: sleepy time is over");
  check(
    after.modeIndex === start.modeIndex && after.mode === start.mode && after.modeTicks < held,
    `the timer counts down again in the same mode (${held} → ${after.modeTicks})`,
    [after.modeIndex, after.mode, after.modeTicks],
  );
  v.frame("4-timer-resumed", 2);

  v.record(
    "sleepy-stretch",
    () => {
      v.dismissNotice();
      loadFixture(v, levels);
      skipTo(v, levels, 0, 570);
      replayLive(v, levels, 570, 1620);
      v.wait(500);
    },
    { scene: "game" },
  );
  v.assertNoErrors();
});
