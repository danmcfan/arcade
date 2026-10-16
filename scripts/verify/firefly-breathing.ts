// Firefly's formation sways while it fills, then breathes (#233) in a real
// browser (`bun run verify firefly-breathing`). It starts a paid run through
// the test hook and steps it, with no input, until every enemy is in its
// slot; checks the formation sways until then, and that once it breathes an
// edge Moth moves out and back while the formation's mean x stays put.
// Frames of the formation at rest and at its widest, and a recording of a
// run left alone through the fill and a few breaths, go to
// out/verify/firefly-breathing/.

import type { FireflySnapshot } from "../../src/game/snapshot.ts";
import { breathePeriod } from "../../src/firefly/rules.ts";
import { check, gameIn as game, isTitleSnapshot, startFirefly, verify, type Verify } from "../harness.ts";

function firefly(v: Verify): FireflySnapshot {
  const g = game(v);
  if (g.software !== "firefly" || g.sw === null || !("stageTick" in g.sw)) throw new Error("Firefly is not running");
  return g.sw;
}

const meanX = (s: FireflySnapshot): number => s.enemies.reduce((t, e) => t + e.x, 0) / s.enemies.length;
const edgeMoth = (s: FireflySnapshot): FireflySnapshot["enemies"][number] | undefined =>
  s.enemies.find((e) => e.row === 4 && e.col === 0);
const edgeX = (s: FireflySnapshot): number => edgeMoth(s)?.x ?? NaN;
const allIn = (s: FireflySnapshot): boolean => s.enemies.every((e) => e.state === "formation");

await verify("firefly-breathing", (v) => {
  startFirefly(v, 3);
  const sways = new Set<number>();
  let s = firefly(v);
  for (let t = 0; t < 2000 && !allIn(s); t++) {
    v.step(1);
    s = firefly(v);
    sways.add(s.sway);
  }
  check(allIn(s), "every enemy reaches the formation");
  check(sways.size > 2, "the formation sways while it fills", [...sways]);
  // Wait for the breath to start.
  for (let t = 0; t < breathePeriod && s.formationPhase !== "breathe"; t++) {
    v.step(1);
    s = firefly(v);
  }
  v.frame("1-formation-at-rest", 3);
  const [edge0, mean0] = [edgeX(s), meanX(s)];
  const edges: number[] = [];
  const means = new Set<number>();
  let widest = 0;
  let ticksMeasured = 0;
  for (let t = 0; t < breathePeriod; t++) {
    v.step(1);
    s = firefly(v);
    if (edgeMoth(s)?.state !== "formation") break;
    ticksMeasured++;
    edges.push(edgeX(s));
    means.add(meanX(s));
    if (t === breathePeriod / 2) v.frame("2-formation-at-widest", 3);
    widest = Math.max(widest, edge0 - edgeX(s));
  }
  console.log(`edge moth x from ${edge0}: ${edges.join(",")}`);
  check(ticksMeasured === breathePeriod, "the edge Moth stays in formation for a full breath", ticksMeasured);
  check(s.formationPhase === "breathe" && s.sway === 0, "the formation stops swaying once it is full", s.sway);
  check(widest >= 8, "the edge Moth moves out at least 8 px at the widest breath", widest);
  check(edges.at(-1) !== undefined && Math.abs((edges.at(-1) ?? 0) - edge0) <= 1, "and back in", edges.at(-1));
  check(means.size === 1 && means.has(mean0), "the formation's mean x stays put", [mean0, ...means]);

  v.record(
    "breathing",
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
      v.wait(22000);
    },
    {},
  );
  v.assertNoErrors();
});
