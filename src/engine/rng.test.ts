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

test("intn stays in range", () => {
  rng.seed(7);
  for (let i = 0; i < 1000; i++) {
    const v = rng.intn(4);
    expect(v >= 0 && v < 4 && Number.isInteger(v)).toBe(true);
  }
});
