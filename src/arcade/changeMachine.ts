// The change machine (#144): a machine against the hub's back wall, near the
// prize desk, that exchanges tickets for tokens, one token each time the
// player faces it and presses the action key. It has no menu; the scoreboard
// says what it does (src/arcade/ticker.ts) and the Wallet owns the deal
// (`exchange`). Its position and its look live here only: for now a
// placeholder, a solid block the size of a cabinet; #198 brings its art and
// final spot.

import { sounds } from "../engine/assets.ts";
import type { Surface } from "../engine/surface.ts";
import { sweetie } from "../ui/sweetie16.ts";
import type { Rect } from "./collision.ts";
import type { State } from "./state.ts";

/** The machine in the hub image: solid, and faced from below to use it. */
export const changeMachineRect: Readonly<Rect> = { x: 144, y: 40, w: 16, h: 16 };

/** Draw the placeholder: a block with a darker coin slot, the hub image at (`buffer`, `buffer`). */
export function drawChangeMachine(screen: Surface, buffer: number): void {
  const { x, y, w, h } = changeMachineRect;
  screen.fillRect(x + buffer, y + buffer, w, h, sweetie.t);
  screen.fillRect(x + buffer + w / 2 - 1, y + buffer + 4, 2, 4, sweetie.k);
}

/** Ticks the scoreboard flashes the price or LAST CHANCE after a press of the change machine. */
export const noticeTicks = 120;

/** One press of the change machine: a token for tickets with a blip, or the deny sound and the price blinking. */
export function pressChangeMachine(s: State): void {
  const offer = s.wallet.exchange();
  if (offer === "short") sounds.deny.blip();
  else sounds.select.blip();
  s.notice = offer === "token" ? null : { kind: offer === "short" ? "price" : "lastChance", ticks: noticeTicks };
}

/** Count the notice down; it ends early once the player stops `facing` the machine. */
export function tickNotice(s: State, facing: boolean): void {
  if (s.notice === null) return;
  s.notice.ticks--;
  if (s.notice.ticks <= 0 || !facing) s.notice = null;
}
