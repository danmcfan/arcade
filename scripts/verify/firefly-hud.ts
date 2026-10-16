// Firefly's HUD in Sweet Sam's style (#211), in a real browser
// (`bun run verify firefly-hud`). Loads each cabinet through the `?debug` test
// hook and frames them for a side-by-side look: "1UP" and "HIGH SCORE" along
// the top row, the score and high score on the same rolling dials, and the
// spare lives along the bottom left. Then plays Firefly holding fire until the
// score has rolled, and records a video of the dials turning.
// Files go to out/verify/firefly-hud/.

import type { FireflySnapshot } from "../../src/game/snapshot.ts";
import { isGameSnapshot, verify, type Verify } from "../harness.ts";

function check(ok: boolean, what: string, got?: unknown): void {
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

function load(v: Verify, software: "sweetSam" | "firefly"): void {
  v.page.eval(`window.__arcade.load("game", { software: "${software}" }); "ok"`);
  v.step(1);
  check(v.snapshot(isGameSnapshot).software === software, `${software} loads`);
}

function firefly(v: Verify): FireflySnapshot {
  const g = v.snapshot(isGameSnapshot);
  if (g.software !== "firefly" || g.sw === null || !("stageTick" in g.sw)) throw new Error("not in Firefly");
  return g.sw;
}

await verify("firefly-hud", (v) => {
  v.openHook("scene=game");
  v.dismissNotice();

  load(v, "sweetSam");
  v.step(60);
  v.frame("1-sweet-sam", 3);

  load(v, "firefly");
  v.step(60);
  v.frame("2-firefly", 3);

  // Fire while sweeping until something is hit, then let the dials settle.
  for (let i = 0; i < 40 && firefly(v).score === 0; i++)
    v.step(30, { space: true, left: i % 4 < 2, right: i % 4 >= 2 });
  const score = firefly(v).score;
  check(score > 0, `the firefly scores (${score})`, score);
  v.step(30);
  v.frame("3-firefly-scored", 3);

  v.record(
    "firefly-hud",
    () => {
      v.page.eval(`window.__arcade.load("game", { software: "firefly" }); "ok"`);
      v.wait(2500);
      v.hold("Space", () => {
        for (let i = 0; i < 3; i++) {
          v.key("ArrowLeft", 900);
          v.wait(1200);
          v.key("ArrowRight", 1800);
          v.wait(1200);
        }
      });
      v.wait(1000);
    },
    { scene: "game" },
  );
  v.assertNoErrors();
});
