// Unit tests for the parity harness itself (the differ, trace loading and the
// replay/compare loop), using a fake scene so they run before any port lands.

import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as rng from "../../src/engine/rng.ts";
import type { Input } from "../../src/engine/input.ts";
import type { InputScript } from "../../src/game/script.ts";
import type { Scene } from "../../src/game/software.ts";
import type { SceneSnapshot } from "../../src/game/snapshot.ts";
import { compareTrace, diff, formatMismatch, readTrace, replay, type SceneFactory } from "./harness.ts";

describe("diff", () => {
  test("deeply equal values (any key order) do not diverge", () => {
    expect(diff({ a: 1, b: [1, { c: "x" }], d: null }, { d: null, b: [1, { c: "x" }], a: 1 })).toBeNull();
  });

  test("reports the JSON path and both values of the first difference", () => {
    const expected = { sw: { enemies: [{ x: 1 }, { x: 2, y: 3 }] } };
    const actual = { sw: { enemies: [{ x: 1 }, { x: 2, y: 4 }] } };
    expect(diff(expected, actual)).toEqual({ path: "sw.enemies[1].y", expected: 3, actual: 4 });
  });

  test("floats compare exactly", () => {
    expect(diff({ v: 0.3 }, { v: 0.1 + 0.2 })).toEqual({ path: "v", expected: 0.3, actual: 0.1 + 0.2 });
  });

  test("a key missing from the actual snapshot diverges", () => {
    expect(diff({ a: 1, b: 2 }, { a: 1 })).toEqual({ path: "b", expected: 2, actual: undefined });
  });

  test("an extra key in the actual snapshot diverges", () => {
    expect(diff({ a: 1 }, { a: 1, z: false })).toEqual({ path: "z", expected: undefined, actual: false });
  });

  test("an undefined-valued key counts as absent (JSON.stringify drops it)", () => {
    expect(diff({ a: 1 }, { a: 1, cells: undefined })).toBeNull();
  });

  test("arrays: the first differing element wins, then a length difference", () => {
    expect(diff([1, 2, 3], [1, 9])).toEqual({ path: "[1]", expected: 2, actual: 9 });
    expect(diff({ xs: [1, 2, 3] }, { xs: [1, 2] })).toEqual({ path: "xs.length", expected: 3, actual: 2 });
  });

  test("type mismatches diverge (null vs object, array vs object, number vs string, bool vs number)", () => {
    expect(diff({ sw: null }, { sw: {} })).toEqual({ path: "sw", expected: null, actual: {} });
    expect(diff({ t: [1, 2] }, { t: { 0: 1, 1: 2 } })?.path).toBe("t");
    expect(diff({ n: 1 }, { n: "1" })?.path).toBe("n");
    expect(diff({ b: true }, { b: 1 })?.path).toBe("b");
  });

  test("a difference at the root has an empty path", () => {
    expect(diff(1, 2)).toEqual({ path: "", expected: 1, actual: 2 });
  });
});

describe("formatMismatch", () => {
  test("names the scenario, tick, field path and both values", () => {
    expect(
      formatMismatch("hive-fuzz-1", { tick: 123, path: "sw.enemies[2].x", expected: 104.5, actual: 104.4375 }),
    ).toBe("hive-fuzz-1: first divergence at tick 123, field sw.enemies[2].x: expected 104.5, got 104.4375");
    expect(formatMismatch("w", { tick: 1, path: "", expected: { a: 1 }, actual: undefined })).toBe(
      'w: first divergence at tick 1, field (root): expected {"a":1}, got undefined',
    );
  });
});

describe("readTrace", () => {
  test("gunzips a JSONL trace into one parsed object per line", () => {
    const dir = mkdtempSync(join(tmpdir(), "arcade-harness-"));
    const file = join(dir, "t.jsonl.gz");
    writeFileSync(file, Bun.gzipSync(new TextEncoder().encode('{"tick":1}\n{"tick":2}\n')));
    expect(readTrace(file)).toEqual([{ tick: 1 }, { tick: 2 }]);
  });
});

/** A scene whose snapshot is its tick count, the rng state and the inputs seen. */
class CountingScene implements Scene {
  readonly name = "lumberjack" as const;
  ticks = 0;
  lefts = 0;
  fullCalls: number[] = [];
  readonly seedAtBirth: number;

  constructor(seedAtBirth: number) {
    this.seedAtBirth = seedAtBirth;
  }
  step(i: Input): void {
    this.ticks++;
    if (i.left) this.lefts++;
  }
  draw(): void {
    throw new Error("the harness must never draw");
  }
  layout(): [number, number] {
    return [1, 1];
  }
  snapshot(opts?: { full?: boolean }): SceneSnapshot {
    if (opts?.full) this.fullCalls.push(this.ticks);
    return { tick: this.ticks, rng: this.seedAtBirth, lefts: this.lefts } as unknown as SceneSnapshot;
  }
}

const script: InputScript = {
  name: "fake",
  scene: "lumberjack",
  seed: 77,
  steps: [
    { ticks: 2, input: { left: true } },
    { ticks: 1, input: {} },
  ],
  captureTicks: [],
};

describe("replay", () => {
  test("seeds the rng before building the scene, steps each tick and snapshots after each step (full on the last)", () => {
    let scene: CountingScene | null = null;
    const create: SceneFactory = (name, opts) => {
      expect(name).toBe("lumberjack");
      expect(opts).toEqual({ software: undefined, wave: undefined });
      scene = new CountingScene(rng.state());
      return scene;
    };
    rng.seed(1);
    const snaps = replay(script, create);
    expect(snaps).toEqual([
      { tick: 1, rng: 77, lefts: 1 },
      { tick: 2, rng: 77, lefts: 2 },
      { tick: 3, rng: 77, lefts: 2 },
    ] as unknown as SceneSnapshot[]);
    expect((scene as CountingScene | null)?.fullCalls).toEqual([3]);
  });

  test("passes software and wave options through to the scene factory", () => {
    const seen: unknown[] = [];
    const create: SceneFactory = (name, opts) => {
      seen.push([name, opts]);
      return new CountingScene(0);
    };
    replay({ ...script, scene: "game", software: "hive", steps: [{ ticks: 1, input: {} }] }, create);
    replay({ ...script, scene: "wave", wave: { gridSize: 64, seconds: 5 }, steps: [{ ticks: 1, input: {} }] }, create);
    expect(seen).toEqual([
      ["game", { software: "hive", wave: undefined }],
      ["wave", { software: undefined, wave: { gridSize: 64, seconds: 5 } }],
    ]);
  });
});

describe("compareTrace", () => {
  const create: SceneFactory = () => new CountingScene(rng.state());

  test("null when every tick matches", () => {
    const trace = [
      { tick: 1, rng: 77, lefts: 1 },
      { tick: 2, rng: 77, lefts: 2 },
      { tick: 3, rng: 77, lefts: 2 },
    ];
    expect(compareTrace(script, trace, create)).toBeNull();
  });

  test("reports the first diverging tick (1-based) and field", () => {
    const trace = [
      { tick: 1, rng: 77, lefts: 1 },
      { tick: 2, rng: 77, lefts: 3 },
      { tick: 3, rng: 0, lefts: 2 },
    ];
    expect(compareTrace(script, trace, create)).toEqual({ tick: 2, path: "lefts", expected: 3, actual: 2 });
  });

  test("a trace whose length differs from the script's tick count is a mismatch", () => {
    expect(compareTrace(script, [{ tick: 1, rng: 77, lefts: 1 }], create)).toEqual({
      tick: 0,
      path: "(trace length)",
      expected: 1,
      actual: 3,
    });
  });
});
