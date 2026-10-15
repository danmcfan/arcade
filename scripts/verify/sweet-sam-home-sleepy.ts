// A honey pot makes the bees in the home sleepy too (#151), in a real browser
// (`bun run verify sweet-sam-home-sleepy`). Replays the sweet-sam-clear
// fixture through the `?debug` test hook: the tick before its first honey
// pot, the pot eaten (every bee sleepy, two still in the home) and the teal
// bee leaving the home still sleepy. Writes each frame, then a video of the
// stretch. Files go to out/verify/sweet-sam-home-sleepy/.

import type { SweetSamSnapshot } from "../../src/game/snapshot.ts";
import { inputPath, loadScript } from "../../test/parity/fixtures.ts";
import { isRecord } from "../browser.ts";
import { loadFixture, replayLive, skipTo } from "../fixture-replay.ts";
import { isGameSnapshot, verify, type Verify } from "../harness.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

function isSweetSamSnapshot(x: unknown): x is SweetSamSnapshot {
  return isRecord(x) && typeof x["level"] === "number" && Array.isArray(x["enemies"]);
}

function sweetSam(v: Verify): SweetSamSnapshot {
  const g = v.snapshot(isGameSnapshot);
  if (g.software !== "sweetSam" || !isSweetSamSnapshot(g.sw)) throw new Error(`not in Sweet Sam: ${g.software}`);
  return g.sw;
}

const script = loadScript(inputPath("sweet-sam-clear"));

function bees(s: SweetSamSnapshot): string {
  return s.enemies.map((e) => `${e.kind}${e.home ? " (home)" : ""} ${e.blue}`).join(", ");
}

await verify("sweet-sam-home-sleepy", (v) => {
  v.openHook("scene=game");
  loadFixture(v, script);

  skipTo(v, script, 0, 381);
  let s = sweetSam(v);
  console.log(`381: ${bees(s)}`);
  check(s.enemies.filter((e) => e.home).length === 2, "two bees still in the home");
  check(
    s.enemies.every((e) => e.blue === 0),
    "every bee awake before the honey pot",
  );
  v.frame("1-before-honey-pot", 2);

  skipTo(v, script, 381, 382);
  s = sweetSam(v);
  console.log(`382: ${bees(s)}`);
  check(s.enemies.filter((e) => e.home).length === 2, "the two bees are still in the home");
  check(
    s.enemies.every((e) => e.blue > 0),
    "a honey pot eaten: every bee is sleepy, the ones in the home too",
    bees(s),
  );
  v.frame("2-honey-pot-eaten", 2);

  skipTo(v, script, 382, 509);
  s = sweetSam(v);
  console.log(`509: ${bees(s)}`);
  const teal = s.enemies.find((e) => e.kind === "teal");
  check(teal !== undefined && !teal.home && teal.blue > 0, "the teal bee leaves the home still sleepy", teal);
  v.frame("3-teal-leaves-sleepy", 2);

  v.record(
    "home-sleepy",
    () => {
      loadFixture(v, script);
      skipTo(v, script, 0, 340);
      replayLive(v, script, 340, 820);
      v.wait(500);
    },
    { scene: "game" },
  );

  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
