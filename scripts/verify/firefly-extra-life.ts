// Firefly's extra life at 20,000 points (#230) in a real browser
// (`bun run verify firefly-extra-life`). Starts a paid run, sets the score to
// 19,990 through the test hook, and fires until a kill crosses 20,000: a
// third spare-life firefly appears bottom left, with the extra-life jingle.
// Then 69,990 to 70,000 adds one more. Writes a frame either side and a video
// of the crossing to out/verify/firefly-extra-life/.

import type { FireflySnapshot } from "../../src/game/snapshot.ts";
import { stageIntroTicks } from "../../src/firefly/rules.ts";
import { check, gameIn, startFirefly, verify, type Verify } from "../harness.ts";

function firefly(v: Verify): FireflySnapshot {
  const g = gameIn(v);
  if (g.software !== "firefly" || g.sw === null || !("stageTick" in g.sw)) throw new Error("not in Firefly");
  return g.sw;
}

/** Fire, steering under the nearest enemy, until the score reaches `score`; returns the sounds heard. */
function fireUntil(v: Verify, score: number): string {
  v.page.eval("window.__arcade.sounds()");
  for (let t = 0; t < 3000; t++) {
    const s = firefly(v);
    if (s.score >= score) return v.page.eval("JSON.stringify(window.__arcade.sounds())");
    const px = s.player.x;
    const target = s.enemies
      .filter((e) => e.deadFrames === 0 && e.state !== "waiting")
      .toSorted((a, b) => Math.abs(a.x - px) - Math.abs(b.x - px))[0];
    const steer =
      target === undefined || Math.abs(target.x - px) <= 2 ? {} : target.x > px ? { right: true } : { left: true };
    v.step(1, { space: true, ...steer });
  }
  throw new Error(`the score never reached ${score}`);
}

await verify("firefly-extra-life", (v) => {
  startFirefly(v, 1);
  v.step(stageIntroTicks + 400);

  for (const [i, threshold] of [20_000, 70_000].entries()) {
    v.scoreTo(threshold - 10);
    v.step(1);
    const before = firefly(v);
    check(before.score < threshold, `score ${before.score}, below ${threshold}`);
    v.frame(`${2 * i + 1}-before-${threshold}`, 3);
    const heard = fireUntil(v, threshold);
    const at = firefly(v);
    check(at.lives === before.lives + 1, `crossing ${threshold}: lives ${before.lives} → ${at.lives}`, at.lives);
    check(heard.includes("play:ticket"), "the extra-life jingle plays", heard);
    v.step(30);
    check(firefly(v).lives === at.lives, "30 ticks on, no second life", firefly(v).lives);
    v.frame(`${2 * i + 2}-after-${threshold}`, 3);
  }

  v.record(
    "extra-life",
    () => {
      v.page.eval(`window.__arcade.load("game", { software: "firefly" }); "ok"`);
      v.wait(3500);
      v.page.eval(`window.__arcade.scoreTo(19990); "ok"`);
      v.hold("Space", () => {
        for (let i = 0; i < 3; i++) {
          v.key("ArrowLeft", 700);
          v.wait(900);
          v.key("ArrowRight", 1400);
          v.wait(900);
        }
      });
      v.wait(1000);
    },
    { scene: "game" },
  );
  v.assertNoErrors();
});
