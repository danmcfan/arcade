import { describe, expect, test } from "bun:test";
import { compareTrace, inputPath, loadScript, parseTrace } from "../test/parity/harness.ts";
import { recordTrace } from "./record-traces.ts";

describe("record-traces", () => {
  test("a recorded trace replays with no mismatch", () => {
    const script = loadScript(inputPath("gearhead-walk"));
    const trace = parseTrace(recordTrace(script));
    expect(trace).toHaveLength(206);
    expect(trace[0]).toMatchObject({ tick: 1, software: "gearhead" });
    expect(compareTrace(script, trace)).toBeNull();
  });

  test("recording is deterministic", () => {
    const script = loadScript(inputPath("gearhead-walk"));
    expect(Buffer.compare(recordTrace(script), recordTrace(script))).toBe(0);
  });
});
