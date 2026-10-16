// Firefly's enemies fly in as Galaga's 5 waves of 8, in pairs (#231), in a
// real browser (`bun run verify firefly-entry-waves`). Starts a paid run,
// leaves the firefly idle, and frames the field during wave 1 (Wasps and
// Moths in two mirrored streams from the top centre) and wave 2 (the Owls
// with their Wasps, low from the left). Checks that no Owl is in the air in
// wave 1, that the Owls come in from the left edge, and that every enemy
// flying in has a partner that set off with it. Frames and a recording of
// the whole entry go to out/verify/firefly-entry-waves/.

import type { FireflySnapshot } from "../../src/game/snapshot.ts";
import { entryGroupGap, stageIntroTicks } from "../../src/firefly/rules.ts";
import { check, gameIn as game, isTitleSnapshot, startFirefly, verify, type Verify } from "../harness.ts";

function firefly(v: Verify): FireflySnapshot {
  const g = game(v);
  if (g.software !== "firefly" || g.sw === null || !("stageTick" in g.sw)) throw new Error("not in Firefly");
  return g.sw;
}

const entering = (s: FireflySnapshot): FireflySnapshot["enemies"] => s.enemies.filter((e) => e.state === "entering");

await verify("firefly-entry-waves", (v) => {
  startFirefly(v, 1);
  const start = firefly(v).stageTick;

  // Wave 1, its last pair just off.
  v.step(stageIntroTicks + 50 - start);
  let s = firefly(v);
  const wave1 = entering(s);
  console.log(`wave 1 in the air: ${wave1.map((e) => `${e.kind}@${Math.round(e.x)},${Math.round(e.y)}`).join(" ")}`);
  check(wave1.length === 8, "8 enemies fly in in wave 1", wave1.length);
  check(
    wave1.filter((e) => e.kind === "moth").length === 4 && wave1.filter((e) => e.kind === "wasp").length === 4,
    "wave 1 is 4 Moths and 4 Wasps",
    wave1.map((e) => e.kind),
  );
  check(
    wave1
      .filter((e) => e.kind === "wasp")
      .every((w) => wave1.some((m) => m.kind === "moth" && (m.x - 112) * (w.x - 112) < 0 && Math.abs(m.y - w.y) < 12)),
    "wave 1 flies in pairs, a Wasp and a Moth either side of the centre",
  );
  v.frame("1-wave-1", 3);

  // Wave 2 just setting off, then halfway in.
  v.step(entryGroupGap - 30);
  s = firefly(v);
  const owls = entering(s).filter((e) => e.kind === "owl");
  console.log(`owls: ${owls.map((e) => `${Math.round(e.x)},${Math.round(e.y)}`).join(" ")}`);
  check(owls.length > 0 && owls.every((e) => e.x < 60 && e.y > 180), "the Owls come in low from the left", owls);
  v.frame("2-wave-2-owls-enter", 3);
  v.step(30);
  v.frame("3-wave-2-climbing", 3);

  v.record(
    "entry",
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
      v.wait(12_000);
    },
    {},
  );
  v.assertNoErrors();
});
