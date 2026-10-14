// The menu icons (a coin and a ticket, src/ui/icons.ts) as sprites. The hub's
// counts are no longer an overlay in the margin: they are on the LED
// scoreboard in the room (src/arcade/ticker.ts, #72).

import { imageIcons } from "../engine/assets.ts";
import { sub } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";
import { iconRects, type IconName } from "./icons.ts";

/** An icon with its top-left corner at `x, y`. */
export function drawIcon(screen: Surface, name: IconName, x: number, y: number): void {
  const r = iconRects[name];
  screen.draw(sub(imageIcons, r.x, 0, r.x + r.w, r.h), x, y);
}
