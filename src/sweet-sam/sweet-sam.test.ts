// Sweet Sam self-check: drive `createSweetSam` directly (no hub) with scripted
// inputs and compare against values captured from the Go original.
//
// test/fixtures/sweet-sam.goReference.json (provenance in test/fixtures/README.md)
// was produced during T5 by a throwaway Go harness: a
// copy of the Go Sweet Sam package with `math/rand` swapped for the same mulberry32 as
// src/engine/rng.ts (same call positions), a Snapshot() emitting the §4.3
// keys, built with CGO_ENABLED=1 GOARCH=amd64 and fed the exact input stream
// the generator below produces (seed 8, "greedy", 6000 ticks). The full
// per-tick traces matched bit for bit; this file keeps state transitions, a
// few complete snapshots and the end state as a regression lock until the
// real golden fixtures (test/parity/sweet-sam.test.ts) take over.

import { describe, expect, test } from "bun:test";
import * as rng from "../engine/rng.ts";
import { addSoundListener, type SoundEvent } from "../engine/audio.ts";
import type { Input } from "../engine/input.ts";
import type { SweetSamSnapshot } from "../game/snapshot.ts";
import { createSweetSam } from "./index.ts";
import { SweetSamSoftware } from "./software.ts";
import reference from "../../test/fixtures/sweet-sam.goReference.json";

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
    const s = createSweetSam(seed * 100);
    if (!(s instanceof SweetSamSoftware)) throw new Error("createSweetSam must build a SweetSamSoftware");
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

/** Snapshot keys added after the Go capture (#47: levels, the bonus flower, the death animation). */
const keysSinceGo = ["level", "levelBannerTicks", "mazeFlash", "flower", "flowerPopup", "deathFrame"] as const;

/** Go snapshot keys dropped since (#113: the cabinet outline has no joystick). */
const keysDroppedSinceGo = ["joystick"] as const;

/** A Go reference snapshot without the keys dropped since. */
function withoutDropped(want: object): Record<string, unknown> {
  const out: Record<string, unknown> = { ...want };
  const sw: unknown = out["sw"];
  if (typeof sw === "object" && sw !== null) {
    const kept: Record<string, unknown> = { ...sw };
    for (const k of keysDroppedSinceGo) delete kept[k];
    out["sw"] = kept;
  }
  return out;
}

/** Sounds by their Go names; the ones Go never had (#47) are dropped. */
const goSoundNames: Partial<Record<string, string>> = { sweetStart: "start", sweetBee: "power", sweetDeath: "death" };

/** A tick as the Go reference recorded it: without the keys and sounds added since (ADR 0004). */
function goView(t: Tick | undefined): unknown {
  if (t === undefined) return undefined;
  const sw: Record<string, unknown> = { ...t.sw };
  for (const k of keysSinceGo) delete sw[k];
  const sounds = t.sounds.flatMap((e) => {
    const [action, name] = e.split(":");
    const goName = goSoundNames[name ?? ""];
    return goName === undefined ? [] : [`${action}:${goName}`];
  });
  return { tick: t.tick, rng: t.rng, sounds, sw };
}

describe("Sweet Sam self-check against the Go reference (seed 8, 6000 ticks)", () => {
  test("state transitions happen on the same ticks with the same rng state", () => {
    const trans: [number, string, number][] = [];
    let prev = "";
    for (const t of trace) {
      if (t.sw.state !== prev) {
        trans.push([t.tick, t.sw.state, t.rng]);
        prev = t.sw.state;
      }
    }
    expect(trans).toEqual<unknown>(reference.trans);
  });

  test("full snapshots match at the first death, the bee-eaten pause and game over", () => {
    for (const [tick, want] of Object.entries(reference.snaps)) {
      expect(goView(trace[Number(tick) - 1])).toEqual<unknown>({
        tick: Number(tick),
        ...withoutDropped(want),
      });
    }
  });

  test("end state matches", () => {
    const last = trace.at(-1);
    expect({ rng: last?.rng, score: last?.sw.score, items: last?.sw.items, itemsHash: last?.sw.itemsHash }).toEqual(
      reference.final,
    );
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
        ...keysSinceGo,
      ].toSorted(),
    );
    expect(Object.keys(sw?.player ?? {}).toSorted()).toEqual(["dir", "frame", "hidden", "velocity", "x", "y"]);
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
