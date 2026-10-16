// The hub's LED scoreboard (#72): the token and ticket counts as part of the
// room, on the board under the ceiling's neon tube. While a cabinet's screen
// is on, the board shows that cabinet's name and INTERACT TO PLAY instead,
// or, once the cabinet is beaten, its HI and a gold star at the top right;
// facing the prize desk, it shows PRIZE COUNTER and INTERACT (#136); facing
// the change machine, CHANGE MACHINE and its price, blinking after a denied
// trade, or LAST CHANCE after the last-chance token (#144).
// The board itself is in the room image; this lays out and draws its lit
// letters, and lights its marquee's bulbs in a chase (#92)
// (src/ui/tickerArt.ts).

import { imageTicker } from "../engine/assets.ts";
import { sub } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";
import { minigameTitled } from "../game/minigames.ts";
import type { Faced } from "./update.ts";
import { ticketsPerToken } from "./wallet.ts";
import { sweetie } from "../ui/sweetie16.ts";
import {
  bulbLit,
  tickerBulbs,
  tickerGap,
  tickerGlyphHeight,
  tickerGlyphs,
  tickerGlyphX,
  tickerInkOrder,
  tickerLeft,
  tickerRight,
  tickerSpace,
  tickerTextY,
  type Bulb,
  type TickerInk,
} from "../ui/tickerArt.ts";

/** One lit letter: its top-left in hub-image coordinates. */
export interface TickerGlyph {
  ch: string;
  ink: TickerInk;
  x: number;
  y: number;
}

/** What the board shows: the counts, or what the player faces. */
export interface TickerView {
  tokens: number;
  tickets: number;
  faced: Faced | null;
  /** The faced cabinet's HI once it is beaten; null while it is not. */
  beatenHi: number | null;
  /** What the change machine's last press flashes, while it lasts (`State.notice`). */
  notice?: "price" | "lastChance" | null;
  /** The tick, for the blinking price. */
  tick?: number;
}

export const tokensLabel = "TOKENS";
export const ticketsLabel = "TICKETS";
export const freePlay = "FREE PLAY";
export const playPrompt = "INTERACT TO PLAY";
export const prizeCounterLabel = "PRIZE COUNTER";
export const interactPrompt = "INTERACT";
export const changeMachineLabel = "CHANGE MACHINE";
export const changeMachinePrice = `${ticketsPerToken} TICKETS = 1 TOKEN`;
export const lastChanceLabel = "LAST CHANCE";
export const star = "*";
export const hiLabel = "HI";
/** The largest count the board shows; more reads as this. */
export const maxShown = 999_999;

function glyphWidth(ch: string): number {
  if (ch === " ") return tickerSpace;
  const rows = tickerGlyphs[ch];
  if (rows === undefined) throw new Error(`ticker: no glyph for "${ch}"`);
  return rows[0]?.length ?? 0;
}

/** Width of `text` on the board, in pixels. */
export function tickerTextWidth(text: string): number {
  return Array.from(text).reduce((w, ch) => w + glyphWidth(ch) + tickerGap, -tickerGap);
}

/** The lit letters of `text` from `x` (spaces light nothing). */
export function tickerText(text: string, ink: TickerInk, x: number): TickerGlyph[] {
  const out: TickerGlyph[] = [];
  let cx = x;
  for (const ch of text) {
    if (ch !== " ") out.push({ ch, ink, x: cx, y: tickerTextY });
    cx += glyphWidth(ch) + tickerGap;
  }
  return out;
}

/** Where the token count starts: after TOKENS and a space. */
const tokensX = tickerLeft + tickerTextWidth(`${tokensLabel} `) + tickerGap;
/** Where TICKETS starts: far enough left for the largest count after it. */
const ticketsX = tickerRight - tickerTextWidth(`${ticketsLabel}  ${maxShown}`);

const shown = (n: number): string => String(Math.min(maxShown, Math.max(0, Math.trunc(n))));

