import { describe, expect, test } from "bun:test";
import { levelCap, levelValues, modeSequence, type ModeConfig } from "./levels.ts";

/** Scatter and chase from seconds, then the one-tick scatter and the chase that never ends. */
function ticks(...seconds: number[]): ModeConfig[] {
  return [...seconds.map((sec) => sec * 60), 1, -1].map((t, i) => ({ mode: i % 2 === 0 ? 0 : 1, ticks: t }));
}

describe("levelValues (Dossier, Table A.1)", () => {
  // level, fright seconds, flashes, Elroy 1 drops
  const rows: [number, number, number, number][] = [
    [1, 6, 5, 20],
    [2, 5, 5, 30],
    [3, 4, 5, 40],
    [4, 3, 5, 40],
    [5, 2, 5, 40],
    [6, 5, 5, 50],
    [7, 2, 5, 50],
    [8, 2, 5, 50],
    [9, 1, 3, 60],
    [10, 5, 5, 60],
    [11, 2, 5, 60],
    [12, 1, 3, 80],
    [13, 1, 3, 80],
    [14, 3, 5, 80],
    [15, 1, 3, 100],
    [16, 1, 3, 100],
    [17, 0, 0, 100],
    [18, 1, 3, 100],
    [19, 0, 0, 120],
    [20, 0, 0, 120],
    [21, 0, 0, 120],
  ];
  test.each(rows)("level %p: %p s sleepy, %p flashes, Elroy at %p drops", (level, seconds, flashes, drops) => {
    const v = levelValues(level);
    expect(v.sleepyFrames).toBe(seconds * 60);
    expect(v.flashes).toBe(flashes);
    expect(v.elroy.map((e) => e.dropsLeft)).toEqual([drops, drops / 2]);
  });

  test("level 22 and later play as level 21", () => {
    expect(levelCap).toBe(21);
    expect(levelValues(22)).toEqual(levelValues(21));
    expect(levelValues(255)).toEqual(levelValues(21));
  });

  test('scatter and chase: level 1, levels 2–4, then 5 on ("Scatter, Chase, Repeat...")', () => {
    expect(levelValues(1).modeSequence).toBe(modeSequence);
    for (const level of [2, 3, 4]) expect(levelValues(level).modeSequence).toEqual(ticks(7, 20, 7, 20, 5, 1033));
    for (const level of [5, 20, 21]) expect(levelValues(level).modeSequence).toEqual(ticks(5, 20, 5, 20, 5, 1037));
  });

  test('home dot limits ("Home Sweet Home"): 30/60 on level 1, 0/50 on level 2, none from level 3', () => {
    expect(levelValues(1).dotMinimums).toEqual({ pink: 0, teal: 30, orange: 60 });
    expect(levelValues(2).dotMinimums).toEqual({ pink: 0, teal: 0, orange: 50 });
    for (const level of [3, 4, 5, 21]) expect(levelValues(level).dotMinimums).toEqual({ pink: 0, teal: 0, orange: 0 });
  });

  test("a bee left alone in the home leaves after 4 s, 3 s from level 5", () => {
    expect([1, 4, 5, 21].map((l) => levelValues(l).idleReleaseTicks)).toEqual([240, 240, 180, 180]);
  });
});

const pct = (p: number): number => (p / 100) * 1.25;

describe("speeds (Dossier Table A.1, 100% = 1.25 px a tick)", () => {
  const rows: [number[], number, number, number, number, number, number, number][] = [
    // levels, bear, sleepy bear, bee, sleepy bee, tunnel, Elroy 1, Elroy 2
    [[1], 80, 90, 75, 50, 40, 80, 85],
    [[2, 3, 4], 90, 95, 85, 55, 45, 90, 95],
    [[5, 12, 20], 100, 100, 95, 60, 50, 100, 105],
    [[21, 22, 99], 90, 90, 95, 60, 50, 100, 105],
  ];
  test.each(rows)("levels %p", (levels, bear, bearSleepy, bee, beeSleepy, tunnel, elroy1, elroy2) => {
    for (const level of levels) {
      const v = levelValues(level);
      expect([
        v.bearVelocity,
        v.bearSleepyVelocity,
        v.beeVelocity,
        v.sleepyBeeVelocity,
        v.tunnelVelocity,
        v.elroy[0].velocity,
        v.elroy[1].velocity,
      ]).toEqual([bear, bearSleepy, bee, beeSleepy, tunnel, elroy1, elroy2].map((p) => pct(p)));
    }
  });

  test("red is faster at Elroy 2 than at Elroy 1 on every level", () => {
    for (let level = 1; level <= 25; level++) {
      const [first, second] = levelValues(level).elroy;
      expect(second.velocity).toBeGreaterThan(first.velocity);
      expect(first.velocity).toBeGreaterThan(levelValues(level).beeVelocity);
    }
  });
});
