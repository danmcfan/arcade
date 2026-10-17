// The change machine (#144): a machine in the middle of the hub's right side
// wall, facing left into the room, that exchanges tickets for tokens, one token each time the
// player faces it and presses the action key. It has no menu; the scoreboard
// says what it does (src/arcade/ticker.ts) and the Wallet owns the deal
// (`exchange`). Its position and its look live here only: the owner's 16x32
// sprite (#198, src/ui/changeMachineArt.ts), square against the right wall on
// the 16 px grid, its bottom 16 rows on the solid spot and the rest rising
// above it, so the player can walk behind its top.

import { sounds } from "../engine/assets.ts";
import type { Surface } from "../engine/surface.ts";
import { imageChangeMachine } from "../engine/assets.ts";
import { changeMachineHeight } from "../ui/changeMachineArt.ts";
import type { Rect } from "./collision.ts";
import type { State } from "./state.ts";

/** The machine in the hub image: solid, and faced from the left to use it. */
export const changeMachineRect: Readonly<Rect> = { x: 144, y: 88, w: 16, h: 16 };

/** Draw the machine standing on its spot, the hub image at (`buffer`, `buffer`). */
export function drawChangeMachine(screen: Surface, buffer: number): void {
  const { x, y, h } = changeMachineRect;
  screen.draw(imageChangeMachine, x + buffer, y + h - changeMachineHeight + buffer);
}

/** Whether a player whose feet are at `feetY` stands in front of the machine, so is drawn over it. */
export function inFrontOfChangeMachine(feetY: number): boolean {
  return feetY > changeMachineRect.y + changeMachineRect.h;
}

/** What a press that did not hand over a token flashes on the scoreboard. */
export type NoticeKind = "price" | "lastChance";

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
