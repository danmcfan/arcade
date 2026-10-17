import { describe, expect, test } from "bun:test";
import { digitReelDurationFrames } from "./digitReel.ts";
import { Dial, ScoreDials } from "./dials.ts";

const at = { score: { x: 8, y: 8 }, high: { x: 88, y: 8 } } as const;
const shown = (d: Dial): number[] => d.reels.map((r) => r.settledDigit);

describe("ScoreDials high score", () => {
  test("starts on the House high score", () => {
    expect(new ScoreDials(5000, at).highScore).toBe(5000);
  });

  test("stays put while the Score is below it", () => {
    const dials = new ScoreDials(5000, at);
    dials.tick(1200);
    expect(dials.highScore).toBe(5000);
  });

  test("follows the Score once it passes, and never falls back", () => {
    const dials = new ScoreDials(5000, at);
    dials.tick(7300);
    expect(dials.highScore).toBe(7300);
    dials.tick(0);
    expect(dials.highScore).toBe(7300);
  });
});

describe("Dial", () => {
  test("boots settled on its value, with no spin", () => {
    const d = new Dial({ x: 0, y: 0 }, 1230);
    expect(shown(d)).toEqual([0, 0, 1, 2, 3, 0]);
    expect(d.reels.some((r) => r.active)).toBe(false);
  });

  test("rolls to a new value, then settles on it", () => {
    const d = new Dial({ x: 0, y: 0 });
    d.update(40);
    expect(d.reels[4].active).toBe(true);
    for (let n = 0; n < digitReelDurationFrames + 1; n++) d.update(40);
    expect(d.reels.some((r) => r.active)).toBe(false);
    expect(shown(d)).toEqual([0, 0, 0, 0, 4, 0]);
  });
});

describe("ScoreDials rolling", () => {
  test("both dials roll as the Score passes the high score, then settle on it", () => {
    const dials = new ScoreDials(10, at);
    for (let n = 0; n < digitReelDurationFrames + 2; n++) dials.tick(25);
    expect(shown(dials.score)).toEqual([0, 0, 0, 0, 2, 5]);
    expect(shown(dials.high)).toEqual([0, 0, 0, 0, 2, 5]);
  });
});
