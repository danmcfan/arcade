// Capture TS frames for the golden scenarios through the `?debug` test hook
// (§3.5), driving a browser with agent-browser. It starts its own dev server
// (scripts/harness.ts):
//
//   bun run frames [scenario ...]
//
// For each test/fixtures/inputs/<scenario>.json (all of them by default) it
// seeds, loads the scene, runs the script up to each `captureTicks` entry
// and writes out/frames/<scenario>/<tick>.png at logical resolution. Compare
// against test/fixtures/frames/ with `bun run frames:report` (all frames,
// writes out/frame-report.md) or scripts/frame-diff.ts (one frame).

import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import type { Input } from "../src/engine/input.ts";
import { expandSteps, type InputScript, type InputStep } from "../src/game/script.ts";
import { fixturesDir, inputPath, loadScript, repoRoot } from "../test/parity/fixtures.ts";
import { browser, decodeDataUrl } from "./browser.ts";
import { startServer } from "./harness.ts";

export { decodeDataUrl } from "./browser.ts";

const inputsDir = join(fixturesDir, "inputs");
const outDir = join(repoRoot, "out/frames");
const page = browser(`arcade-frames-${process.pid}`);

const KEYS = ["up", "down", "left", "right", "space", "escape", "shiftP"] as const;

function sameInput(a: Input, b: Input): boolean {
  return KEYS.every((k) => a[k] === b[k]);
}

/** Only the keys that are held, so the JSON sent to the page stays small. */
function held(i: Input): Partial<Input> {
  const out: Partial<Input> = {};
  for (const k of KEYS) if (i[k]) out[k] = true;
  return out;
}

/**
 * Per-tick inputs back to steps such that `expandSteps(compressInputs(x))`
 * equals `x`. A tick with `shiftP` becomes its own one-tick step.
 */
export function compressInputs(inputs: readonly Input[]): InputStep[] {
  const steps: Array<{ ticks: number; input: Input }> = [];
  for (const i of inputs) {
    const last = steps.at(-1);
    if (last && !i.shiftP && !last.input.shiftP && sameInput(last.input, i)) last.ticks++;
    else steps.push({ ticks: 1, input: i });
  }
  return steps.map((s) => ({ ticks: s.ticks, input: held(s.input) }));
}

export interface CapturePlan {
  /** 1-based tick to capture after. */
  tick: number;
  /** Steps that advance from the previous capture tick to this one. */
  steps: InputStep[];
}

export function planCaptures(script: InputScript): CapturePlan[] {
  const inputs = expandSteps(script.steps);
  const ticks = script.captureTicks.toSorted((a, b) => a - b);
  let done = 0;
  return ticks.map((tick) => {
    if (!Number.isInteger(tick) || tick < 1 || tick > inputs.length) {
      throw new Error(`${script.name}: capture tick ${tick} is outside 1..${inputs.length}`);
    }
    const steps = compressInputs(inputs.slice(done, tick));
    done = tick;
    return { tick, steps };
  });
}

function capture(script: InputScript): void {
  const plan = planCaptures(script);
  const dir = join(outDir, script.name);
  mkdirSync(dir, { recursive: true });
  const loadOpts = JSON.stringify({ software: script.software, wave: script.wave });
  page.eval(
    `(() => { const a = window.__arcade; a.pause(); a.seed(${script.seed}); a.load(${JSON.stringify(script.scene)}, ${loadOpts}); return "ok"; })()`,
  );
  for (const { tick, steps } of plan) {
    const runScript = JSON.stringify({ ...script, steps, captureTicks: [] });
    const url = page.eval(`(() => { const a = window.__arcade; a.runScript(${runScript}); return a.frame(); })()`);
    writeFileSync(join(dir, `${tick}.png`), decodeDataUrl(url));
  }
  console.log(`${script.name}: ${plan.length} frame(s) → ${dir}`);
}

/** Capture each named input script that has capture ticks, in order. */
function captureAll(names: readonly string[]): void {
  for (const name of names) {
    const script = loadScript(inputPath(name));
    if (script.captureTicks.length > 0) capture(script);
  }
}

if (import.meta.main) {
  const requested = process.argv.slice(2);
  const names =
    requested.length > 0
      ? requested
      : readdirSync(inputsDir)
          .filter((f) => f.endsWith(".json"))
          .map((f) => basename(f, ".json"));
  const server = await startServer();
  try {
    page.run("open", `${server.url}/?debug`);
    page.run("wait", "--fn", "window.__arcade !== undefined");
    captureAll(names);
  } finally {
    page.run("close");
    server.stop();
  }
}
