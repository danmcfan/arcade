// Drawing for the title scene: the title menu and its New game check, the
// intro, and the pause and controls panels drawn over the hub. Everything is
// pixel art: font.png (src/ui/glyphs.ts) and title-logo.png (src/ui/titleArt.ts).

import { imageArcade, imageTitleLogo } from "../engine/assets.ts";
import type { Surface } from "../engine/surface.ts";
import {
  dim,
  dimColour,
  drawControls,
  drawControlsPanel,
  drawHints,
  drawMenuItems,
  drawPausePanel,
  moveControl,
  type ControlRow,
  type Hint,
} from "../ui/menu.ts";
import { drawPanel, drawTextCentered, keyHeight } from "../ui/text.ts";
import { backLights, logoOverlay } from "./logo.ts";
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
      drawControlsPanel(screen, controls, 4, 40);
  }
}

/** Blinking prompts show for 40 of every 60 ticks. */
function blinkOn(t: Title): boolean {
  return t.tick % 60 < 40;
}

function fillBackground(screen: Surface): void {
  screen.fillRect(0, 0, screenWidth, screenHeight, background);
}

/** The title logo with its animation on `tick` (src/title/logo.ts), its top-left at (left, top), the back lights behind it. */
function drawLogo(screen: Surface, left: number, top: number, tick: number): void {
  for (const p of backLights(tick)) screen.fillRect(p.x, p.y, 1, 1, p.colour);
  screen.draw(imageTitleLogo, left, top);
  for (const p of logoOverlay(tick)) screen.fillRect(left + p.x, top + p.y, 1, 1, p.colour);
}

/** The logo, the tagline, the title menu with `cursor` selected and the saved high score. */
function drawMenuBody(screen: Surface, t: Title, cursor: number): void {
  fillBackground(screen);
  drawLogo(screen, centre - Math.trunc(imageTitleLogo.w / 2), 2, t.tick);
  drawTextCentered(screen, "GAMES WITHIN A GAME", centre, 80, "blue");
  drawMenuItems(screen, t.menuItems(), cursor, 98, t.tick, centre);
  const highScore = t.savedHighScore;
  if (highScore !== null && highScore !== 0) drawTextCentered(screen, `HIGH SCORE ${highScore}`, centre, 130, "orange");
}

function drawMenu(screen: Surface, t: Title): void {
  drawMenuBody(screen, t, t.cursor);
  drawHints(screen, menuHints, hintsTop, centre);
}

/** "Start a new game?" in a panel over the dimmed title menu. */
function drawConfirm(screen: Surface, t: Title): void {
  drawMenuBody(screen, t, t.menuCursor);
  screen.fillPremul(0, 0, screenWidth, screenHeight, dimColour);
  const w = 152;
  const h = 76;
  const x = centre - w / 2;
  const y = 40;
  drawPanel(screen, x, y, w, h);
  confirmLines.forEach((line, i) => {
    drawTextCentered(screen, line, centre, y + 8 + i * 10, i === 0 ? "yellow" : "white");
  });
  drawMenuItems(screen, t.items(), t.cursor, y + 44, t.tick, centre);
  drawHints(screen, menuHints, hintsTop, centre);
}

function drawIntro(screen: Surface, t: Title): void {
  fillBackground(screen);
  drawTextCentered(screen, "HOW TO PLAY", centre, 10, "yellow");
  introLines.forEach((line, i) => {
    drawTextCentered(screen, line, centre, 26 + i * 10, "white");
  });
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
