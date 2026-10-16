// Firefly keeps getting harder from stage 6 to 10 (#166) in a real browser
// (`bun run verify firefly-late-stage`). No bot clears seven stages, so the
// check serves the real game behind a small page that starts each Firefly run
// on the stage in its URL (`?stage=`); everything else is the game as shipped.
// It plays a paid run on stage 5 (the last stage as it was) and on stage 8 with
// the same seed and a bot
// that only fires and dodges, and checks that on stage 8 the divers fly about
// 15% faster (2.3 px per tick rather than 2) and shots drift up to 1.3 px per
// tick sideways (rather than 1). Frames of a stage 8 dive and a recording of
// stage 8 played with the keyboard go to out/verify/firefly-late-stage/.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { FireflySnapshot, GameSnapshot } from "../../src/game/snapshot.ts";
import type { Input } from "../../src/engine/input.ts";
import { difficulty } from "../../src/firefly/rules.ts";
import { repoRoot } from "../../test/parity/fixtures.ts";
import { isTitleSnapshot, verify, type Verify } from "../harness.ts";

const lateStage = 8;

function check(ok: boolean, what: string, got?: unknown): void {
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

/** The game's page, with each Firefly run starting on the stage `?stage=` names (default 8). */
const pageDir = join(repoRoot, "out/verify/firefly-late-stage/page");
mkdirSync(pageDir, { recursive: true });
writeFileSync(
  join(pageDir, "index.html"),
  `<!doctype html><html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh"><canvas id="screen" style="image-rendering:pixelated"></canvas><script type="module" src="./entry.ts"></script></body></html>`,
);
writeFileSync(
  join(pageDir, "entry.ts"),
  `import { FireflySoftware } from "../../../../src/firefly/game.ts";
import { difficulty } from "../../../../src/firefly/rules.ts";
const start = Number(new URLSearchParams(location.search).get("stage") ?? ${lateStage});
const update = FireflySoftware.prototype.update;
FireflySoftware.prototype.update = function (i) {
  if (this.ticks === 0 && this.stage === 1) {
    this.stage = start;
    this.diveTimer = difficulty(start).diveInterval;
  }
  update.call(this, i);
};
await import("../../../../src/main.ts");
`,
);

function game(v: Verify): GameSnapshot {
  const g = v.snapshot(isTitleSnapshot).game;
  if (g === null) throw new Error("no game running");
  return g;
}

function firefly(v: Verify): FireflySnapshot | null {
  const g = game(v);
  return g.software === "firefly" && g.sw !== null && "stageTick" in g.sw ? g.sw : null;
}

/** Fire, and step away from a shot or diver coming down close by. */
function botInput(s: FireflySnapshot): Partial<Input> {
  const px = s.player.x;
  const threat = [
    ...s.shots.filter((x) => x.y > s.player.y - 60),
    ...s.enemies.filter((e) => e.state === "diving" && e.deadFrames === 0 && e.y > s.player.y - 70),
  ].find((x) => Math.abs(x.x - px) < 14);
  if (threat === undefined) return { space: true };
  return threat.x > px ? { space: true, left: true } : { space: true, right: true };
}

interface Seen {
  stage: number;
  /** Mean px a diving enemy moves per tick. */
  diveSpeed: number;
  /** The largest sideways drift of any shot. */
  maxDrift: number;
}

/** A paid run from the hub starting on `stage`, played by the bot for `ticks`. */
function play(v: Verify, stage: number, ticks: number, frames: boolean): Seen {
  v.openHook(`stage=${stage}`);
  v.page.eval("localStorage.clear()");
  v.openHook(`stage=${stage}`);
  v.dismissNotice();
  v.page.eval(`window.__arcade.seed(4); "ok"`);
  v.tap("space"); // New game -> intro
  v.tap("space"); // intro -> hub
  v.step(31, { up: true });
  v.step(40, { right: true });
  v.step(1, { up: true, space: true });
  let s = firefly(v);
  if (s === null) throw new Error("Space at the Firefly cabinet did not start Firefly");
  v.step(1, botInput(s));
  s = firefly(v);
  if (s === null) throw new Error("Firefly ended on its first tick");
  const startStage = s.stage;
  let moved = 0;
  let steps = 0;
  let maxDrift = 0;
  let framed = false;
  for (let t = 0; t < ticks && s !== null && !s.over; t++) {
    v.step(1, botInput(s));
    const next = firefly(v);
    if (next === null) break;
    for (const e of next.enemies) {
      const before = s.enemies.find((b) => b.row === e.row && b.col === e.col);
      // Skip the tick a diver wraps from the bottom back to the top.
      if (before?.state !== "diving" || e.state !== "diving" || e.deadFrames > 0) continue;
      moved += Math.hypot(e.x - before.x, e.y - before.y);
      steps++;
    }
    for (const shot of next.shots) maxDrift = Math.max(maxDrift, Math.abs(shot.dx));
    if (frames && !framed && next.shots.length >= 3) {
      v.frame("1-stage-8-dive", 3);
      v.step(12, botInput(next));
      v.frame("2-stage-8-dive-later", 3);
      framed = true;
    }
    s = firefly(v);
  }
  return { stage: startStage, diveSpeed: steps === 0 ? 0 : moved / steps, maxDrift };
}

await verify(
  "firefly-late-stage",
  (v) => {
    const early = play(v, 5, 4000, false);
    const late = play(v, lateStage, 4000, true);
    console.log(`stage 5: ${JSON.stringify(early)}`);
    console.log(`stage ${lateStage}: ${JSON.stringify(late)}`);
    check(early.stage === 5 && late.stage === lateStage, `the runs start on stage 5 and stage ${lateStage}`, [
      early.stage,
      late.stage,
    ]);
    const want = difficulty(lateStage);
    const ratio = late.diveSpeed / early.diveSpeed;
    check(
      Math.abs(ratio - want.diveSpeed / difficulty(5).diveSpeed) < 0.05,
      `divers on stage ${lateStage} fly ${want.diveSpeed} px/tick against 2 on stage 5 (measured ratio ${ratio.toFixed(3)})`,
    );
    check(early.maxDrift <= difficulty(5).shotDrift + 1e-9, `stage 5 shots drift at most 1 px/tick`, early.maxDrift);
    check(
      late.maxDrift > difficulty(5).shotDrift && late.maxDrift <= want.shotDrift + 1e-9,
      `stage ${lateStage} shots drift more than 1 and at most ${want.shotDrift} px/tick`,
      late.maxDrift,
    );

    v.record(
      "stage-8",
      () => {
        // Space through the title and the intro until the hub is up.
        for (let n = 0; n < 30 && v.snapshot(isTitleSnapshot).game === null; n++) {
          v.key("Space");
          v.wait(400);
        }
        // Right until under the Firefly cabinet, then up until Space there starts it.
        const hubX = (): number => game(v).arcade.player.x;
        for (let n = 0; n < 40 && hubX() < 118; n++) v.key("ArrowRight", 60);
        for (let n = 0; n < 40 && game(v).software === null; n++) {
          v.key("ArrowUp", 80);
          v.key("Space");
        }
        check(firefly(v)?.stage === lateStage, `the recording plays stage ${lateStage}`, firefly(v)?.stage);
        v.hold("Space", () => {
          v.wait(4000);
          v.key("ArrowLeft", 800);
          v.wait(3000);
          v.key("ArrowRight", 1200);
          v.wait(6000);
        });
      },
      {},
    );
    v.assertNoErrors();
  },
  { server: (port) => ["bun", `--port=${port}`, join(pageDir, "index.html")] },
);
