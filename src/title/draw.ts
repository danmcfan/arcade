// Drawing for the title scene: the title menu and its New game check, the
// intro, and the pause and controls panels drawn over the hub. Everything is
// pixel art: font.png and logo.png (src/ui/glyphs.ts).

import { imageArcade, imageLogo } from "../engine/assets.ts";
import type { Surface } from "../engine/surface.ts";
import { drawKey, drawPanel, drawText, drawTextCentered, keyHeight, keyWidth, textWidth } from "../ui/text.ts";
import { newGameIndex, titleMenu } from "./menus.ts";
import type { Title } from "./title.ts";

/** Size of the title screens: the hub's, so nothing jumps when play starts. */
export const screenWidth = 192;
export const screenHeight = 176;
const background = "#1a1c2c";
/** Sweetie 16 #1a1c2c at 75%, premultiplied: darkens what is behind a panel. */
const dimColour = { r: 20, g: 21, b: 33, a: 192 };
const centre = screenWidth / 2;

export const introLines = [
  "THIS ARCADE IS FULL OF LITTLE",
  "GAMES. WALK UP TO A CABINET",
  "TO SEE ITS NAME, THEN PRESS",
  "SPACE TO PLAY IT.",
  "BEAT YOUR HIGH SCORE!",
] as const;

/** One row of the controls table: the keys, then what they do. */
export const controls: readonly { keys: readonly (readonly string[])[]; label: string }[] = [
  { keys: [["↑", "←", "↓", "→"], ["WASD"]], label: "MOVE" },
  { keys: [["SPACE"]], label: "PLAY / ACTION" },
  { keys: [["ESC"]], label: "BACK / PAUSE" },
];

/** A key hint along the bottom of a screen: the keys, then what they do. */
export interface Hint {
  keys: readonly string[];
  label: string;
}

export const menuHints: readonly Hint[] = [
  { keys: ["↑", "↓"], label: "CHOOSE" },
  { keys: ["SPACE"], label: "OK" },
];
export const backHints: readonly Hint[] = [{ keys: ["ESC"], label: "BACK" }];
export const panelHints: readonly Hint[] = [{ keys: ["SPACE", "ESC"], label: "BACK" }];

export const confirmLines = ["START A NEW GAME?", "THIS DELETES YOUR", "SAVED GAME."] as const;

const hintsTop = screenHeight - keyHeight - 6;
const hintGap = 12;

const controlsLeft = 12;
const controlsLabelX = 104;
const controlsRowHeight = 14;
export const controlsHeight = controls.length * controlsRowHeight - (controlsRowHeight - keyHeight);

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
      dim(screen);
      drawPause(screen, t);
      return;
    case "controls":
      t.game!.draw(screen);
      dim(screen);
      drawControlsPanel(screen);
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

function drawMenuItems(screen: Surface, items: readonly string[], cursor: number, top: number, enabled: (i: number) => boolean): void {
  items.forEach((label, i) => {
    const y = top + i * 12;
    if (!enabled(i)) {
      drawTextCentered(screen, label, centre, y, "grey");
      return;
    }
    if (i !== cursor) {
      drawTextCentered(screen, label, centre, y, "white");
      return;
    }
    const half = Math.trunc(textWidth(label) / 2);
    drawTextCentered(screen, label, centre, y, "yellow");
    drawText(screen, ">", centre - half - 9, y, "yellow");
    drawText(screen, "<", centre - half + textWidth(label) + 5, y, "yellow");
  });
}

/** Width of one hint: its keys 1 px apart, a gap, then its label. */
function hintWidth(h: Hint): number {
  return h.keys.reduce((w, k) => w + keyWidth(k) + 1, 0) + 3 + textWidth(h.label);
}

