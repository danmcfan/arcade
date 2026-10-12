import { describe, expect, test } from "bun:test";
import { DigitReel, digitReelDurationFrames, digits6, easeDialOut } from "./digitReel.ts";

describe("digits6", () => {
  test("splits into six decimal columns, most significant first", () => {
    expect(digits6(0)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(digits6(7)).toEqual([0, 0, 0, 0, 0, 7]);
    expect(digits6(1230)).toEqual([0, 0, 1, 2, 3, 0]);
    expect(digits6(987654)).toEqual([9, 8, 7, 6, 5, 4]);
  });

  test("clamps to 0..999999", () => {
    expect(digits6(-5)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(digits6(1_234_567)).toEqual([9, 9, 9, 9, 9, 9]);
  });
});

describe("easeDialOut", () => {
  test("clamps outside (0, 1)", () => {
    expect(easeDialOut(-1)).toBe(0);
    expect(easeDialOut(0)).toBe(0);
    expect(easeDialOut(1)).toBe(1);
    expect(easeDialOut(2)).toBe(1);
  });

  test("is 1 - (1-t)^3 in between", () => {
    expect(easeDialOut(0.5)).toBe(0.875);
    expect(easeDialOut(0.25)).toBe(1 - 0.421875);
  });
});

describe("DigitReel", () => {
  test("Boot settles on the digit mod 10 and goes idle", () => {
    const r = new DigitReel();
    r.boot(13);
    expect(r.settledDigit).toBe(3);
    expect(r.active).toBe(false);
    expect(r.t).toBe(0);
    r.boot(-3);
    expect(r.settledDigit).toBe(7);
  });

  test("SyncTarget starts a spin only when idle and the target differs", () => {
    const r = new DigitReel();
    r.boot(2);
    r.syncTarget(2);
    expect(r.active).toBe(false);

    r.syncTarget(15);
    expect([r.active, r.from, r.to, r.t]).toEqual([true, 2, 5, 0]);

    // A new target while spinning is ignored.
    r.syncTarget(9);
    expect(r.to).toBe(5);
  });

  test("a spin lasts 18 frames, then settles on the new digit", () => {
    expect(digitReelDurationFrames).toBe(18);
    const r = new DigitReel();
    r.boot(0);
    r.syncTarget(1);
    for (let i = 0; i < 17; i++) {
      r.stepFrame();
      expect(r.active).toBe(true);
    }
    expect(r.scroll01()).toBe(easeDialOut(r.t));
    r.stepFrame();
    expect([r.active, r.settledDigit, r.t]).toEqual([false, 1, 1]);
    expect(r.scroll01()).toBe(1);
  });

  test("t accumulates 1/18 per frame as float64", () => {
    const r = new DigitReel();
    r.boot(0);
    r.syncTarget(4);
    r.stepFrame();
    r.stepFrame();
    expect(r.t).toBe(1 / 18 + 1 / 18);
  });

  test("stepFrame is a no-op when idle", () => {
    const r = new DigitReel();
    r.boot(6);
    r.stepFrame();
    expect([r.active, r.settledDigit, r.t]).toEqual([false, 6, 0]);
  });
});
