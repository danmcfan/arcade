// The change machine (#144): a machine against the hub's back wall, near the
// prize desk, that exchanges tickets for tokens, one token each time the
// player faces it and presses the action key. It has no menu; the scoreboard
// says what it does (src/arcade/ticker.ts) and the Wallet owns the deal
// (`exchange`). Its position and its look live here only: for now a
// placeholder, a solid block the size of a cabinet; #198 brings its art and
// final spot.

import type { Surface } from "../engine/surface.ts";
import { sweetie } from "../ui/sweetie16.ts";
import type { Rect } from "./collision.ts";

/** The machine in the hub image: solid, and faced from below to use it. */
export const changeMachineRect: Readonly<Rect> = { x: 144, y: 40, w: 16, h: 16 };

/** Draw the placeholder: a block with a darker coin slot, the hub image at (`buffer`, `buffer`). */
export function drawChangeMachine(screen: Surface, buffer: number): void {
  const { x, y, w, h } = changeMachineRect;
  screen.fillRect(x + buffer, y + buffer, w, h, sweetie.t);
  screen.fillRect(x + buffer + w / 2 - 1, y + buffer + 4, 2, 4, sweetie.k);
}
