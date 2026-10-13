// A cabinet screen switching on when the player faces the cabinet and off when
// they turn away, like a CRT: a dot, a line opening across the tube, a flash,
// then the picture, and its light on the carpet. The frames are drawn in
// src/ui/hubArt.ts (`powerFrames`); this plays them, one step per tick.

import { powerFrames, type PowerFrame } from "../ui/hubArt.ts";

export interface Screen {
  on: boolean;
  /** Ticks since it last switched on or off. */
  ticks: number;
}

/** A screen that has been off for good: the room shows its dark glass. */
export function newScreen(): Screen {
  return { on: false, ticks: Infinity };
}

/** The frame on each tick after switching on; the last one holds. */
const onFrames: readonly PowerFrame[] = [
  ...repeat("dot", 3),
  "line2",
  "line4",
  "line6",
  ...repeat("line8", 2),
  ...repeat("band", 3),
  ...repeat("bright", 4),
  "on",
];

/** The frame on each tick after switching off; then the dark glass. */
const offFrames: readonly PowerFrame[] = [
  ...repeat("offBand", 3),
  "offLine8",
  "offLine6",
  "offLine4",
  "offLine2",
  ...repeat("offDot", 3),
];

function repeat(frame: PowerFrame, n: number): PowerFrame[] {
  return Array.from({ length: n }, () => frame);
}

/** Advance one tick, switching on or off when `on` changes. */
export function updateScreen(s: Screen, on: boolean): void {
  if (on === s.on) {
    s.ticks++;
    return;
  }
  s.on = on;
  s.ticks = 0;
}

/** The column in screens.png to draw, or null for the dark glass already in the room. */
export function screenFrame(s: Screen): number | null {
  const frames = s.on ? onFrames : offFrames;
  const frame = s.on ? frames[Math.min(s.ticks, frames.length - 1)] : frames[s.ticks];
  return frame === undefined ? null : powerFrames.findIndex((f) => f.name === frame);
}
