// Drawing for the title scene: the title menu and its New game check, the
// intro, and the pause and controls panels drawn over the hub. Everything is
// pixel art: font.png and logo.png (src/ui/glyphs.ts).

import { imageArcade, imageLogo } from "../engine/assets.ts";
import { sub } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";
import { blinkOn } from "../ui/blink.ts";
import { logoGap, logoLetters, logoShadow, logoWord } from "../ui/glyphs.ts";
import {
  dim,
  dimColour,
  drawMenuItems,
  drawPausePanel,
  drawStackedControls,
  drawControlsPanel,
  standardControls,
} from "../ui/menu.ts";
import { drawPanel, drawTextCentered, textHeight } from "../ui/text.ts";
import type { Title } from "./title.ts";

/** Size of the title screens: the hub's, so nothing jumps when play starts. */
export const screenWidth = 192;
export const screenHeight = 176;
const background = "#1a1c2c";
const centre = screenWidth / 2;

export const introLines = [
  "PLAY GAMES TO WIN TICKETS.",
  "SPEND TICKETS TO EARN PRIZES.",
  "USE PRIZES TO BEAT HIGH SCORES.",
  "BEAT ALL HIGH SCORES TO WIN!",
] as const;

export const confirmLines = ["START A NEW GAME?", "THIS DELETES YOUR", "SAVED GAME."] as const;

export function draw(screen: Surface, t: Title): void {
  switch (t.phase) {
    case "menu":
      drawMenu(screen, t);
      return;
    case "confirm":
      drawConfirm(screen, t);
      return;
    case "intro":
      drawIntro(screen, t);
      return;
    case "playing":
      t.hostedGame().draw(screen);
      return;
    case "paused":
      t.hostedGame().draw(screen);
      dimHub(screen);
      drawPausePanel(screen, t.items(), t.cursor, t.tick, centre, 56);
      return;
    case "controls":
      t.hostedGame().draw(screen);
      dimHub(screen);
      drawControlsPanel(screen, standardControls, 4, 30);
  }
}

function fillBackground(screen: Surface): void {
  screen.fillRect(0, 0, screenWidth, screenHeight, background);
}

/** The rows of logo letter `ch`; every letter of `logoWord` has them. */
function letterRows(ch: string): readonly string[] {
  const rows = logoLetters[ch];
  if (rows === undefined) throw new Error(`no logo letter "${ch}"`);
  return rows;
}

function firstRowWidth(rows: readonly string[]): number {
  const row = rows[0];
  if (row === undefined) throw new Error("logo letter has no rows");
  return row.length;
}

const logoLetterWidth = firstRowWidth(letterRows("A"));
/** Ticks between the starts of two rainbow sweeps across the logo. */
const sweepPeriod = 180;
/** Ticks the sweep takes to cross the logo; it starts off the left edge. */
const sweepTicks = 70;
/** The sweep's diagonal stripes, leading edge first (Sweetie 16), each `stripeWidth` px wide. */
const sweepColours = ["#41a6f6", "#73eff7", "#f4f4f4", "#a7f070", "#38b764"] as const;
const stripeWidth = 2;

/** Each logo letter's rise above its resting row, a wave running left to right. */
export function logoBob(tick: number, letter: number): number {
  return Math.round(Math.sin(tick * 0.07 - letter * 0.7) * 1.4);
}

/**
 * ARCADE with each letter bobbing on a wave, and every few seconds a rainbow
 * of diagonal stripes sweeping across the letters (not their shadow).
 */
function drawLogo(screen: Surface, left: number, top: number, tick: number): void {
  const phase = tick % sweepPeriod;
  // Leading stripe's diagonal (x + y); off the logo between sweeps.
  const band = sweepColours.length * stripeWidth;
  const span = imageLogo.w + 15 + band;
  const lead = phase < sweepTicks ? Math.trunc((phase * span) / sweepTicks) : -1;
  Array.from(logoWord).forEach((ch, i) => {
    const ox = i * (logoLetterWidth + logoGap);
    const x = left + ox;
    const y = top - logoBob(tick, i);
    screen.draw(sub(imageLogo, ox, 0, ox + logoLetterWidth + logoShadow[0], imageLogo.h), x, y);
    if (lead < 0) return;
    letterRows(ch).forEach((row, ry) => {
      Array.from(row).forEach((px, rx) => {
        const d = lead - (ox + rx + ry);
        const colour = sweepColours[Math.trunc(d / stripeWidth)];
        if (px === "#" && d >= 0 && colour !== undefined) screen.fillRect(x + rx, y + ry, 1, 1, colour);
      });
    });
  });
}

/** Pixels from the logo to the tagline, and from the tagline to the menu. */
const taglineGap = 8;
const menuGap = 16;
/** Pixels from one menu item's top to the next (drawMenuItems). */
const menuRow = 12;

/**
 * The logo, the tagline and the title menu with `cursor` selected, as one
 * block centred on the screen both ways.
 */
function drawMenuBody(screen: Surface, t: Title, cursor: number): void {
  fillBackground(screen);
  const items = t.menuItems();
  const menuHeight = (items.length - 1) * menuRow + textHeight;
  const height = imageLogo.h + taglineGap + textHeight + menuGap + menuHeight;
  const top = Math.trunc((screenHeight - height) / 2);
  const tagline = top + imageLogo.h + taglineGap;
  drawLogo(screen, centre - Math.trunc(imageLogo.w / 2), top, t.tick);
  drawTextCentered(screen, "GAMES WITHIN A GAME", centre, tagline, "blue");
  drawMenuItems(screen, items, cursor, tagline + textHeight + menuGap, t.tick, centre);
}

function drawMenu(screen: Surface, t: Title): void {
  drawMenuBody(screen, t, t.cursor);
}

/** "Start a new game?" in a panel over the dimmed title menu. */
function drawConfirm(screen: Surface, t: Title): void {
  drawMenuBody(screen, t, t.menuCursor);
  screen.fillPremul(0, 0, screenWidth, screenHeight, dimColour);
  const w = 152;
  const h = 76;
  const x = centre - w / 2;
  const y = (screenHeight - h) / 2;
  drawPanel(screen, x, y, w, h);
  confirmLines.forEach((line, i) => {
    drawTextCentered(screen, line, centre, y + 8 + i * 10, i === 0 ? "yellow" : "white");
  });
  drawMenuItems(screen, t.items(), t.cursor, y + 44, t.tick, centre);
}

/** Top of the intro's INTERACT TO START prompt. */
export const introPromptTop = 156;

function drawIntro(screen: Surface, t: Title): void {
  fillBackground(screen);
  drawTextCentered(screen, "HOW TO PLAY", centre, 10, "yellow");
  introLines.forEach((line, i) => {
    drawTextCentered(screen, line, centre, 24 + i * 10, "white");
  });
  drawStackedControls(screen, standardControls, centre, 86);
  if (blinkOn(t.tick)) drawTextCentered(screen, "INTERACT TO START", centre, introPromptTop, "yellow");
}

/** The Game's margin around the hub image, which stays transparent. */
const hubMargin = (screenWidth - imageArcade.w) / 2;

/** Darken the hub image behind a panel. */
function dimHub(screen: Surface): void {
  dim(screen, hubMargin, hubMargin, imageArcade.w, imageArcade.h);
}
