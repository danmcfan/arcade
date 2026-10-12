// Shared golden-fixture paths and loaders for the parity harness
// (test/parity/harness.ts) and the frame scripts (scripts/capture-frames.ts,
// scripts/frame-report.ts). Directory paths end in `/`.

import { readFileSync } from "node:fs";
import type { InputScript } from "../../src/game/script.ts";

export const repoRoot = new URL("../../", import.meta.url).pathname;
export const fixturesDir = new URL("../fixtures/", import.meta.url).pathname;

/** test/fixtures/inputs/<scenario>.json */
export function inputPath(scenario: string): string {
  return `${fixturesDir}inputs/${scenario}.json`;
}

/** test/fixtures/traces/<scenario>.jsonl.gz */
export function tracePath(scenario: string): string {
  return `${fixturesDir}traces/${scenario}.jsonl.gz`;
}

/** Parse a §4.2 input script. */
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
