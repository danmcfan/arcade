// From stage 4 a diving Moth can split into a trio of morphs (#236), in a
// real browser (`bun run verify firefly-morph`). The check starts a paid
// Firefly run, jumps it to stage 4 with the test hook and plays it with a bot
// that only dodges until a trio dives, then frames the three morphs and aims
// sparks at them. It checks the trio is three morphs diving side by side and,
// when all three fall, that the score jumps by their points plus the 1000
// bonus. A recording of stage 4 played with the keyboard goes to
// out/verify/firefly-morph/ too.

import type { FireflySnapshot } from "../../src/game/snapshot.ts";
import type { Input } from "../../src/engine/input.ts";
import { morphBonus, morphFromStage, points } from "../../src/firefly/rules.ts";
import { check, gameIn as game, isTitleSnapshot, startFirefly, verify, type Verify } from "../harness.ts";

function firefly(v: Verify): FireflySnapshot | null {
  const g = game(v);
  return g.software === "firefly" && g.sw !== null && "stageTick" in g.sw ? g.sw : null;
}

/** The Firefly snapshot, which must still be running. */
function running(v: Verify): FireflySnapshot {
  const s = firefly(v);
  if (s === null) throw new Error("Firefly ended");
  return s;
}

const liveMorphs = (s: FireflySnapshot): FireflySnapshot["enemies"] =>
  s.enemies.filter((e) => e.kind === "morph" && e.deadFrames === 0 && e.hp > 0);

/** Step away from a shot or diver close above; when `target` is set, steer under it and fire. */
function botInput(s: FireflySnapshot, target: number | null): Partial<Input> {
  const px = s.player.x;
  const threat = [
    ...s.shots.filter((x) => x.y > s.player.y - 50),
    ...s.enemies.filter((e) => e.state === "diving" && e.deadFrames === 0 && e.y > s.player.y - 40),
  ].find((x) => Math.abs(x.x - px) < 14);
  if (threat !== undefined) return threat.x > px ? { left: true } : { right: true };
  if (target === null) return {};
  if (Math.abs(target - px) < 3) return { space: true };
  return target > px ? { right: true, space: true } : { left: true, space: true };
}

await verify("firefly-morph", (v) => {
  let trio: FireflySnapshot["enemies"] = [];
  let s: FireflySnapshot | null = null;
  for (let seed = 1; seed <= 10 && trio.length === 0; seed++) {
    startFirefly(v, seed);
    v.jump(morphFromStage);
    s = firefly(v);
    for (let t = 0; t < 6000 && s !== null && !s.over && trio.length === 0; t++) {
      v.step(1, botInput(s, null));
      s = firefly(v);
      if (s !== null) trio = liveMorphs(s);
    }
  }
  if (s === null) throw new Error("Firefly ended");
  check(s.stage === morphFromStage, `the run plays stage ${morphFromStage}`, s.stage);
  check(trio.length === 3 && trio.every((e) => e.state === "diving"), "a Moth split into 3 diving morphs", trio);
  const xs = trio.map((e) => e.x).toSorted((a, b) => a - b);
  const gaps = xs.slice(1).map((x, i) => x - (xs[i] ?? 0));
  check(
    gaps.every((g) => g === 16),
    "the trio dives side by side, 16 px apart",
    xs,
  );
  v.step(10, botInput(s, null));
  v.frame("1-morph-trio", 3);
  v.step(20, botInput(running(v), null));
  v.frame("2-morph-trio-diving", 3);

  // Chase the trio with sparks until all three are down or gone.
  const before = running(v).score;
  for (let t = 0; t < 600; t++) {
    const now = firefly(v);
    if (now === null || now.over) break;
    const left = liveMorphs(now);
    if (left.length === 0) break;
    const target = left.toSorted((a, b) => b.y - a.y)[0];
    v.step(1, botInput(now, target !== undefined && target.y < now.player.y - 20 ? target.x : null));
  }
  const after = running(v);
  const shot = after.enemies.filter((e) => e.kind === "morph" && e.deadFrames > 0).length;
  console.log(`score ${before} -> ${after.score}, morphs in their hit effect: ${shot}`);
  if (shot === 3) {
    check(after.score - before >= 3 * points("morph", true) + morphBonus, "all three shot pays the 1000 bonus");
    v.frame("3-trio-shot", 3);
  } else {
    console.log(`  (the bot shot ${shot} of 3, so no bonus to check here; game.test.ts covers it)`);
  }

  v.record(
    "stage-4",
    () => {
      for (let n = 0; n < 30 && v.snapshot(isTitleSnapshot).game === null; n++) {
        v.key("Space");
        v.wait(400);
      }
      const hubX = (): number => game(v).arcade.player.x;
      for (let n = 0; n < 40 && hubX() < 118; n++) v.key("ArrowRight", 60);
      for (let n = 0; n < 40 && game(v).software === null; n++) {
        v.key("ArrowUp", 80);
        v.key("Space");
      }
      v.jump(morphFromStage);
      check(firefly(v)?.stage === morphFromStage, `the recording plays stage ${morphFromStage}`, firefly(v)?.stage);
      v.hold("Space", () => {
        v.wait(5000);
        v.key("ArrowLeft", 600);
        v.wait(4000);
        v.key("ArrowRight", 1000);
        v.wait(6000);
      });
    },
    {},
  );
  v.assertNoErrors();
});