/** Every lit letter on the board for `v`. */
export function tickerLetters(v: TickerView): TickerGlyph[] {
  if (v.faced === "prizeCounter") return named(prizeCounterLabel, "orange", interactPrompt);
  if (v.faced === "changeMachine") return changeMachineLetters(v.notice ?? null, v.tick ?? 0);
  if (v.faced !== null) {
    const t = minigameTitled(v.faced).titleCard;
    if (v.beatenHi === null) return named(t.text, t.ink, playPrompt);
    const starX = tickerRight - tickerTextWidth(star);
    const hi = shown(v.beatenHi);
    const hiX = starX - tickerSpace - tickerGap - tickerTextWidth(hi);
    return [
      ...tickerText(t.text, t.ink, tickerLeft),
      ...tickerText(hiLabel, "white", hiX - tickerSpace - tickerGap - tickerTextWidth(hiLabel)),
      ...tickerText(hi, "yellow", hiX),
      ...tickerText(star, "yellow", starX),
    ];
  }
  const tickets = shown(v.tickets);
  return [
    ...tickerText(tokensLabel, "orange", tickerLeft),
    ...(v.tokens > 0 ? tickerText(shown(v.tokens), "yellow", tokensX) : tickerText(freePlay, "orange", tokensX)),
    ...tickerText(ticketsLabel, "orange", ticketsX),
    ...tickerText(tickets, "yellow", tickerRight - tickerTextWidth(tickets)),
  ];
}

/** Ticks the denied price stays lit, then dark, as it blinks. */
const blinkStep = 8;

/** The change machine's name, then its price; the price blinks after a denied trade, LAST CHANCE after the last-chance token. */
function changeMachineLetters(notice: "price" | "lastChance" | null, tick: number): TickerGlyph[] {
  if (notice === "lastChance") {
    return [
      ...tickerText(changeMachineLabel, "orange", tickerLeft),
      ...tickerText(lastChanceLabel, "yellow", tickerRight - tickerTextWidth(lastChanceLabel)),
    ];
  }
  if (notice === "price" && Math.trunc(tick / blinkStep) % 2 === 1)
    return tickerText(changeMachineLabel, "orange", tickerLeft);
  return named(changeMachineLabel, "orange", changeMachinePrice);
}

/** `name` at the left in `ink`, `prompt` in white at the right. */
function named(name: string, ink: TickerInk, prompt: string): TickerGlyph[] {
  return [...tickerText(name, ink, tickerLeft), ...tickerText(prompt, "white", tickerRight - tickerTextWidth(prompt))];
}

/** Ticks each step of the bulbs' chase lasts. */
const chaseStep = 8;

/** The marquee's lit bulbs on `tick`: two of every three, the dark one stepping along the ring. */
export function litBulbs(tick: number): Bulb[] {
  const phase = Math.trunc(tick / chaseStep) % 3;
  return tickerBulbs.filter((_, i) => (i + phase) % 3 !== 0);
}

/** One lit letter, top left at (x, y). */
function drawGlyph(screen: Surface, ch: string, ink: TickerInk, x: number, y: number): void {
  const sx = tickerGlyphX[ch] ?? 0;
  const sy = tickerInkOrder.indexOf(ink) * tickerGlyphHeight;
  screen.draw(sub(imageTicker, sx, sy, sx + glyphWidth(ch), sy + tickerGlyphHeight), x, y);
}

/** Light the board's letters and bulbs on `tick`, the hub image drawn at (`buffer`, `buffer`). */
export function drawTicker(screen: Surface, v: TickerView, tick: number, buffer: number): void {
  for (const b of litBulbs(tick)) screen.fillRect(b.x + buffer, b.y + buffer, 1, 1, sweetie[bulbLit]);
  for (const g of tickerLetters({ ...v, tick })) drawGlyph(screen, g.ch, g.ink, g.x + buffer, g.y + buffer);
}

/** `text` in the board's letters, horizontally centred on `cx`, top at `y`: the prize counter cards' prices. */
export function drawTickerTextCentered(screen: Surface, text: string, ink: TickerInk, cx: number, y: number): void {
  for (const g of tickerText(text, ink, cx - Math.trunc(tickerTextWidth(text) / 2)))
    drawGlyph(screen, g.ch, ink, g.x, y);
}
