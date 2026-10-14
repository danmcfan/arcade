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

const SCENES: ReadonlySet<unknown> = new Set(["title", "game"]);
const SOFTWARE: ReadonlySet<unknown> = new Set(["sweetSam", "firefly", "brassMonkey"]);

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStep(v: unknown): boolean {
  return isObject(v) && typeof v["ticks"] === "number" && isObject(v["input"]);
}

function optional(v: unknown, check: (v: unknown) => boolean): boolean {
  return v === undefined || check(v);
}

function isArrayOf(v: unknown, check: (item: unknown) => boolean): boolean {
  return Array.isArray(v) && v.every((item) => check(item));
}

/** Structural check of a parsed §4.2 input script. */
export function isInputScript(v: unknown): v is InputScript {
  if (!isObject(v)) return false;
  const { name, scene, software, seed, steps, captureTicks } = v;
  return (
    typeof name === "string" &&
    SCENES.has(scene) &&
    optional(software, (s) => SOFTWARE.has(s)) &&
    typeof seed === "number" &&
    isArrayOf(steps, isStep) &&
    isArrayOf(captureTicks, (t) => typeof t === "number")
  );
}

/** Parse a §4.2 input script; throws if the file is not one. */
export function loadScript(path: string): InputScript {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!isInputScript(parsed)) throw new Error(`${path}: not a §4.2 input script`);
  return parsed;
}

/** Gunzip a `.jsonl.gz` trace and parse one object per non-empty line. */
export function readTrace(path: string): unknown[] {
  return parseTrace(readFileSync(path));
}

/** Parse gzipped JSONL trace bytes, one object per non-empty line. */
export function parseTrace(gz: Uint8Array<ArrayBuffer>): unknown[] {
  const text = new TextDecoder().decode(Bun.gunzipSync(gz));
  const out: unknown[] = [];
  for (const line of text.split("\n")) if (line.trim() !== "") out.push(JSON.parse(line));
  return out;
}
