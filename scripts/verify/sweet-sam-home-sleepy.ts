// A honey pot makes the bees in the home sleepy too (#151), in a real browser
// (`bun run verify sweet-sam-home-sleepy`). Replays the sweet-sam-clear
// fixture through the `?debug` test hook: the tick before its first honey
// pot, the pot eaten (every bee sleepy, one still in the home) and the orange
// bee leaving the home still sleepy. Writes each frame, then a video of the
// stretch. Files go to out/verify/sweet-sam-home-sleepy/.

import type { SweetSamSnapshot } from "../../src/game/snapshot.ts";
import { inputPath, loadScript } from "../../test/parity/fixtures.ts";
import { loadFixture, replayLive, skipTo } from "../fixture-replay.ts";
import { isGameSnapshot, sweetSamIn, verify, type Verify } from "../harness.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

function sweetSam(v: Verify): SweetSamSnapshot {
  return sweetSamIn(v.snapshot(isGameSnapshot));
}

const script = loadScript(inputPath("sweet-sam-clear"));

function bees(s: SweetSamSnapshot): string {
  return s.enemies.map((e) => `${e.kind}${e.home ? " (home)" : ""} ${e.blue}`).join(", ");
}

await verify("sweet-sam-home-sleepy", (v) => {
  v.openHook("scene=game");
  loadFixture(v, script);

  skipTo(v, script, 0, 771);
  let s = sweetSam(v);
  console.log(`771: ${bees(s)}`);
  check(s.enemies.filter((e) => e.home).length === 1, "one bee still in the home");
  check(
    s.enemies.every((e) => e.blue === 0),
    "every bee awake before the honey pot",
  );
  v.frame("1-before-honey-pot", 2);

  skipTo(v, script, 771, 772);
  s = sweetSam(v);
  console.log(`772: ${bees(s)}`);
  check(s.enemies.filter((e) => e.home).length === 1, "the bee is still in the home");
  check(
    s.enemies.every((e) => e.blue > 0),
    "a honey pot eaten: every bee is sleepy, the ones in the home too",
    bees(s),
  );
  v.frame("2-honey-pot-eaten", 2);

  skipTo(v, script, 772, 1051);
  s = sweetSam(v);
  console.log(`1051: ${bees(s)}`);
  const orange = s.enemies.find((e) => e.kind === "orange");
  check(orange !== undefined && !orange.home && orange.blue > 0, "the orange bee leaves the home still sleepy", orange);
  v.frame("3-orange-leaves-sleepy", 2);

  v.record(
    "home-sleepy",
    () => {
      loadFixture(v, script);
      skipTo(v, script, 0, 730);
      replayLive(v, script, 730, 1100);
      v.wait(500);
    },
    { scene: "game" },
  );

  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
