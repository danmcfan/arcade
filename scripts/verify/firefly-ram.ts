// A rammed enemy scores nothing (#162) in a real browser (`bun run verify firefly-ram`).
// Plays seeded paid runs of Firefly with a bot that fires and steers under the
// nearest enemy (often into a diver) until an enemy rams the firefly: on that
// tick the firefly loses a life, the enemy bursts, and the score stays the
// same. Frames before and after the ram, and a recording of a run, go to
// out/verify/firefly-ram/.

import type { FireflySnapshot } from "../../src/game/snapshot.ts";
import type { Input } from "../../src/engine/input.ts";
import { points } from "../../src/firefly/rules.ts";
import { check, gameIn as game, startFirefly, type Verify, verify } from "../harness.ts";

function firefly(v: Verify): FireflySnapshot | null {
  const g = game(v);
  return g.software === "firefly" && g.sw !== null && "stageTick" in g.sw ? g.sw : null;
}

/** Fire and steer under the nearest enemy in play, divers included. */
function botInput(s: FireflySnapshot): Partial<Input> {
  const px = s.player.x;
  const targets = s.enemies.filter((e) => e.deadFrames === 0 && e.state !== "waiting");
  const target = targets.toSorted((a, b) => Math.abs(a.x - px) - Math.abs(b.x - px))[0];
  if (target === undefined || Math.abs(target.x - px) <= 2) return { space: true };
  return target.x > px ? { space: true, right: true } : { space: true, left: true };
}

type SnapEnemy = FireflySnapshot["enemies"][number];

/** Enemies alive before this tick and bursting after it. */
function newlyDead(before: FireflySnapshot, after: FireflySnapshot): SnapEnemy[] {
  return before.enemies.filter(
    (e) =>
      e.deadFrames === 0 &&
      e.state !== "waiting" &&
      after.enemies.some((a) => a.row === e.row && a.col === e.col && a.deadFrames > 0),
  );
}

/** The enemy that rammed the firefly this tick: a life lost, and it burst beside the firefly. */
function rammer(before: FireflySnapshot, after: FireflySnapshot): SnapEnemy | undefined {
  if (after.lives !== before.lives - 1) return undefined;
  return newlyDead(before, after).find(
    (e) => Math.abs(e.x - before.player.x) < 30 && Math.abs(e.y - before.player.y) < 30,
  );
}

function findRam(v: Verify): boolean {
  for (let seed = 1; seed <= 20; seed++) {
    startFirefly(v, seed);
    let s = firefly(v);
    for (let t = 0; t < 20_000 && s !== null && !s.over; t++) {
      v.step(1, botInput(s));
      const next = firefly(v);
      if (next === null) break;
      const ram = rammer(s, next);
      if (ram !== undefined) {
        // Sparks may kill other enemies on the same tick: only they may score.
        const shot = newlyDead(s, next).filter((e) => e !== ram);
        const expected = shot.reduce((sum, e) => sum + points(e.kind, e.outOfFormation), 0);
        console.log(`seed ${seed}, tick ${t}: a ${ram.kind} rams the firefly; ${shot.length} other kills`);
        check(
          next.score - s.score === expected,
          `the ram scores nothing (score ${s.score} -> ${next.score}, shot kills worth ${expected})`,
          next.score,
        );
        check(next.lives === s.lives - 1, `the ram costs a life (${s.lives} -> ${next.lives})`);
        v.frame("1-ram-burst", 3);
        v.step(10);
        v.frame("2-after-ram", 3);
        return true;
      }
      s = next;
    }
  }
  return false;
}

await verify("firefly-ram", (v) => {
  check(findRam(v), "a bot run saw an enemy ram the firefly");
  v.record(
    "ram-run",
    () => {
      v.wait(600);
      v.key("Space");
      v.wait(400);
      v.key("Space");
      v.wait(400);
      v.key("ArrowUp", 520);
      v.key("ArrowRight", 670);
      v.key("ArrowUp", 100);
      v.hold("Space", () => {
        v.wait(9000);
      });
    },
    {},
  );
  v.assertNoErrors();
});
