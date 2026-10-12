import { describe, expect, test } from "bun:test";
import { Tree, thetaInterval, thetaMax } from "./tree.ts";

describe("constants", () => {
  // Values printed by Go (`radians * 4.0`, `radians * 0.25` folded exactly at
  // compile time, then rounded once).
  test("thetaMax and thetaInterval match Go's folded constants", () => {
    expect(thetaMax).toBe(0.06981317007977318);
    expect(thetaInterval).toBe(0.004363323129985824);
  });
});

describe("Tree", () => {
  test("starts at full health, still", () => {
    const t = new Tree(128, 72);
    expect(t.health).toBe(100);
    expect(t.shaking).toBe(false);
    expect(t.theta).toBe(0);
  });

  test("hitbox is the 16x8 trunk base", () => {
    expect(new Tree(128, 72).hitbox()).toEqual({ x: 120, y: 88, w: 16, h: 8 });
  });

  test("update does nothing while not shaking", () => {
    const t = new Tree(128, 72);
    t.update();
    expect(t.theta).toBe(0);
  });

  function runShake(t: Tree): { peak: number; trough: number; ticks: number } {
    let peak = 0;
    let trough = 0;
    let ticks = 0;
    while (t.shaking && ticks < 100) {
      t.update();
      ticks++;
      peak = Math.max(peak, t.theta);
      trough = Math.min(trough, t.theta);
    }
    return { peak, trough, ticks };
  }

  test("a right shake swings up to thetaMax and returns to exactly 0", () => {
    const t = new Tree(128, 72);
    t.shake(true);
    expect(t.shakeRight).toBe(true);
    expect(t.thetaIncreasing).toBe(true);
    const { peak, trough, ticks } = runShake(t);
    expect(peak).toBe(thetaMax);
    expect(trough).toBe(0);
    expect(t.theta).toBe(0);
    expect(t.shaking).toBe(false);
    // 16 ticks up (the 16th lands exactly on thetaMax), ~16 back down.
    expect(ticks).toBeGreaterThanOrEqual(32);
    expect(ticks).toBeLessThanOrEqual(33);
  });

  test("a left shake mirrors it down to -thetaMax", () => {
    const t = new Tree(128, 72);
    t.shake(false);
    expect(t.thetaIncreasing).toBe(false);
    const { peak, trough } = runShake(t);
    expect(trough).toBe(-thetaMax);
    expect(peak).toBe(0);
    expect(t.theta).toBe(0);
    expect(t.shaking).toBe(false);
  });

  test("pivot is 37 for a right shake, 26 for a left one", () => {
    const t = new Tree(128, 72);
    expect(t.pivotX()).toBe(26);
    t.shake(true);
    expect(t.pivotX()).toBe(37);
  });
});
