// Re-record parity traces from the TypeScript game, for fixtures a change
// deliberately alters (ADR 0004):
//
//   bun run traces <scenario> [scenario ...]
//
// Replays test/fixtures/inputs/<scenario>.json with the parity harness and
// writes test/fixtures/traces/<scenario>.jsonl.gz. There is no "all": name
// each scenario you mean to change, so untouched fixtures are never
// rewritten. Re-capture the matching golden frames with `bun run frames`.

import { existsSync, writeFileSync } from "node:fs";
import { relative } from "node:path";
import { inputPath, loadScript, replay, tracePath } from "../test/parity/harness.ts";
import { repoRoot } from "../test/parity/fixtures.ts";

/**
 * Gzipped JSONL: one `JSON.stringify` per snapshot, each ending in "\n".
 * JS writes `-0` as `0` and its own exponent style; both parse back to
 * values the harness's `===` compare treats as equal.
 */
export function encodeTrace(snapshots: readonly unknown[]): Uint8Array<ArrayBuffer> {
  const text = snapshots.map((s) => `${JSON.stringify(s)}\n`).join("");
  return Bun.gzipSync(new TextEncoder().encode(text));
}

function record(scenario: string): void {
  const input = inputPath(scenario);
  if (!existsSync(input)) throw new Error(`no input script ${relative(repoRoot, input)}`);
  const snapshots = replay(loadScript(input));
  const out = tracePath(scenario);
  writeFileSync(out, encodeTrace(snapshots));
  console.log(`${scenario}: ${snapshots.length} ticks → ${relative(repoRoot, out)}`);
}

if (import.meta.main) {
  const scenarios = process.argv.slice(2);
  if (scenarios.length === 0) {
    console.error("usage: bun run traces <scenario> [scenario ...]");
    process.exit(1);
  }
  for (const s of scenarios) record(s);
}