/** Key hints in a centred row with their key tops at `top`, keys drawn as in the controls table. */
export function drawHints(screen: Surface, hints: readonly Hint[], top = hintsTop): void {
  const width = hints.reduce((w, h) => w + hintWidth(h), 0) + hintGap * (hints.length - 1);
  let x = centre - Math.trunc(width / 2);
  for (const h of hints) {
    for (const key of h.keys) x += drawKey(screen, key, x, top) + 1;
    x += 3;
    drawText(screen, h.label, x, top + 2, "white");
    x += textWidth(h.label) + hintGap;
  }
}

/** The logo, the tagline, the title menu with `cursor` selected and the saved high score. */
function drawMenuBody(screen: Surface, t: Title, cursor: number): void {
  fillBackground(screen);
  screen.draw(imageLogo, centre - Math.trunc(imageLogo.w / 2), 34);
  drawTextCentered(screen, "GAMES WITHIN A GAME", centre, 58, "blue");
  drawMenuItems(screen, titleMenu, cursor, 88, (i) => i !== 0 || t.canContinue);
  if (t.savedHighScore) drawTextCentered(screen, `HIGH SCORE ${t.savedHighScore}`, centre, 122, "orange");
}

function drawMenu(screen: Surface, t: Title): void {
  drawMenuBody(screen, t, t.cursor);
  drawHints(screen, menuHints);
}

/** "Start a new game?" in a panel over the dimmed title menu. */
function drawConfirm(screen: Surface, t: Title): void {
  drawMenuBody(screen, t, newGameIndex);
  screen.fillPremul(0, 0, screenWidth, screenHeight, dimColour);
  const w = 152;
  const h = 76;
  const x = centre - w / 2;
  const y = 40;
  drawPanel(screen, x, y, w, h);
  confirmLines.forEach((line, i) => drawTextCentered(screen, line, centre, y + 8 + i * 10, i === 0 ? "yellow" : "white"));
  drawMenuItems(screen, t.items(), t.cursor, y + 44, () => true);
  drawHints(screen, menuHints);
}

function drawIntro(screen: Surface, t: Title): void {
  fillBackground(screen);
  drawTextCentered(screen, "HOW TO PLAY", centre, 10, "yellow");
  introLines.forEach((line, i) => drawTextCentered(screen, line, centre, 26 + i * 10, "white"));
  drawControls(screen, 86);
  if (blinkOn(t)) drawTextCentered(screen, "PRESS SPACE TO START", centre, 146, "yellow");
  drawHints(screen, backHints);
}

/** The controls table with its top edge at `top`. */
export function drawControls(screen: Surface, top: number): void {
  controls.forEach((row, r) => {
    const y = top + r * controlsRowHeight;
    let x = controlsLeft;
    row.keys.forEach((group, g) => {
      if (g > 0) x += 4;
      for (const key of group) x += drawKey(screen, key, x, y) + 1;
    });
    drawText(screen, row.label, controlsLabelX, y + 2, "white");
  });
}

/** The Game's margin around the hub image, which stays transparent. */
const hubMargin = (screenWidth - imageArcade.w) / 2;

/** Darken the hub image behind a panel. */
function dim(screen: Surface): void {
  screen.fillPremul(hubMargin, hubMargin, imageArcade.w, imageArcade.h, dimColour);
}

function drawPause(screen: Surface, t: Title): void {
  const w = 120;
  const h = 64;
  const x = centre - w / 2;
  const y = 56;
  drawPanel(screen, x, y, w, h);
  drawTextCentered(screen, "PAUSED", centre, y + 8, "yellow");
  drawMenuItems(screen, t.items(), t.cursor, y + 22, () => true);
}

function drawControlsPanel(screen: Surface): void {
  const x = 4;
  const y = 40;
  const w = screenWidth - 8;
  const h = controlsHeight + 46;
  drawPanel(screen, x, y, w, h);
  drawTextCentered(screen, "CONTROLS", centre, y + 8, "yellow");
  drawControls(screen, y + 20);
  drawHints(screen, panelHints, y + h - keyHeight - 6);
}
