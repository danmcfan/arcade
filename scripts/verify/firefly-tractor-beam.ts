// An Owl's tractor beam captures the firefly (#237) in a real browser
// (`bun run verify firefly-tractor-beam`). Plays a seeded paid run of Firefly
// with a bot that waits, then steers under the first Owl that hovers and
// beams. Frames the beam, the capture (no burst, a life gone), the red captive
// rising up the beam, and the captive above its Owl back in the formation.
// A recording steps the same run through the hook. Files go to
// out/verify/firefly-tractor-beam/.

import type { Input } from "../../src/engine/input.ts";
import type { FireflySnapshot } from "../../src/game/snapshot.ts";
import { captiveOffset } from "../../src/firefly/rules.ts";
import { check, gameIn, startFirefly, type Verify, verify } from "../harness.ts";

function firefly(v: Verify): FireflySnapshot | null {
  const g = gameIn(v);
  return g.software === "firefly" && g.sw !== null && "stageTick" in g.sw ? g.sw : null;
}

/** Stay put, or steer under a beaming Owl. */
function botInput(s: FireflySnapshot): Partial<Input> {
  const owl = s.enemies.find((e) => e.state === "beaming" && e.deadFrames === 0);
  if (owl === undefined || s.respawn > 0 || Math.abs(owl.x - s.player.x) <= 2) return {};
  return owl.x > s.player.x ? { right: true } : { left: true };
}

type Moment = "beam" | "captured" | "rising" | "captive";

/** Plays the run tick by tick until the captive is back in the formation; calls `at` once per moment. */
function playToCaptive(v: Verify, at: (m: Moment, s: FireflySnapshot) => void): FireflySnapshot | null {
  const seen = new Set<Moment>();
  const once = (m: Moment, s: FireflySnapshot): void => {
    if (seen.has(m)) return;
    seen.add(m);
    at(m, s);
  };
  let s = firefly(v);
  let beamTick = -1;
  for (let t = 0; t < 20_000 && s !== null && !s.over; t++) {
    v.step(1, botInput(s));
    const next = firefly(v);
    if (next === null) return null;
    if (next.enemies.some((e) => e.state === "beaming")) {
      if (beamTick < 0) beamTick = t;
      if (t - beamTick === 12) once("beam", next);
    }
    if (next.captured === true && s.captured !== true) {
      check(next.lives === s.lives - 1, `the capture costs a life (${s.lives} -> ${next.lives})`);
      once("captured", next);
    }
    if (next.captive !== undefined && seen.has("captured") && t - beamTick === 60) once("rising", next);
    const c = next.captive;
    const owl = c && next.enemies.find((e) => e.row === c.row && e.col === c.col);
    if (owl?.state === "formation") {
      once("captive", next);
      return next;
    }
    s = next;
  }
  return null;
}

function findSeed(v: Verify): number {
  for (let seed = 1; seed <= 20; seed++) {
    startFirefly(v, seed);
    const end = playToCaptive(v, (m, s) => {
      if (m === "beam") {
        v.frame("1-beam", 3);
      } else if (m === "captured") {
        check(
          s.enemies.every((e) => e.deadFrames === 0),
          "nothing bursts on the capture",
          s.enemies.filter((e) => e.deadFrames > 0),
        );
        v.step(4);
        v.frame("2-captured", 3);
      } else if (m === "rising") {
        v.frame("3-captive-rising", 3);
      } else {
        v.frame("4-captive-in-formation", 3);
      }
    });
    if (end !== null) {
      const c = end.captive;
      const owl = c && end.enemies.find((e) => e.row === c.row && e.col === c.col);
      check(
        c !== undefined && owl !== undefined && c.x === owl.x && c.y === owl.y - captiveOffset,
        "the captive sits above its Owl in the formation",
        { c, owl },
      );
      console.log(`seed ${seed}: an Owl beams and captures the firefly`);
      return seed;
    }
  }
  throw new Error("no seed saw a capture");
}

await verify("firefly-tractor-beam", (v) => {
  const seed = findSeed(v);
  // The same run, stepped through the hook a few ticks per video frame.
  v.record(
    "tractor-beam",
    () => {
      v.page.eval(`window.__arcade.seed(${seed}); "ok"`);
      v.tap("space");
      v.tap("space");
      v.step(31, { up: true });
      v.step(40, { right: true });
      v.step(1, { up: true, space: true });
      let s = firefly(v);
      let after = -1;
      for (let t = 0; t < 20_000 && s !== null && after !== 0; t++) {
        const quiet = !s.enemies.some((e) => e.state === "beaming") && s.captive === undefined;
        v.step(quiet ? 8 : 2, botInput(s));
        if (!quiet) v.wait(30);
        s = firefly(v);
        if (after < 0 && s?.captive !== undefined && s.respawn === 0) after = 60;
        if (after > 0) after--;
      }
      v.wait(500);
    },
    { scene: "title" },
  );
  v.assertNoErrors();
});
