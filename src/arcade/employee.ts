// The prize desk's employee (#75): stands behind the desk, back to us, facing
// the player, and idles through the frames of src/ui/employeeArt.ts.

import { imageEmployee } from "../engine/assets.ts";
import { sub } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";
import { employeeHeight, employeeWidth } from "../ui/employeeArt.ts";
import { employeeSpot } from "./desk.ts";

/** The idle loop: [frame, ticks]. Stand, breathe, stand, then a little wave. */
export const employeeIdle: readonly (readonly [frame: number, ticks: number])[] = [
  [0, 84],
  [1, 30],
  [0, 54],
  [2, 18],
  [0, 18],
  [2, 18],
];
const idleLength = employeeIdle.reduce((n, [, ticks]) => n + ticks, 0);

/** The idle frame shown at hub tick `tick`. */
export function employeeFrame(tick: number): number {
  let t = ((tick % idleLength) + idleLength) % idleLength;
  for (const [frame, ticks] of employeeIdle) {
    if (t < ticks) return frame;
    t -= ticks;
  }
  return 0;
}

/** Draw the employee at their spot, the hub image drawn at (`buffer`, `buffer`). */
export function drawEmployee(screen: Surface, tick: number, buffer: number): void {
  const x = employeeFrame(tick) * employeeWidth;
  screen.draw(
    sub(imageEmployee, x, 0, x + employeeWidth, employeeHeight),
    employeeSpot.x + buffer,
    employeeSpot.y + buffer,
  );
}
