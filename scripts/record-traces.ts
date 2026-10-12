// Re-record parity traces from the TypeScript game, for fixtures whose
// behaviour changed on purpose (ADR 0004):
//
//   bun run traces <scenario ...>
//
// Replays test/fixtures/inputs/<scenario>.json exactly as the parity test
// does (`replay()` in test/parity/harness.ts) and writes one snapshot per
// tick as gzipped JSONL to test/fixtures/traces/<scenario>.jsonl.gz. Name the
// scenarios: re-recording everything would silently turn every Go-recorded
// fixture into a TS self-recording. Re-capture the golden frames with
// `bun run frames <scenario ...>` too.

import { writeFileSync } from "node:fs";
import type { InputScript } from "../src/game/script.ts";
import { inputPath, loadScript, replay, tracePath } from "../test/parity/harness.ts";

/** The trace for `script`, gzipped JSONL (deterministic bytes). */
export function recordTrace(script: InputScript): Uint8Array<ArrayBuffer> {
  const lines = replay(script).map((s) => JSON.stringify(s));
  return Bun.gzipSync(new TextEncoder().encode(`${lines.join("\n")}\n`), { level: 9 });
}

if (import.meta.main) {
  const names = process.argv.slice(2);
  if (names.length === 0) {
    console.error("usage: bun run traces <scenario ...>");
    process.exit(1);
  }
  for (const name of names) {
    const data = recordTrace(loadScript(inputPath(name)));
    writeFileSync(tracePath(name), data);
    console.log(`wrote ${tracePath(name)} (${data.length} bytes)`);
  }
}
