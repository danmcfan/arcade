// Firefly's HUD in Sweet Sam's style (#211), in a real browser
// (`bun run verify firefly-hud`). Loads each cabinet through the `?debug` test
// hook and frames them for a side-by-side look: "1UP" and "HIGH SCORE" along
// the top row, the score and high score on the same rolling dials, and the
// spare lives along the bottom left. Then plays Firefly holding fire until the
// score has rolled, and records a video of the dials turning.
// Files go to out/verify/firefly-hud/.

import type { FireflySnapshot } from "../../src/game/snapshot.ts";
import { PNG } from "pngjs";
import { decodeDataUrl } from "../browser.ts";
import { check, isGameSnapshot, verify, type Verify } from "../harness.ts";

/** The screen's top-left corner in the frame, and the HUD's tile rows and dial columns (src/ui/scoreDials.ts). */
const screenX = 8;
const screenY = 8;

/** The pixels of the tile rectangle (columns c0..c1, rows r0..r1 of the screen) as "r,g,b,a" strings, one per pixel. */
function tiles(png: PNG, c0: number, c1: number, r0: number, r1: number): string[] {
  const out: string[] = [];
  for (let y = screenY + 8 * r0; y < screenY + 8 * r1; y++)
    for (let x = screenX + 8 * c0; x < screenX + 8 * c1; x++) {
      const i = (y * png.width + x) * 4;
      out.push(`${png.data[i]},${png.data[i + 1]},${png.data[i + 2]},${png.data[i + 3]}`);
    }
  return out;
}

function lit(px: string[]): number {
  return px.filter((p) =>
    p
      .split(",")
      .slice(0, 3)
      .some((c) => Number(c) > 128),
  ).length;
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

  // The HUD: labels on row 0, the score on the dials under "1UP", and the high score (no hub
  // high score here, so max(score, 0) = the score) on the same dials under "HIGH SCORE".
  const png = PNG.sync.read(decodeDataUrl(v.page.eval("window.__arcade.frame()")));
  check(lit(tiles(png, 1, 5, 0, 1)) > 0, "the 1UP label is drawn on the top row");
  check(lit(tiles(png, 11, 21, 0, 1)) > 0, "the HIGH SCORE label is drawn on the top row");
  const scoreDial = tiles(png, 1, 7, 1, 2);
  check(lit(scoreDial) > 0, "the score dial is drawn");
  check(
    JSON.stringify(scoreDial) === JSON.stringify(tiles(png, 11, 17, 1, 2)),
    "the high score dial shows the score once the score passes the high score",
  );

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
