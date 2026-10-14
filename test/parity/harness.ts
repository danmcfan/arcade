// Parity harness (§4, §5 1b [A:engine]). Replays a §4.2 input script through
// a scene built by src/game/registry.ts and diffs each tick's §4.3 snapshot
// against the Go-captured trace, failing with the first diverging tick and
// JSON field path. Runs with no DOM: scenes are only stepped, never drawn.
//
// Usage, in test/parity/<name>.test.ts:
//   import { parityTest } from "./harness.ts";
//   parityTest("sweet-sam-fuzz-1");

import { test } from "bun:test";
import { existsSync } from "node:fs";
import { relative } from "node:path";
import * as rng from "../../src/engine/rng.ts";
import { createScene, type SceneOptions } from "../../src/game/registry.ts";
import { expandSteps, type InputScript } from "../../src/game/script.ts";
import type { Scene, SceneName } from "../../src/game/software.ts";
import type { SceneSnapshot } from "../../src/game/snapshot.ts";
import { inputPath, loadScript, readTrace, repoRoot, tracePath } from "./fixtures.ts";

export { fixturesDir, inputPath, loadScript, readTrace, tracePath } from "./fixtures.ts";

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
  if (kind(expected) !== kind(actual)) return { path, expected, actual };
  if (Array.isArray(expected) && Array.isArray(actual)) {
    const e = expected;
    const a = actual;
    const n = Math.min(e.length, a.length);
    for (let i = 0; i < n; i++) {
      const d = diff(e[i], a[i], `${path}[${i}]`);
      if (d) return d;
    }
    if (e.length !== a.length) return { path: `${path}.length`, expected: e.length, actual: a.length };
    return null;
  }
  if (isObject(expected) && isObject(actual)) {
    const e = expected;
    const a = actual;
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

function isObject(v: unknown): v is Record<string, unknown> {
  return kind(v) === "object";
}

/**
 * Replay `script` tick by tick: `rng.seed(script.seed)`, build the scene,
 * then for each expanded input `step()` and `snapshot()`. `onTick(k, snapshot)` gets the 0-based index k (the
 * snapshot after step k + 1) and may return `false` to stop early.
 */
export function replayEach(
  script: InputScript,
  onTick: (k: number, snapshot: SceneSnapshot) => boolean | void,
  create: SceneFactory = createScene,
): void {
  const inputs = expandSteps(script.steps);
  rng.seed(script.seed);
  const scene = create(script.scene, { software: script.software });
  try {
    for (const [k, input] of inputs.entries()) {
      scene.step(input);
      if (onTick(k, scene.snapshot()) === false) return;
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
  const mismatches: Mismatch[] = [];
  let ticks = 0;
  replayEach(
    script,
    (k, snapshot) => {
      ticks = k + 1;
      if (k >= trace.length) return true;
      const d = diff(trace[k], snapshot);
      if (d) {
        mismatches.push({ tick: k + 1, ...d });
        return false;
      }
      return true;
    },
    create,
  );
  const [mismatch] = mismatches;
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

/** Long scenarios (Sweet Sam fuzz) need more than bun's 5 s default. */
const PARITY_TIMEOUT_MS = 120_000;

/**
 * Register a `bun test` test named `scenario` that replays
 * test/fixtures/inputs/<scenario>.json against
 * test/fixtures/traces/<scenario>.jsonl.gz. Skips, with a visible message
 * naming the missing file(s), until the golden fixtures exist.
 */
export function parityTest(scenario: string): void {
  const input = inputPath(scenario);
  const trace = tracePath(scenario);
  const files = [input, trace];
  const missing = files.filter((f) => !existsSync(f)).map((f) => relative(repoRoot, f));
  if (missing.length > 0) {
    const why = `missing ${missing.join(", ")}`;
    process.stderr.write(`[skip] parity ${scenario}: ${why}\n`);
    test.skip(`${scenario} (skipped: ${why})`, () => {});
    return;
  }
  test(
    scenario,
    () => {
      const m = compareTrace(loadScript(input), readTrace(trace));
      if (m) throw new Error(formatMismatch(scenario, m));
    },
    PARITY_TIMEOUT_MS,
  );
}
