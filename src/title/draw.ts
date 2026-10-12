// Drawing for the title scene: the title menu, the intro, and the pause and
// controls panels drawn over the hub. Everything is pixel art: font.png and
// logo.png (src/ui/glyphs.ts) plus a crop of the hub and its player sprite.

import { imageArcade, imageGamer, imageLogo } from "../engine/assets.ts";
import { sub } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";
import { drawKey, drawPanel, drawText, drawTextCentered, keyHeight, textWidth } from "../ui/text.ts";
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
export const controls: readonly { keys: readonly (readonly string[])[]; label: string }[] = [
  { keys: [["↑", "←", "↓", "→"], ["WASD"]], label: "MOVE" },
  { keys: [["SPACE"]], label: "PLAY / ACTION" },
  { keys: [["ESC"]], label: "BACK / PAUSE" },
];

const controlsLeft = 12;
const controlsLabelX = 104;
const controlsRowHeight = 14;
export const controlsHeight = controls.length * controlsRowHeight - (controlsRowHeight - keyHeight);

export function draw(screen: Surface, t: Title): void {
  switch (t.phase) {
    case "menu":
      drawMenu(screen, t);
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

/** The hub's cabinets with the player facing the middle one. */
function drawScene(screen: Surface, x: number, y: number): void {
  screen.draw(sub(imageArcade, 32, 36, 128, 84), x, y);
  // Player frame 0, facing up (sprite-sheet row 0), centred at hub (80, 72).
  screen.draw(sub(imageGamer, 0, 0, 16, 24), x + 80 - 32 - 8, y + 72 - 36 - 12);
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

function drawMenu(screen: Surface, t: Title): void {
  fillBackground(screen);
  screen.draw(imageLogo, centre - Math.trunc(imageLogo.w / 2), 14);
  drawTextCentered(screen, "GAMES WITHIN A GAME", centre, 36, "blue");
  drawScene(screen, centre - 48, 50);
  drawMenuItems(screen, t.items(), t.cursor, 108, (i) => i !== 1 || t.canContinue);
  if (t.savedHighScore) drawTextCentered(screen, `HIGH SCORE ${t.savedHighScore}`, centre, 138, "orange");
  drawTextCentered(screen, "↑↓ CHOOSE   SPACE OK", centre, 160, "grey");
}

function drawIntro(screen: Surface, t: Title): void {
  fillBackground(screen);
  drawTextCentered(screen, "HOW TO PLAY", centre, 10, "yellow");
  introLines.forEach((line, i) => drawTextCentered(screen, line, centre, 26 + i * 10, "white"));
  drawControls(screen, 86);
  if (blinkOn(t)) drawTextCentered(screen, "PRESS SPACE TO START", centre, 146, "yellow");
  drawTextCentered(screen, "ESC BACK", centre, 160, "grey");
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

/** Darken the hub image behind a panel (Sweetie 16 #1a1c2c at 75%, premultiplied). */
function dim(screen: Surface): void {
  screen.fillPremul(hubMargin, hubMargin, imageArcade.w, imageArcade.h, { r: 20, g: 21, b: 33, a: 192 });
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
  const h = controlsHeight + 40;
  drawPanel(screen, x, y, w, h);
  drawTextCentered(screen, "CONTROLS", centre, y + 8, "yellow");
  drawControls(screen, y + 20);
  drawTextCentered(screen, "SPACE / ESC BACK", centre, y + h - 13, "grey");
}
