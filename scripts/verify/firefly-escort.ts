// Owl escorts and the escort-kill bonus (#234) in a real browser (`bun run verify firefly-escort`).
// Plays seeded paid runs of Firefly with a bot until an Owl dives with two Wasps
// flying either side of it (frame 1-escort), then steers under the escorts
// first and the Owl after: a diving Owl shot after its escorts scores 800 or
// 1600 and shows the points where it was shot (frame 2-bonus). A recording of a
// run goes to out/verify/firefly-escort/.

import type { FireflySnapshot } from "../../src/game/snapshot.ts";
import type { Input } from "../../src/engine/input.ts";
import { check, gameIn as game, startFirefly, type Verify, verify } from "../harness.ts";

type SnapEnemy = FireflySnapshot["enemies"][number];

function firefly(v: Verify): FireflySnapshot | null {
  const g = game(v);
  return g.software === "firefly" && g.sw !== null && "stageTick" in g.sw ? g.sw : null;
}

const alive = (e: SnapEnemy): boolean => e.deadFrames === 0 && e.state !== "waiting";

/** A diving Owl and the Wasps flying level with it, 16 px either side. */
function escorted(s: FireflySnapshot): { owl: SnapEnemy; escorts: SnapEnemy[] } | null {
  for (const owl of s.enemies.filter((e) => alive(e) && e.kind === "owl" && e.state === "diving")) {
    const escorts = s.enemies.filter(
      (e) => alive(e) && e.kind === "wasp" && e.state === "diving" && e.y === owl.y && Math.abs(e.x - owl.x) === 16,
    );
    if (escorts.length > 0) return { owl, escorts };
  }
  return null;
}

/** Steer under `x` and fire. */
function toward(px: number, x: number): Partial<Input> {
  if (Math.abs(x - px) <= 1) return { space: true };
  return x > px ? { space: true, right: true } : { space: true, left: true };
}

/** Escorts first, then their Owl; with no escorted Owl, hold fire under the nearest diving Owl. */
function botInput(s: FireflySnapshot): Partial<Input> {
  const px = s.player.x;
  const group = escorted(s);
  const escort = group?.escorts[0];
  if (escort !== undefined) return toward(px, escort.x);
  const owl = s.enemies.find((e) => alive(e) && e.kind === "owl" && e.state === "diving");
  if (owl !== undefined) return toward(px, owl.x);
  return { ...toward(px, fieldMid), space: false };
}
const fieldMid = 112;

function findBonus(v: Verify): { escortShot: boolean; bonus: number } {
  let escortShot = false;
  for (let seed = 1; seed <= 40; seed++) {
    startFirefly(v, seed);
    let s = firefly(v);
    for (let t = 0; t < 12_000 && s !== null && !s.over; t++) {
      if (!escortShot && escorted(s)?.escorts.length === 2) {
        escortShot = true;
        console.log(`seed ${seed}, tick ${t}: an Owl dives with 2 Wasp escorts`);
        v.frame("1-escort", 3);
      }
      v.step(1, botInput(s));
      const next = firefly(v);
      if (next === null) break;
      const owlShot = s.enemies.find(
        (e) =>
          e.kind === "owl" &&
          e.deadFrames === 0 &&
          e.outOfFormation &&
          next.enemies.some((n) => n.row === e.row && n.col === e.col && n.deadFrames > 0),
      );
      const gain = next.score - s.score;
      if (owlShot !== undefined && next.lives === s.lives && (gain === 800 || gain === 1600)) {
        console.log(`seed ${seed}, tick ${t}: a diving Owl shot after its escorts scores ${gain}`);
        v.frame("2-bonus", 3);
        v.step(20);
        v.frame("3-bonus-later", 3);
        return { escortShot, bonus: gain };
      }
      s = next;
    }
  }
  return { escortShot, bonus: 0 };
}

await verify("firefly-escort", (v) => {
  const { escortShot, bonus } = findBonus(v);
  check(escortShot, "a bot run saw an Owl dive with 2 Wasp escorts");
  check(bonus === 800 || bonus === 1600, "a diving Owl shot after its escorts scored the bonus", bonus);
  v.record(
    "escort-run",
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
        v.wait(15000);
      });
    },
    {},
  );
  v.assertNoErrors();
});
