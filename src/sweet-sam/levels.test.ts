import { describe, expect, test } from "bun:test";
import { levelCap, levelValues, sleepyFramesMinimum } from "./levels.ts";

/** Ticks of `mode` on `level`, leaving out the chase that never ends. */
function total(level: number, mode: number): number {
  return levelValues(level)
    .modeSequence.filter((m) => m.mode === mode && m.ticks > 0)
    .reduce((t, m) => t + m.ticks, 0);
}

describe("levelValues", () => {
  test("level 1 is the Go game: bee speed, sleepy time, modes and when bees leave home", () => {
    const l1 = levelValues(1);
    expect(l1.beeVelocity).toBe(0.9375);
    expect(l1.sleepyFrames).toBe(600);
    expect(l1.modeSequence).toEqual([
      { mode: 0, ticks: 420 },
      { mode: 1, ticks: 1200 },
      { mode: 0, ticks: 420 },
      { mode: 1, ticks: 1200 },
      { mode: 0, ticks: 300 },
      { mode: 1, ticks: 1200 },
      { mode: 0, ticks: 300 },
      { mode: 1, ticks: -1 },
    ]);
    expect(l1.dotMinimums).toEqual({ pink: 0, teal: 30, orange: 60 });
  });

  test("each later level is at least as hard as the one before, until the cap", () => {
    for (let level = 2; level <= levelCap; level++) {
      const prev = levelValues(level - 1);
      const cur = levelValues(level);
      expect(cur.beeVelocity).toBeGreaterThanOrEqual(prev.beeVelocity);
      expect(cur.sleepyFrames).toBeLessThan(prev.sleepyFrames);
      cur.modeSequence.forEach((m, i) => {
        const before = prev.modeSequence[i];
        if (before === undefined) throw new Error(`no mode ${i}`);
        expect(m.mode).toBe(before.mode);
        if (m.ticks === -1) return;
        if (m.mode === 0) expect(m.ticks).toBeLessThanOrEqual(before.ticks);
        else expect(m.ticks).toBeGreaterThanOrEqual(before.ticks);
      });
      expect(cur.dotMinimums.teal).toBeLessThanOrEqual(prev.dotMinimums.teal);
      expect(cur.dotMinimums.orange).toBeLessThanOrEqual(prev.dotMinimums.orange);
    }
    expect(levelValues(2).beeVelocity).toBeGreaterThan(levelValues(1).beeVelocity);
  });

  test("in all, scatter gets shorter and chase longer on level 2, but the first scatter stays 7 s", () => {
    expect(total(2, 0)).toBeLessThan(total(1, 0));
    expect(total(2, 1)).toBeGreaterThan(total(1, 1));
    for (let level = 1; level <= levelCap; level++) expect(levelValues(level).modeSequence[0]?.ticks).toBe(420);
  });

  test("stops changing at the cap", () => {
    expect(levelValues(levelCap + 1)).toEqual(levelValues(levelCap));
    expect(levelValues(99)).toEqual(levelValues(levelCap));
  });

  test("sleepy time never drops below its minimum, which is above 0", () => {
    expect(sleepyFramesMinimum).toBeGreaterThan(0);
    for (let level = 1; level <= levelCap + 3; level++) {
      expect(levelValues(level).sleepyFrames).toBeGreaterThanOrEqual(sleepyFramesMinimum);
    }
  });
});
