// Drawing for the title scene: the title menu and its New game check, the
// intro, and the pause and controls panels drawn over the hub. Everything is
// pixel art: font.png and logo.png (src/ui/glyphs.ts).

import { imageArcade, imageLogo } from "../engine/assets.ts";
import { sub } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";
import { logoGap, logoLetters, logoShadow, logoWord } from "../ui/glyphs.ts";
import { dim, dimColour, drawControls, drawControlsPanel, drawHints, drawMenuItems, drawPausePanel, moveControl, type ControlRow, type Hint } from "../ui/menu.ts";
import { drawPanel, drawTextCentered, keyHeight } from "../ui/text.ts";
import type { Title } from "./title.ts";

/** Size of the title screens: the hub's, so nothing jumps when play starts. */
export const screenWidth = 192;
export const screenHeight = 176;
const background = "#1a1c2c";
const centre = screenWidth / 2;

export const introLines = [
  "THIS ARCADE IS FULL OF LITTLE",
  "GAMES. WALK UP TO A CABINET",
  "TO SEE ITS NAME, THEN PRESS",
  "SPACE TO PLAY IT.",
  "BEAT YOUR HIGH SCORE!",
] as const;

/** One row of the controls table: the keys, then what they do. */
export const controls: readonly ControlRow[] = [
  moveControl,
  { keys: [["SPACE"]], label: "PLAY / ACTION" },
  { keys: [["ESC"]], label: "BACK / PAUSE" },
];

export const menuHints: readonly Hint[] = [
  { keys: ["↑", "↓"], label: "CHOOSE" },
  { keys: ["SPACE"], label: "OK" },
];
export const backHints: readonly Hint[] = [{ keys: ["ESC"], label: "BACK" }];

export const confirmLines = ["START A NEW GAME?", "THIS DELETES YOUR", "SAVED GAME."] as const;

const hintsTop = screenHeight - keyHeight - 6;

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
      t.game!.draw(screen);
      return;
    case "paused":
      t.game!.draw(screen);
      dimHub(screen);
      drawPausePanel(screen, t.items(), t.cursor, t.tick, centre, 56);
      return;
    case "controls":
      t.game!.draw(screen);
      dimHub(screen);
      drawControlsPanel(screen, controls, 4, 40);
      return;
  }
}

/** Blinking prompts show for 40 of every 60 ticks. */
function blinkOn(t: Title): boolean {
  return t.tick % 60 < 40;
}

function fillBackground(screen: Surface): void {
  screen.fillRect(0, 0, screenWidth, screenHeight, background);
}

const logoLetterWidth = logoLetters["A"]![0]!.length;
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
  [...logoWord].forEach((ch, i) => {
    const ox = i * (logoLetterWidth + logoGap);
    const x = left + ox;
    const y = top - logoBob(tick, i);
    screen.draw(sub(imageLogo, ox, 0, ox + logoLetterWidth + logoShadow[0], imageLogo.h), x, y);
    if (lead < 0) return;
    logoLetters[ch]!.forEach((row, ry) => {
      [...row].forEach((px, rx) => {
        const d = lead - (ox + rx + ry);
        if (px === "#" && d >= 0 && d < band) screen.fillRect(x + rx, y + ry, 1, 1, sweepColours[Math.trunc(d / stripeWidth)]!);
      });
    });
  });
}

/** The logo, the tagline, the title menu with `cursor` selected and the saved high score. */
function drawMenuBody(screen: Surface, t: Title, cursor: number): void {
  fillBackground(screen);
  drawLogo(screen, centre - Math.trunc(imageLogo.w / 2), 34, t.tick);
  drawTextCentered(screen, "GAMES WITHIN A GAME", centre, 58, "blue");
  drawMenuItems(screen, t.menuItems(), cursor, 88, t.tick, centre);
  if (t.savedHighScore) drawTextCentered(screen, `HIGH SCORE ${t.savedHighScore}`, centre, 122, "orange");
}

function drawMenu(screen: Surface, t: Title): void {
  drawMenuBody(screen, t, t.cursor);
  drawHints(screen, menuHints, hintsTop, centre);
}

/** "Start a new game?" in a panel over the dimmed title menu. */
function drawConfirm(screen: Surface, t: Title): void {
  drawMenuBody(screen, t, t.newGameIndex);
  screen.fillPremul(0, 0, screenWidth, screenHeight, dimColour);
  const w = 152;
  const h = 76;
  const x = centre - w / 2;
  const y = 40;
  drawPanel(screen, x, y, w, h);
  confirmLines.forEach((line, i) => drawTextCentered(screen, line, centre, y + 8 + i * 10, i === 0 ? "yellow" : "white"));
  drawMenuItems(screen, t.items(), t.cursor, y + 44, t.tick, centre);
  drawHints(screen, menuHints, hintsTop, centre);
}

function drawIntro(screen: Surface, t: Title): void {
  fillBackground(screen);
  drawTextCentered(screen, "HOW TO PLAY", centre, 10, "yellow");
  introLines.forEach((line, i) => drawTextCentered(screen, line, centre, 26 + i * 10, "white"));
  drawControls(screen, controls, 12, 104, 86);
  if (blinkOn(t)) drawTextCentered(screen, "PRESS SPACE TO START", centre, 146, "yellow");
  drawHints(screen, backHints, hintsTop, centre);
}

/** The Game's margin around the hub image, which stays transparent. */
const hubMargin = (screenWidth - imageArcade.w) / 2;

/** Darken the hub image behind a panel. */
function dimHub(screen: Surface): void {
  dim(screen, hubMargin, hubMargin, imageArcade.w, imageArcade.h);
}
