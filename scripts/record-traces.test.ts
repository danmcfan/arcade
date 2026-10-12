import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { diff, inputPath, loadScript, readTrace, replay, tracePath } from "../test/parity/harness.ts";
import { encodeTrace } from "./record-traces.ts";

describe("encodeTrace", () => {
  test("one JSON object per line, gzipped, read back by readTrace", () => {
    const dir = mkdtempSync(join(tmpdir(), "traces-"));
    try {
      const path = join(dir, "t.jsonl.gz");
      writeFileSync(path, encodeTrace([{ tick: 1, a: [1, 2] }, { tick: 2, a: [] }]));
      expect(readTrace(path)).toEqual([{ tick: 1, a: [1, 2] }, { tick: 2, a: [] }]);
      expect(new TextDecoder().decode(Bun.gunzipSync(encodeTrace([{ tick: 1 }])))).toBe('{"tick":1}\n');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("re-recording an unchanged scenario reproduces its committed trace", () => {
    const scenario = "lumberjack-chop";
    const dir = mkdtempSync(join(tmpdir(), "traces-"));
    try {
      const path = join(dir, `${scenario}.jsonl.gz`);
      writeFileSync(path, encodeTrace(replay(loadScript(inputPath(scenario)))));
      const fresh = readTrace(path);
      const committed = readTrace(tracePath(scenario));
      expect(fresh.length).toBe(committed.length);
      expect(diff(committed, fresh)).toBeNull();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
