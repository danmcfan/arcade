// Sweet Sam self-check: drive Sweet Sam's `create` (src/game/minigames.ts) directly (no hub) with scripted
// inputs, pin where the TypeScript run ends and check invariants along it.
//
// It once compared against a trimmed Go reference (seed 8, "greedy", 6000 ticks); since #157 the bear
// pre-turns as in Pac-Man and leaves Go's path within its first turns, so that reference was retired.
// The golden fixtures (test/parity/sweet-sam.test.ts) cover the full traces.

import { describe, expect, test } from "bun:test";
import * as rng from "../engine/rng.ts";
import { addSoundListener, type SoundEvent } from "../engine/audio.ts";
import type { Input } from "../engine/input.ts";
import type { SweetSamSnapshot } from "../game/snapshot.ts";
import { minigame } from "../game/minigames.ts";
import { SweetSamSoftware } from "./software.ts";

interface Tick {
  tick: number;
  rng: number;
  sounds: SoundEvent[];
  sw: SweetSamSnapshot;
}

/** Input generator with its own xorshift PRNG (independent of the game rng). */
function makeGenerator(seed: number): (s: SweetSamSoftware) => Input {
  let g = (seed * 2654435761) >>> 0 || 1;
  const rnd = (): number => {
    g ^= g << 13;
    g >>>= 0;
    g ^= g >>> 17;
    g ^= g << 5;
    g >>>= 0;
    return g / 4294967296;
  };
  let hold = 0;
  let cur = [0, 0, 0, 0];
  return (s) => {
    if (hold <= 0) {
      hold = 10 + Math.floor(rnd() * 51);
      const k = Math.floor(rnd() * 6);
      cur = [k === 0 ? 1 : 0, k === 1 ? 1 : 0, k === 2 ? 1 : 0, k === 3 ? 1 : 0];
      if (k === 4) cur = [rnd() < 0.5 ? 1 : 0, rnd() < 0.5 ? 1 : 0, rnd() < 0.5 ? 1 : 0, rnd() < 0.5 ? 1 : 0];
    }
    // "greedy": steer towards the nearest remaining item most of the time.
    const p = s.player;
    let best: { x: number; y: number } | null = null;
    let bd = Infinity;
    for (const it of s.items) {
      if (!it) continue;
      const d = Math.abs(it.x - p.x) + Math.abs(it.y - p.y);
      if (d < bd) {
        bd = d;
        best = it;
      }
    }
    if (best && rnd() < 0.8) {
      const dx = best.x - p.x;
      const dy = best.y - p.y;
      const horiz = Math.abs(dx) >= Math.abs(dy) ? rnd() < 0.7 : rnd() < 0.3;
      cur = horiz ? [0, 0, dx < 0 ? 1 : 0, dx >= 0 ? 1 : 0] : [dy < 0 ? 1 : 0, dy >= 0 ? 1 : 0, 0, 0];
    }
    hold--;
    return {
      up: cur[0] === 1,
      down: cur[1] === 1,
      left: cur[2] === 1,
      right: cur[3] === 1,
      space: false,
      escape: false,
      shiftP: false,
    };
  };
}

/** Shallow shape check for a JSON round-tripped trace entry. */
function isTick(v: unknown): v is Tick {
  if (typeof v !== "object" || v === null) return false;
  if (!("tick" in v) || !("rng" in v) || !("sounds" in v) || !("sw" in v)) return false;
  return typeof v.tick === "number" && typeof v.rng === "number" && Array.isArray(v.sounds) && typeof v.sw === "object";
}

/** JSON round trip: what the parity harness compares. */
function roundTrip(t: Tick): Tick {
  const back: unknown = JSON.parse(JSON.stringify(t));
  if (!isTick(back)) throw new Error(`tick ${t.tick} did not survive a JSON round trip`);
  return back;
}

function run(seed: number, ticks: number): Tick[] {
  const sounds: SoundEvent[] = [];
  const off = addSoundListener((e) => {
    sounds.push(e);
  });
  try {
    rng.seed(seed);
    const s = minigame("sweetSam").create({ highScore: seed * 100, prizes: [] });
    if (!(s instanceof SweetSamSoftware)) throw new Error("Sweet Sam's create must build a SweetSamSoftware");
    const next = makeGenerator(seed);
    const out: Tick[] = [];
    for (let t = 1; t <= ticks; t++) {
      s.update(next(s));
      out.push(roundTrip({ tick: t, rng: rng.state(), sounds: sounds.splice(0), sw: s.snapshot() }));
    }
    return out;
  } finally {
    off();
  }
}

const trace = run(8, 6000);

describe("Sweet Sam end state of the seed 8 run (TypeScript regression lock)", () => {
  // This pins what the TypeScript run reaches (re-pinned for #157's cornering, #158's no-up junctions, #159's up overflow and #151's sleepy home bees).
  test("rng, score and items hash at tick 6000", () => {
    const last = trace.at(-1);
    expect({
      rng: last?.rng,
      score: last?.sw.score,
      itemsHash: last?.sw.itemsHash,
    }).toEqual<unknown>({ rng: 3858286022, score: 1670, itemsHash: 1329482067 });
  });
});

describe("Sweet Sam invariants over a scripted run", () => {
  test("snapshot has exactly the §4.3 Sweet Sam keys", () => {
    const sw = trace[0]?.sw;
    expect(Object.keys(sw ?? {}).toSorted()).toEqual(
      [
        "state",
        "player",
        "enemies",
        "items",
        "itemsHash",
        "score",
        "lives",
        "highScore",
        "modeIndex",
        "mode",
        "modeTicks",
        "pauseTicks",
        "startTicks",
        "respawnBlinkRemaining",
        "scaredEatAwardNext",
        "popups",
        "shake",
        "particlesActive",
        "pelletAnimTick",
        "dials",
        "level",
        "levelBannerTicks",
        "mazeFlash",
        "flower",
        "flowerPopup",
        "deathFrame",
        "release",
      ].toSorted(),
    );
    expect(Object.keys(sw?.player ?? {}).toSorted()).toEqual([
      "cornering",
      "dir",
      "frame",
      "hidden",
      "turn",
      "velocity",
      "x",
      "y",
    ]);
    expect(Object.keys(sw?.enemies[0] ?? {}).toSorted()).toEqual(
      [
        "kind",
        "x",
        "y",
        "dir",
        "frame",
        "velocity",
        "blue",
        "flashFrames",
        "flash",
        "held",
        "eyes",
        "home",
        "dotMin",
        "reverse",
        "reverseTile",
      ].toSorted(),
    );
    expect(sw?.dials.length).toBe(12);
  });

  test("score never decreases, items never increase within a round, lives only drop", () => {
    for (let k = 1; k < trace.length; k++) {
      const a = trace[k - 1]?.sw;
      const b = trace[k]?.sw;
      if (!a || !b) throw new Error("trace");
      expect(b.score).toBeGreaterThanOrEqual(a.score);
      expect(b.lives).toBeLessThanOrEqual(a.lives);
      if (b.items > a.items) expect(b.items).toBe(244);
      expect(a.items - b.items).toBeLessThanOrEqual(1);
      expect(b.pelletAnimTick).toBe(a.pelletAnimTick + 1);
      expect(b.particlesActive).toBeLessThanOrEqual(300);
    }
  });

  test("replaying the same seed reproduces the trace", () => {
    expect(run(8, 900)).toEqual(trace.slice(0, 900));
  });
});
