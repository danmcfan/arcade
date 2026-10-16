// The last life lost as the last enemy dies ends the run on that stage (#164)
// in a real browser (`bun run verify firefly-last-life-clear`). Plays seeded
// paid runs of Firefly with a bot that shoots until one enemy is left, then
// stops firing and steers under it until it rams the firefly on its last
// life. The run must end on the same stage, with no STAGE text under GAME
// OVER. Frames go to out/verify/firefly-last-life-clear/.

import type { FireflySnapshot } from "../../src/game/snapshot.ts";
import type { Input } from "../../src/engine/input.ts";
import { stageIntroTicks } from "../../src/firefly/rules.ts";
import { isTitleSnapshot, verify, type Verify } from "../harness.ts";

function check(ok: boolean, what: string, got?: unknown): void {
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

function firefly(v: Verify): FireflySnapshot | null {
  const g = v.snapshot(isTitleSnapshot).game;
  return g !== null && g.software === "firefly" && g.sw !== null && "stageTick" in g.sw ? g.sw : null;
}

function alive(s: FireflySnapshot): FireflySnapshot["enemies"] {
  return s.enemies.filter((e) => e.deadFrames === 0 && e.state !== "waiting");
}

/** Fire at the nearest enemy until one is left; then hold fire and steer under it. */
function botInput(s: FireflySnapshot): Partial<Input> {
  const px = s.player.x;
  const targets = alive(s);
  const fire = s.enemies.filter((e) => e.deadFrames === 0).length > 1;
  const target = targets.toSorted((a, b) => Math.abs(a.x - px) - Math.abs(b.x - px))[0];
  if (target === undefined || Math.abs(target.x - px) <= 2) return { space: fire };
  return target.x > px ? { space: fire, right: true } : { space: fire, left: true };
}

function startFirefly(v: Verify, seed: number): void {
  v.openHook();
  v.page.eval("localStorage.clear()");
  v.openHook();
  v.page.eval(`window.__arcade.seed(${seed}); "ok"`);
  v.tap("space"); // New game -> intro
  v.tap("space"); // intro -> hub
  v.step(31, { up: true });
  v.step(40, { right: true });
  v.step(1, { up: true, space: true });
}

/** A seeded run where the last enemy dies on the tick the last life is lost. */
function findLastLifeClear(v: Verify): boolean {
  for (let seed = 1; seed <= 40; seed++) {
    startFirefly(v, seed);
    let s = firefly(v);
    for (let t = 0; t < 30_000 && s !== null && !s.over && s.stage === 1; t++) {
      v.step(1, botInput(s));
      const next = firefly(v);
      if (next === null) break;
      const cleared = next.enemies.every((e) => e.deadFrames > 0);
      if (s.lives === 1 && next.lives === 0 && cleared) {
        console.log(`seed ${seed}, tick ${t}: the last enemy dies as the last life is lost`);
        v.frame("1-last-life-burst", 3);
        let end = firefly(v);
        for (let u = 0; u < 300 && end !== null && !end.over; u++) {
          v.step(1);
          end = firefly(v);
        }
        check(end?.over === true, "the run is over once the burst has played", end);
        check(end?.stage === 1, "the run ends on stage 1", end?.stage);
        v.dismissNotice();
        v.frame("2-game-over", 3);
        v.step(60);
        check(firefly(v)?.stage === 1, "the stage stays 1 under GAME OVER", firefly(v)?.stage);
        check(
          (firefly(v)?.stageTick ?? 0) > stageIntroTicks,
          "no STAGE text is drawn under GAME OVER",
          firefly(v)?.stageTick,
        );
        v.frame("3-still-game-over", 3);
        return true;
      }
      s = next;
    }
  }
  return false;
}

await verify("firefly-last-life-clear", (v) => {
  check(findLastLifeClear(v), "a bot run lost its last life as the last enemy died");
  v.assertNoErrors();
});
