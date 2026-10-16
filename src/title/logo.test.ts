import { describe, expect, test } from "bun:test";
import { sweetie } from "../ui/sweetie16.ts";
import { titleBar, titleScreenHeight, titleScreenSpot, titleScreenWidth, titleWord } from "../ui/titleArt.ts";
import { backLights, logoOverlay, sheenPeriod, pulsePeriod } from "./logo.ts";

const inLayer = (layer: typeof titleWord, x: number, y: number): string =>
  layer.rows[y - layer.y]?.[x - layer.x] ?? ".";

/** The left end of the white core of the bar's pulse on `tick`. */
function pulseX(tick: number): number {
  const lit = logoOverlay(tick).filter((p) => p.colour === sweetie.w && inLayer(titleBar, p.x, p.y) !== ".");
  return Math.min(...lit.map((p) => p.x));
}

/** What the cabinet's screen shows on `tick`. */
function screenAt(tick: number): string {
  return logoOverlay(tick)
    .filter(
      (p) =>
        p.x >= titleScreenSpot.x &&
        p.y >= titleScreenSpot.y &&
        p.x < titleScreenSpot.x + titleScreenWidth &&
        p.y < titleScreenSpot.y + titleScreenHeight,
    )
    .map((p) => `${p.x},${p.y},${p.colour}`)
    .join();
}

describe("logoOverlay", () => {
  test("the sheen lights letter faces white partway through its sweep, and only faces", () => {
    const overlay = logoOverlay(Math.trunc(sheenPeriod / 5));
    const white = overlay.filter((p) => p.colour === sweetie.w && "yor".includes(inLayer(titleWord, p.x, p.y)));
    expect(white.length).toBeGreaterThan(0);
  });

  test("one sweep of the sheen crosses every letter of ARCADE", () => {
    const litColumns = new Set<number>();
    for (let tick = 0; tick < sheenPeriod; tick++) {
      for (const p of logoOverlay(tick)) {
        if (p.colour === sweetie.w && "yor".includes(inLayer(titleWord, p.x, p.y))) litColumns.add(p.x);
      }
    }
    for (let i = 0; i < 6; i++) {
      // Each letter's face is 28 columns wide, one every 31 columns from the word's left edge.
      const left = titleWord.x + i * 31;
      expect([...litColumns].some((x) => x >= left && x < left + 28)).toBe(true);
    }
  });

  test("between sweeps no letter face changes", () => {
    const overlay = logoOverlay(sheenPeriod - 1);
    expect(overlay.some((p) => "yor".includes(inLayer(titleWord, p.x, p.y)))).toBe(false);
  });

  test("the bar's pulse runs left to right", () => {
    expect(pulseX(10)).toBeLessThan(pulseX(40));
    expect(pulseX(pulsePeriod + 10)).toBe(pulseX(10));
  });

  test("the cabinet's screen plays: it changes from tick to tick", () => {
    expect(screenAt(0)).not.toBe(screenAt(12));
  });

  test("the back lights blink", () => {
    expect(backLights(0)).not.toEqual(backLights(30));
  });
});
