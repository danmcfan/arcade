// An eaten bee becomes eyes that fly back to the home, where it revives and
// leaves again (#153), in a real browser (`bun run verify sweet-sam-eyes`).
// Replays the sweet-sam-clear fixture through the `?debug` test hook: pink
// eaten at 1318, its eyes on their way home, inside the home, revived, then
// leaving. The eyes are the placeholder drawing until their sprites (#196).
// Writes each frame, then a video of the trip. Files go to
// out/verify/sweet-sam-eyes/.

import type { SweetSamEnemySnapshot, SweetSamSnapshot } from "../../src/game/snapshot.ts";
import { inputPath, loadScript } from "../../test/parity/fixtures.ts";
import { loadFixture, replayLive, skipTo } from "../fixture-replay.ts";
import { isGameSnapshot, sweetSamIn, verify, type Verify } from "../harness.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

function pink(v: Verify): SweetSamEnemySnapshot {
  const s: SweetSamSnapshot = sweetSamIn(v.snapshot(isGameSnapshot));
  const e = s.enemies.find((b) => b.kind === "pink");
  if (e === undefined) throw new Error("no pink bee");
  return e;
}

const script = loadScript(inputPath("sweet-sam-clear"));

await verify("sweet-sam-eyes", (v) => {
  v.openHook("scene=game");
  v.dismissNotice();
  loadFixture(v, script);

  skipTo(v, script, 0, 1317);
  let p = pink(v);
  check(!p.eyes && p.blue > 0, "1317: pink is sleepy, about to be eaten", p);
  v.frame("1-before-eaten", 2);

  skipTo(v, script, 1317, 1318);
  p = pink(v);
  check(p.eyes && p.x === 172 && p.y === 118.25 && !p.home, "1318: eaten, pink is eyes where it was eaten", p);
  v.frame("2-eaten-eyes", 2);

  skipTo(v, script, 1318, 1420);
  p = pink(v);
  check(p.eyes && p.y === 116 && p.x > 112, "1420: the eyes reach the row above the home door", p);
  v.frame("3-eyes-above-door", 2);

  skipTo(v, script, 1420, 1440);
  p = pink(v);
  check(p.eyes && p.x === 112 && p.y > 116 && p.y < 140, "1440: the eyes drop through the door", p);
  v.frame("4-eyes-entering", 2);

  skipTo(v, script, 1440, 1444);
  p = pink(v);
  check(!p.eyes && p.home && p.blue === 0, "1444: pink revives in the home, awake", p);
  v.frame("5-revived", 2);

  skipTo(v, script, 1444, 1500);
  p = pink(v);
  check(!p.eyes && !p.home, "1500: pink has left the home again", p);
  v.frame("6-left-home", 2);

  v.record(
    "eyes-trip",
    () => {
      v.dismissNotice();
      loadFixture(v, script);
      skipTo(v, script, 0, 1290);
      replayLive(v, script, 1290, 1520);
      v.wait(500);
    },
    { scene: "game" },
  );

  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
