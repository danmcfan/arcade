import { describe, expect, test } from "bun:test";
import { FixedStepClock, MAX_UPDATES_PER_FRAME } from "./loop.ts";

/** Feed rAF timestamps every `interval` ms and collect updates per frame. */
function run(clock: FixedStepClock, start: number, interval: number, frames: number): number[] {
  const out: number[] = [];
  for (let f = 0; f < frames; f++) out.push(clock.advance(start + f * interval));
  return out;
}

describe("FixedStepClock (D2)", () => {
  test("the first frame only starts the clock", () => {
    expect(new FixedStepClock().advance(1234)).toBe(0);
  });

  test("60 Hz frames run exactly one update each", () => {
    const counts = run(new FixedStepClock(), 0, 1000 / 60, 601).slice(1);
    expect(counts.every((c) => c === 1)).toBe(true);
  });

  test("60 Hz with rAF jitter still runs one update per frame", () => {
    const clock = new FixedStepClock();
    clock.advance(0);
    // ±0.4 ms around the true 60 Hz period, averaging exactly 1000/60.
    const jitter = [-0.3, 0.3, -0.4, 0.4, 0.1, -0.1].map((d) => 1000 / 60 + d);
    let t = 0;
    const counts = [];
    for (let i = 0; i < 600; i++) {
      t += jitter[i % jitter.length] ?? 16.7;
      counts.push(clock.advance(t));
    }
    expect(counts.every((c) => c === 1)).toBe(true);
  });

  test("120 Hz frames alternate 0 and 1 updates", () => {
    const counts = run(new FixedStepClock(), 0, 1000 / 120, 241).slice(1);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(120);
    expect(counts.every((c) => c === 0 || c === 1)).toBe(true);
    for (let i = 1; i < counts.length; i++) expect(counts[i]).not.toBe(counts[i - 1]);
  });

  test("a 250 ms stall runs the 5-update cap and then has no backlog", () => {
    const clock = new FixedStepClock();
    clock.advance(0);
    clock.advance(1000 / 60);
    expect(clock.advance(1000 / 60 + 250)).toBe(MAX_UPDATES_PER_FRAME);
    const after = run(clock, 1000 / 60 + 250 + 1000 / 60, 1000 / 60, 10);
    expect(after).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
  });

  test("time going backwards runs nothing", () => {
    const clock = new FixedStepClock();
    clock.advance(100);
    expect(clock.advance(50)).toBe(0);
    expect(clock.advance(50 + 1000 / 60)).toBe(1);
  });

  test("reset forgets the previous timestamp (resume after pause)", () => {
    const clock = new FixedStepClock();
    clock.advance(0);
    clock.reset();
    expect(clock.advance(10_000)).toBe(0);
    expect(clock.advance(10_000 + 1000 / 60)).toBe(1);
  });
});
