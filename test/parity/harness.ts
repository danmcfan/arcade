// Parity harness (§4, §5 1b [A:engine]). Replays a §4.2 input script through
// a scene built by src/game/registry.ts and diffs each tick's §4.3 snapshot
// against the Go-captured trace, failing with the first diverging tick and
// JSON field path. Runs with no DOM: scenes are only stepped, never drawn.
//
// Usage, in test/parity/<name>.test.ts:
//   import { parityTest } from "./harness.ts";
//   parityTest("hive-fuzz-1");

import { test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { relative } from "node:path";
import * as rng from "../../src/engine/rng.ts";
import { createScene, type SceneOptions } from "../../src/game/registry.ts";
import { expandSteps, type InputScript } from "../../src/game/script.ts";
import type { Scene, SceneName } from "../../src/game/software.ts";
import type { SceneSnapshot } from "../../src/game/snapshot.ts";

const repoRoot = new URL("../../", import.meta.url).pathname;
export const fixturesDir = new URL("../fixtures/", import.meta.url).pathname;

export function inputPath(scenario: string): string {
  return `${fixturesDir}inputs/${scenario}.json`;
}

export function tracePath(scenario: string): string {
  return `${fixturesDir}traces/${scenario}.jsonl.gz`;
}

/** How scenes are built; the default is the real registry. */
export type SceneFactory = (name: SceneName, opts: SceneOptions) => Scene;

export interface Divergence {
  /** JSON path like `sw.enemies[2].x`; `""` for the root. */
  path: string;
  expected: unknown;
  actual: unknown;
}

export interface Mismatch extends Divergence {
  /** 1-based tick (trace line k + 1); 0 for a trace-length mismatch. */
  tick: number;
}

export function loadScript(path: string): InputScript {
  return JSON.parse(readFileSync(path, "utf8")) as InputScript;
}

/** Gunzip a `.jsonl.gz` trace and parse one object per non-empty line. */
export function readTrace(path: string): unknown[] {
  const text = new TextDecoder().decode(Bun.gunzipSync(readFileSync(path)));
  const out: unknown[] = [];
  for (const line of text.split("\n")) if (line.trim() !== "") out.push(JSON.parse(line));
  return out;
}

function kind(v: unknown): string {
  if (v === null) return "null";
  if (Array.isArray(v)) return "array";
  return typeof v;
}

function keyPath(base: string, key: string): string {
  return base === "" ? key : `${base}.${key}`;
}

/**
 * Deep-compare two JSON-like values; returns the first difference or null.
 * Numbers, strings and booleans compare exactly (`===`, so `-0` equals `0`).
 * Object keys are visited in `expected`'s order, then keys only `actual`
 * has; a key whose value is `undefined` counts as absent (as in JSON).
 * Arrays report their first differing element, then a length difference
 * at `<path>.length`.
 */
export function diff(expected: unknown, actual: unknown, path = ""): Divergence | null {
  const ke = kind(expected);
  const ka = kind(actual);
  if (ke !== ka) return { path, expected, actual };
  if (ke === "array") {
    const e = expected as unknown[];
    const a = actual as unknown[];
    const n = Math.min(e.length, a.length);
    for (let i = 0; i < n; i++) {
      const d = diff(e[i], a[i], `${path}[${i}]`);
      if (d) return d;
    }
    if (e.length !== a.length) return { path: `${path}.length`, expected: e.length, actual: a.length };
    return null;
  }
  if (ke === "object") {
    const e = expected as Record<string, unknown>;
    const a = actual as Record<string, unknown>;
    for (const key of Object.keys(e)) {
      if (e[key] === undefined && a[key] === undefined) continue;
      const d = diff(e[key], a[key], keyPath(path, key));
      if (d) return d;
    }
    for (const key of Object.keys(a)) {
      if (a[key] === undefined || key in e) continue;
      return { path: keyPath(path, key), expected: undefined, actual: a[key] };
    }
    return null;
  }
  return expected === actual ? null : { path, expected, actual };
}

/**
 * Replay `script` tick by tick: `rng.seed(script.seed)`, build the scene,
 * then for each expanded input `step()` and `snapshot()` (`{ full: true }` on
 * the last tick). `onTick(k, snapshot)` gets the 0-based index k (the
 * snapshot after step k + 1) and may return `false` to stop early.
 */
export function replayEach(
  script: InputScript,
  onTick: (k: number, snapshot: SceneSnapshot) => boolean | void,
  create: SceneFactory = createScene,
): void {
  const inputs = expandSteps(script.steps);
  rng.seed(script.seed);
  const scene = create(script.scene, { software: script.software, wave: script.wave });
  try {
    for (const [k, input] of inputs.entries()) {
      scene.step(input);
      const last = k === inputs.length - 1;
      if (onTick(k, last ? scene.snapshot({ full: true }) : scene.snapshot()) === false) return;
    }
  } finally {
    scene.dispose?.();
  }
}

/** Every tick's snapshot, in order (index k = after step k + 1). */
export function replay(script: InputScript, create: SceneFactory = createScene): SceneSnapshot[] {
  const out: SceneSnapshot[] = [];
  replayEach(script, (_, s) => void out.push(s), create);
  return out;
}

/**
 * Replay `script` and compare against `trace` (line k = snapshot after step
 * k + 1). Returns the first mismatch, or null when every tick matches.
 */
export function compareTrace(
  script: InputScript,
  trace: readonly unknown[],
  create: SceneFactory = createScene,
): Mismatch | null {
  let mismatch: Mismatch | null = null;
  let ticks = 0;
  replayEach(
    script,
    (k, snapshot) => {
      ticks = k + 1;
      if (k >= trace.length) return true;
      const d = diff(trace[k], snapshot);
      if (d) {
        mismatch = { tick: k + 1, ...d };
        return false;
      }
      return true;
    },
    create,
  );
  if (mismatch) return mismatch;
  if (ticks !== trace.length) return { tick: 0, path: "(trace length)", expected: trace.length, actual: ticks };
  return null;
}

function show(v: unknown): string {
  return v === undefined ? "undefined" : JSON.stringify(v);
}

export function formatMismatch(scenario: string, m: Mismatch): string {
  return (
    `${scenario}: first divergence at tick ${m.tick}, field ${m.path === "" ? "(root)" : m.path}: ` +
    `expected ${show(m.expected)}, got ${show(m.actual)}`
  );
}

/** Long scenarios (hive fuzz, wave full collapse) need more than bun's 5 s default. */
const PARITY_TIMEOUT_MS = 120_000;

/**
 * Register a `bun test` test named `scenario` that replays
 * test/fixtures/inputs/<scenario>.json against
 * test/fixtures/traces/<scenario>.jsonl.gz. Skips, with a visible message
 * naming the missing file(s), until the golden fixtures exist.
 */
export function parityTest(scenario: string): void {
  const files = [inputPath(scenario), tracePath(scenario)];
  const missing = files.filter((f) => !existsSync(f)).map((f) => relative(repoRoot, f));
  if (missing.length > 0) {
    const why = `missing ${missing.join(", ")}`;
    console.warn(`[skip] parity ${scenario}: ${why}`);
    test.skip(`${scenario} (skipped: ${why})`, () => {});
    return;
  }
  test(
    scenario,
    () => {
      const [input, trace] = files as [string, string];
      const m = compareTrace(loadScript(input), readTrace(trace));
      if (m) throw new Error(formatMismatch(scenario, m));
    },
    PARITY_TIMEOUT_MS,
  );
}
