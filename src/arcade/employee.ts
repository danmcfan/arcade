// The prize desk's employee (#75, redrawn in #91): stands still behind the
// desk, back to us, facing the player (src/ui/employeeArt.ts).

import { imageEmployee } from "../engine/assets.ts";
import type { Surface } from "../engine/surface.ts";
import { employeeSpot } from "./desk.ts";

/** Draw the employee at their spot, the hub image drawn at (`buffer`, `buffer`). */
export function drawEmployee(screen: Surface, buffer: number): void {
  screen.draw(imageEmployee, employeeSpot.x + buffer, employeeSpot.y + buffer);
}
