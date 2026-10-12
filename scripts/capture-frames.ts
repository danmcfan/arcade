// Capture TS frames for the golden scenarios through the `?debug` test hook
// (§3.5), driving a browser with agent-browser. Start the dev server first:
//
//   ARCADE_PORT=3002 bun run dev &
//   ARCADE_PORT=3002 bun run frames [scenario ...]
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
import { ARCADE_PORT, ARCADE_URL } from "./config.ts";

const inputsDir = join(fixturesDir, "inputs");
const outDir = join(repoRoot, "out/frames");
const SESSION = `arcade-frames-${ARCADE_PORT}`;

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
    const last = steps[steps.length - 1];
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
  const ticks = [...script.captureTicks].sort((a, b) => a - b);
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

export function decodeDataUrl(url: string): Buffer {
  const m = /^data:image\/png;base64,(.*)$/.exec(url);
  if (!m?.[1]) throw new Error(`not a PNG data URL: ${url.slice(0, 40)}...`);
  return Buffer.from(m[1], "base64");
}

function agentBrowser(...args: string[]): string {
  const r = Bun.spawnSync(["agent-browser", "--session", SESSION, ...args], { stdout: "pipe", stderr: "pipe" });
  if (r.exitCode !== 0) {
    throw new Error(`agent-browser ${args[0]} failed: ${r.stderr.toString()}${r.stdout.toString()}`);
  }
  return r.stdout.toString();
}

/** Evaluate JS in the page and return its (string) result. */
function evalInPage(js: string): string {
  const out = agentBrowser("--json", "eval", "-b", Buffer.from(js).toString("base64")).trim();
  const parsed: unknown = JSON.parse(out);
  const pick = (v: unknown): unknown => {
    if (v !== null && typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (o.success === false) throw new Error(`eval failed: ${JSON.stringify(o.error ?? o)}`);
      if ("data" in o) return pick(o.data);
      if ("result" in o) return o.result;
    }
    return v;
  };
  const result = pick(parsed);
  return typeof result === "string" ? result : JSON.stringify(result);
}

function capture(script: InputScript): void {
  const plan = planCaptures(script);
  const dir = join(outDir, script.name);
  mkdirSync(dir, { recursive: true });
  const loadOpts = JSON.stringify({ software: script.software, wave: script.wave });
  evalInPage(
    `(() => { const a = window.__arcade; a.pause(); a.seed(${script.seed}); a.load(${JSON.stringify(script.scene)}, ${loadOpts}); return "ok"; })()`,
  );
  for (const { tick, steps } of plan) {
    const runScript = JSON.stringify({ ...script, steps, captureTicks: [] });
    const url = evalInPage(`(() => { const a = window.__arcade; a.runScript(${runScript}); return a.frame(); })()`);
    writeFileSync(join(dir, `${tick}.png`), decodeDataUrl(url));
  }
  console.log(`${script.name}: ${plan.length} frame(s) → ${dir}`);
}

if (import.meta.main) {
  const requested = process.argv.slice(2);
  const names =
    requested.length > 0
      ? requested
      : readdirSync(inputsDir)
          .filter((f) => f.endsWith(".json"))
          .map((f) => basename(f, ".json"));
  agentBrowser("open", `${ARCADE_URL}/?debug`);
  agentBrowser("wait", "--fn", "window.__arcade !== undefined");
  try {
    for (const name of names) {
      const script = loadScript(inputPath(name));
      if (script.captureTicks.length > 0) capture(script);
    }
  } finally {
    agentBrowser("close");
  }
}
