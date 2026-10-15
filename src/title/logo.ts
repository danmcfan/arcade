// The title logo's animation (#145), as the pixels painted over title-logo.png
// on a tick: a sheen sweeping across the letter faces, a pulse of light
// running along the bar, the game playing on the cabinet's screen with its
// marquee bulbs chasing and buttons flashing, and the lights twinkling in the
// dark behind it all.

import { sweetie } from "../ui/sweetie16.ts";
import {
  titleBackLights,
  titleBar,
  titleButtons,
  titleMarqueeBulbs,
  titleScreenFrames,
  titleScreenSpot,
  titleWord,
  type TitleLayer,
} from "../ui/titleArt.ts";

/** One pixel to paint, in logo (or, for back lights, screen) pixels. */
export interface LogoPixel {
  x: number;
  y: number;
  colour: string;
}

/** Ticks between the starts of two sheens across the word, and how long one takes to cross it. */
export const sheenPeriod = 180;
const sheenTicks = 60;
/** Ticks between the starts of two pulses along the bar, and how long one takes to run it. */
export const pulsePeriod = 120;
const pulseTicks = 80;
/** How far before the word the sheen starts, and past it it ends, in diagonals. */
const sheenRunUp = 6;
const screenFrameTicks = 12;
const bulbTicks = 6;
/** Every `bulbChase`th marquee bulb is lit, the lit ones stepping along each `bulbTicks`. */
const bulbChase = 3;
/** The buttons flash white for `buttonOn` of every `buttonCycle` bulb steps. */
const buttonCycle = 4;
const buttonOn = 2;
/** A back light's blink: on for `lightOn` of every `lightCycle` ticks, glowing between `glowFrom` and `glowUntil`. */
const lightCycle = 90;
const lightOn = 50;
const glowFrom = 15;
const glowUntil = 35;

/** Each letter one step lighter, for the edge of a sheen or pulse. */
const lighter: Readonly<Record<string, string>> = { r: "o", o: "y", y: "w", n: "b", b: "B", B: "c", c: "w" };

const palette: Readonly<Record<string, string>> = sweetie;

function colourOf(letter: string): string {
  const css = palette[letter];
  if (css === undefined) throw new Error(`"${letter}" is not a Sweetie 16 letter`);
  return css;
}

/** A pixel of a layer, in logo pixels, with its Sweetie 16 letter. */
interface LitPixel {
  x: number;
  y: number;
  letter: string;
}

/** Every pixel of `layer` whose letter is one of `letters`. */
function pixelsOf(layer: TitleLayer, letters: string): LitPixel[] {
  return layer.rows.flatMap((row, y) =>
    Array.from(row).flatMap((letter, x) =>
      letters.includes(letter) ? [{ x: layer.x + x, y: layer.y + y, letter }] : [],
    ),
  );
}

const faces = pixelsOf(titleWord, "yor");
const barLights = pixelsOf(titleBar, "cBbn");
const faceSpan = Math.max(...faces.map((p) => p.x + p.y)) - Math.min(...faces.map((p) => p.x + p.y));
const faceStart = Math.min(...faces.map((p) => p.x + p.y));
const barStart = Math.min(...barLights.map((p) => p.x));
const barEnd = Math.max(...barLights.map((p) => p.x));

/**
 * Light falling on `pixels`, each `distance` from its centre: white within 1,
 * a step lighter within `edge`.
 */
function band(pixels: readonly LitPixel[], distance: (p: LitPixel) => number, edge: number): LogoPixel[] {
  return pixels.flatMap((p) => {
    const d = distance(p);
    if (d <= 1) return [{ x: p.x, y: p.y, colour: sweetie.w }];
    const lit = lighter[p.letter];
    return d <= edge && lit !== undefined ? [{ x: p.x, y: p.y, colour: colourOf(lit) }] : [];
  });
}

/** A diagonal band of light across the letter faces. */
function sheen(tick: number): LogoPixel[] {
  const phase = tick % sheenPeriod;
  if (phase >= sheenTicks) return [];
  const lead = faceStart - sheenRunUp + Math.trunc((phase * (faceSpan + 2 * sheenRunUp)) / sheenTicks);
  return band(faces, (p) => Math.abs(p.x + p.y - lead), 3);
}

/** A spot of light running left to right along the bar. */
function pulse(tick: number): LogoPixel[] {
  const phase = tick % pulsePeriod;
  if (phase >= pulseTicks) return [];
  const at = barStart + Math.trunc((phase * (barEnd - barStart)) / pulseTicks);
  return band(barLights, (p) => Math.abs(p.x - at), 5);
}

/** The game on the cabinet's screen, its marquee bulbs chasing and its buttons flashing. */
function cabinet(tick: number): LogoPixel[] {
  const frame = titleScreenFrames[Math.trunc(tick / screenFrameTicks) % titleScreenFrames.length] ?? [];
  const screen = frame.flatMap((row, y) =>
    Array.from(row).map((letter, x) => ({
      x: titleScreenSpot.x + x,
      y: titleScreenSpot.y + y,
      colour: colourOf(letter),
    })),
  );
  const step = Math.trunc(tick / bulbTicks);
  const bulbs = titleMarqueeBulbs.map((b, i) => ({
    x: b.x,
    y: b.y,
    colour: (i + step) % bulbChase === 0 ? sweetie.w : sweetie.y,
  }));
  const buttons = titleButtons.map((b, i) => ({
    x: b.x,
    y: b.y,
    colour: (step + i * buttonOn) % buttonCycle < buttonOn ? sweetie.w : sweetie.r,
  }));
  return [...screen, ...bulbs, ...buttons];
}

export function logoOverlay(tick: number): LogoPixel[] {
  return [...cabinet(tick), ...pulse(tick), ...sheen(tick)];
}

/** The back lights lit on `tick`, in screen pixels: 2x2 bulbs, each with a dim cross of glow at its brightest. */
export function backLights(tick: number): LogoPixel[] {
  return titleBackLights.flatMap((l) => {
    const t = (tick + l.phase) % lightCycle;
    if (t >= lightOn) return [];
    const colour = colourOf(l.colour);
    const bulb = [
      { x: l.x, y: l.y, colour },
      { x: l.x + 1, y: l.y, colour },
      { x: l.x, y: l.y + 1, colour },
      { x: l.x + 1, y: l.y + 1, colour },
    ];
    if (t < glowFrom || t >= glowUntil) return bulb;
    const glow = colourOf(l.colour === "w" ? "l" : "d");
    return bulb.concat([
      { x: l.x - 1, y: l.y, colour: glow },
      { x: l.x + 2, y: l.y + 1, colour: glow },
      { x: l.x + 1, y: l.y - 1, colour: glow },
      { x: l.x, y: l.y + 2, colour: glow },
    ]);
  });
}
