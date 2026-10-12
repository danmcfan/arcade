import { expect, test } from "bun:test";
import * as rng from "./rng.ts";

test("seed makes the sequence reproducible and state tracks it", () => {
  rng.seed(42);
  expect(rng.state()).toBe(42);
  const first = [rng.float(), rng.float(), rng.intn(10)];
  const after = rng.state();

  rng.seed(42);
  expect([rng.float(), rng.float(), rng.intn(10)]).toEqual(first);
  expect(rng.state()).toBe(after);
});

test("each call advances the state by the mulberry32 increment", () => {
  rng.seed(0xffffffff);
  rng.float();
  expect(rng.state()).toBe(0x6d2b79f4);
});

test("seed coerces to uint32", () => {
  rng.seed(-1);
  expect(rng.state()).toBe(4294967295);
});

// Golden lock against the Go harness (§3.3, §4.4 `rng`): T2 writes
// test/fixtures/rng.json with the first 1000 outputs for seeds 1 and 42.
// Accepted shapes: { "<seed>": number[] }, { seeds: { "<seed>": number[] } },
// or [{ seed, values }]. Values are float() results in [0, 1), or raw uint32
// outputs (float() * 2^32) if any value is ≥ 1.
const rngFixture = new URL("../../test/fixtures/rng.json", import.meta.url).pathname;

function goldenSequences(raw: unknown): Array<{ seed: number; values: number[] }> {
  const asNumbers = (v: unknown): number[] => {
    if (!Array.isArray(v) || !v.every((x) => typeof x === "number")) throw new Error("rng.json: values must be number[]");
    return v;
  };
  if (Array.isArray(raw)) {
    return raw.map((e: { seed: number; values: unknown }) => ({ seed: e.seed, values: asNumbers(e.values) }));
  }
  if (raw !== null && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const table = (obj.seeds ?? obj) as Record<string, unknown>;
    return Object.entries(table).map(([seed, values]) => ({ seed: Number(seed), values: asNumbers(values) }));
  }
  throw new Error("rng.json: unrecognized shape");
}

const haveRngFixture = await Bun.file(rngFixture).exists();
if (!haveRngFixture) {
  console.warn("[skip] rng golden: test/fixtures/rng.json is missing (delivered by the golden ticket, T2)");
}
test.skipIf(!haveRngFixture)("matches the Go golden outputs in test/fixtures/rng.json (seeds 1, 42)", async () => {
  const sequences = goldenSequences(await Bun.file(rngFixture).json());
  expect(sequences.map((s) => s.seed).sort((a, b) => a - b)).toEqual([1, 42]);
  for (const { seed, values } of sequences) {
    expect(values.length).toBe(1000);
    const raw = values.some((v) => v >= 1);
    rng.seed(seed);
    const actual = values.map(() => (raw ? rng.float() * 4294967296 : rng.float()));
    expect({ seed, values: actual }).toEqual({ seed, values });
  }
});

test("intn stays in range", () => {
  rng.seed(7);
  for (let i = 0; i < 1000; i++) {
    const v = rng.intn(4);
    expect(v >= 0 && v < 4 && Number.isInteger(v)).toBe(true);
  }
});
