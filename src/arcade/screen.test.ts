import { describe, expect, test } from "bun:test";
import { powerFrames } from "../ui/hubArt.ts";
import { newScreen, screenFrame, updateScreen, type Screen } from "./screen.ts";

/** The frame names a screen shows over `ticks` ticks of `on`. */
function play(s: Screen, on: boolean, ticks: number): (string | null)[] {
  const shown: (string | null)[] = [];
  for (let t = 0; t < ticks; t++) {
    updateScreen(s, on);
    const frame = screenFrame(s);
    shown.push(frame === null ? null : (powerFrames[frame]?.name ?? "?"));
  }
  return shown;
}

describe("a cabinet screen", () => {
  test("starts dark", () => {
    expect(screenFrame(newScreen())).toBeNull();
    expect(play(newScreen(), false, 3)).toEqual([null, null, null]);
  });

  test("switching on: a dot, a line opening across, a flash, over-bright, then the picture holds", () => {
    const shown = play(newScreen(), true, 30);
    expect([...new Set(shown)]).toEqual(["dot", "line2", "line4", "line6", "line8", "band", "bright", "on"]);
    expect(shown.indexOf("on")).toBe(15);
    expect(shown.slice(15).every((f) => f === "on")).toBe(true);
  });

  test("switching off: it collapses to a line and a dot, then goes dark", () => {
    const s = newScreen();
    play(s, true, 30);
    const shown = play(s, false, 12);
    expect([...new Set(shown)]).toEqual(["offBand", "offLine8", "offLine6", "offLine4", "offLine2", "offDot", null]);
    expect(shown.indexOf(null)).toBe(10);
  });

  test("turning back mid-way starts the switch over", () => {
    const s = newScreen();
    play(s, true, 5);
    expect(play(s, false, 1)).toEqual(["offBand"]);
    expect(play(s, true, 1)).toEqual(["dot"]);
  });
});
