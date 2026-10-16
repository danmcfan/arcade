// The bear stands still for a tick after each honey drop and three after a
// pot, while the bees keep moving (#221), in a real browser
// (`bun run verify sweet-sam-eat-pause`). Replays the sweet-sam-clear fixture
// through the `?debug` test hook tick by tick until the bear eats a drop and
// then a pot, checks each pause, and writes frames and a video to
// out/verify/sweet-sam-eat-pause/.

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

/** Steps from `tick` until the bear eats an item scoring `points`; the tick it ate on. */
function stepUntilEats(v: Verify, tick: number, points: number): number {
  let s = sweetSam(v);
  for (let t = tick; t < tick + 3000; t++) {
    skipTo(v, script, t, t + 1);
    const next = sweetSam(v);
    if (next.state === "PLAY" && next.items === s.items - 1 && next.score - s.score === points) return t + 1;
    s = next;
  }
  throw new Error(`the bear never ate a ${points}-point item`);
}

/** Steps `ticks` ticks from `tick`, checking the bear holds still and some bee moves each one. */
function checkHeld(v: Verify, tick: number, ticks: number, what: string): void {
  for (let k = 0; k < ticks; k++) {
    const s = sweetSam(v);
    skipTo(v, script, tick + k, tick + k + 1);
    const next = sweetSam(v);
    const beeMoved = next.enemies.some((e, i) => e.x !== s.enemies[i]?.x || e.y !== s.enemies[i]?.y);
    check(
      next.player.x === s.player.x && next.player.y === s.player.y && beeMoved,
      `${what}: tick ${k + 1} after eating, the bear holds still and the bees move`,
      [s.player, next.player],
    );
  }
  const s = sweetSam(v);
  skipTo(v, script, tick + ticks, tick + ticks + 1);
  const next = sweetSam(v);
  check(next.player.x !== s.player.x || next.player.y !== s.player.y, `${what}: then the bear moves again`, [
    s.player,
    next.player,
  ]);
}

await verify("sweet-sam-eat-pause", (v) => {
  v.openHook("scene=game");
  v.dismissNotice();
  loadFixture(v, script);

  skipTo(v, script, 0, 200);
  const drop = stepUntilEats(v, 200, 10);
  v.frame("1-drop-eaten", 2);
  checkHeld(v, drop, 1, `drop at ${drop}`);

  const pot = stepUntilEats(v, drop + 2, 50);
  v.frame("2-pot-eaten", 2);
  checkHeld(v, pot, 3, `pot at ${pot}`);
  v.frame("3-after-pot-pause", 2);

  v.record(
    "eat-pause",
    () => {
      v.dismissNotice();
      loadFixture(v, script);
      skipTo(v, script, 0, Math.max(0, pot - 120));
      replayLive(v, script, Math.max(0, pot - 120), pot + 60);
      v.wait(500);
    },
    { scene: "game" },
  );

  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
