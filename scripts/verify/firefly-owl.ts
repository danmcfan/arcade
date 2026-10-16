// The 16×16 Owl (#202) in a real browser (`bun run verify firefly-owl`).
// Starts a seeded paid run of Firefly through the `?debug` test hook, waits
// for the full formation and checks the Owl row sits 16 px apart and 16 px
// above the Wasps, like every other row. Then it fires from under the Owls
// until one is hurt, and waits for an Owl to dive. Frames of the formation,
// the hurt Owl and the dive, and a recording of a run, go to
// out/verify/firefly-owl/.

import type { FireflySnapshot, GameSnapshot } from "../../src/game/snapshot.ts";
import { isTitleSnapshot, verify, type Verify } from "../harness.ts";

function check(ok: boolean, what: string, got?: unknown): void {
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

function game(v: Verify): GameSnapshot {
  const g = v.snapshot(isTitleSnapshot).game;
  if (g === null) throw new Error("no game running");
  return g;
}

function firefly(v: Verify): FireflySnapshot {
  const g = game(v);
  if (g.software !== "firefly" || g.sw === null || !("stageTick" in g.sw)) throw new Error("not in Firefly");
  return g.sw;
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

/** Steps until `done`, at most `limit` ticks; the last snapshot. */
function stepUntil(v: Verify, limit: number, done: (s: FireflySnapshot) => boolean): FireflySnapshot {
  let s = firefly(v);
  for (let t = 0; t < limit && !done(s); t++) {
    v.step(1);
    s = firefly(v);
  }
  return s;
}

/** An Owl is diving at the firefly. */
function owlDiving(s: FireflySnapshot): boolean {
  return s.enemies.some((e) => e.kind === "owl" && e.state === "diving");
}

await verify("firefly-owl", (v) => {
  startFirefly(v, 1);
  const full = stepUntil(v, 3000, (s) => s.enemies.length > 0 && s.enemies.every((e) => e.state === "formation"));
  check(
    full.enemies.every((e) => e.state === "formation"),
    "the formation fills",
    full.enemies.map((e) => e.state),
  );
  const rowY = (r: number): number => full.enemies.find((e) => e.row === r)?.y ?? NaN;
  const owlXs = full.enemies.filter((e) => e.kind === "owl").map((e) => e.x);
  check(
    owlXs.slice(1).every((x, i) => x - (owlXs[i] ?? 0) === 16),
    "the Owls are 16 px apart, like the Wasps and Moths",
    owlXs,
  );
  check(rowY(1) - rowY(0) === 16, "the Owl row is 16 px above the Wasps", [rowY(0), rowY(1)]);
  v.dismissNotice();
  v.frame("1-formation", 3);

  // Fire from under the leftmost Owl until it is hurt.
  const target = full.enemies.find((e) => e.kind === "owl");
  if (target === undefined) throw new Error("no Owl");
  let s = full;
  for (let t = 0; t < 2000 && !s.enemies.some((e) => e.kind === "owl" && e.hp === 1 && e.deadFrames === 0); t++) {
    const owl = s.enemies.find((e) => e.row === target.row && e.col === target.col);
    const x = owl?.x ?? target.x;
    const dx = x - s.player.x;
    v.step(1, Math.abs(dx) <= 2 ? { space: t % 2 === 0 } : dx > 0 ? { right: true } : { left: true });
    s = firefly(v);
  }
  check(
    s.enemies.some((e) => e.kind === "owl" && e.hp === 1 && e.deadFrames === 0),
    "an Owl's first spark leaves it hurt (blue)",
  );
  v.dismissNotice();
  v.frame("2-owl-hurt", 3);

  // A fresh run per seed until an Owl dives before the firefly is lost.
  let dived = false;
  for (let seed = 1; seed <= 20 && !dived; seed++) {
    startFirefly(v, seed);
    dived = owlDiving(stepUntil(v, 6000, (x) => x.over || owlDiving(x)));
  }
  check(dived, "an Owl dives");
  v.step(30);
  v.dismissNotice();
  v.frame("3-owl-dive", 3);

  v.record(
    "owl-run",
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
