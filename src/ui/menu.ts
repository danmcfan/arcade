// Menu drawing shared by the title scene (title menu, hub pause menu) and the
// Game's minigame pause menu and payout: menu items with selection arrows,
// key hints, the controls table, and the dimmed backdrop behind a panel.
// Callers pass where to draw, so the same pieces fit the 192x176 hub and the
// bigger minigame layouts.

import type { Surface } from "../engine/surface.ts";
import { drawKey, drawPanel, drawText, drawTextCentered, keyHeight, keyWidth, textWidth, type Ink } from "./text.ts";

/** Sweetie 16 #1a1c2c at 75%, premultiplied: darkens what is behind a panel. */
export const dimColour = { r: 20, g: 21, b: 33, a: 192 };

/** Darken a rect behind a panel. */
export function dim(screen: Surface, x: number, y: number, w: number, h: number): void {
  screen.fillPremul(x, y, w, h, dimColour);
}

/** How far the selection arrows sit out from their resting place: 0, 1 or 2 px, easing in and out every 40 ticks. */
export function arrowOffset(tick: number): number {
  return Math.round(1 - Math.cos((tick * 2 * Math.PI) / 40));
}

/**
 * Menu items 12 px apart, centred on `centre`; the selected one is yellow
 * between arrows. Items listed in `greyed` can't be chosen right now: they
 * are grey, even when selected.
 */
export function drawMenuItems(
  screen: Surface,
  items: readonly string[],
  cursor: number,
  top: number,
  tick: number,
  centre: number,
  greyed: readonly number[] = [],
): void {
  const off = arrowOffset(tick);
  items.forEach((label, i) => {
    const y = top + i * 12;
    const grey = greyed.includes(i);
    if (i !== cursor) {
      drawTextCentered(screen, label, centre, y, grey ? "grey" : "white");
      return;
    }
    const half = Math.trunc(textWidth(label) / 2);
    drawTextCentered(screen, label, centre, y, grey ? "grey" : "yellow");
    drawText(screen, ">", centre - half - 8 - off, y, "yellow");
    drawText(screen, "<", centre - half + textWidth(label) + 4 + off, y, "yellow");
  });
}

/** A key hint along the bottom of a screen: the keys, then what they do. */
export interface Hint {
  keys: readonly string[];
  label: string;
}

const hintGap = 12;

/** Width of one hint: its keys 1 px apart, a gap, then its label. */
function hintWidth(h: Hint): number {
  return h.keys.reduce((w, k) => w + keyWidth(k) + 1, 0) + 3 + textWidth(h.label);
}

/** Key hints in a row centred on `centre`, with their key tops at `top`. */
export function drawHints(screen: Surface, hints: readonly Hint[], top: number, centre: number): void {
  const width = hints.reduce((w, h) => w + hintWidth(h), 0) + hintGap * (hints.length - 1);
  let x = centre - Math.trunc(width / 2);
  for (const h of hints) {
    for (const key of h.keys) x += drawKey(screen, key, x, top) + 1;
    x += 3;
    drawText(screen, h.label, x, top + 2, "white");
    x += textWidth(h.label) + hintGap;
  }
}

/** One row of a controls table: groups of keys, then what they do. */
export interface ControlRow {
  keys: readonly (readonly string[])[];
  label: string;
}

const controlsRowHeight = 14;

/** The MOVE row every controls table starts with, so its key caps match everywhere. */
export const moveControl: ControlRow = { keys: [["↑", "←", "↓", "→"], ["WASD"]], label: "MOVE" };

/** Height of a controls table with `rows` rows. */
export function controlsHeight(rows: number): number {
  return rows * controlsRowHeight - (controlsRowHeight - keyHeight);
}

/** A controls table with its keys from `left`, its labels from `labelX` and its top edge at `top`. */
export function drawControls(
  screen: Surface,
  rows: readonly ControlRow[],
  left: number,
  labelX: number,
  top: number,
): void {
  rows.forEach((row, r) => {
    const y = top + r * controlsRowHeight;
    let x = left;
    row.keys.forEach((group, g) => {
      if (g > 0) x += 4;
      for (const key of group) x += drawKey(screen, key, x, y) + 1;
    });
    drawText(screen, row.label, labelX, y + 2, "white");
  });
}

/** Back out of a panel: Space or Esc. */
export const panelHints: readonly Hint[] = [{ keys: ["SPACE", "ESC"], label: "BACK" }];

/** Width of the pause panels (hub and minigame), without a note. */
export const pausePanelWidth = 120;
/** Height of a pause panel (hub and minigame) listing `items` items. */
export function pausePanelHeight(items: number): number {
  return 28 + items * 12;
}

/** A note drawn after a menu item, e.g. NO TICKETS beside QUIT GAME. */
export interface ItemNote {
  item: number;
  text: string;
  ink: Ink;
}

/** The note for the first item that has one, drawn orange (QUIT GAME's NO TICKETS). */
export function pauseNote(items: readonly { note?: string }[]): ItemNote | undefined {
  const item = items.findIndex((i) => i.note !== undefined);
  const text = items[item]?.note;
  return text === undefined ? undefined : { item, text, ink: "orange" };
}

/**
 * The PAUSED panel with its top at `y`, centred on `centre`. With a note the
 * panel widens to fit it to the right of its item, and the items move left.
 */
export function drawPausePanel(
  screen: Surface,
  items: readonly string[],
  cursor: number,
  tick: number,
  centre: number,
  y: number,
  note?: ItemNote,
): void {
  const extra = note ? textWidth(note.text) + 12 : 0;
  const w = pausePanelWidth + extra;
  drawPanel(screen, centre - w / 2, y, w, pausePanelHeight(items.length));
  drawTextCentered(screen, "PAUSED", centre, y + 8, "yellow");
  const listCentre = centre - extra / 2;
  drawMenuItems(screen, items, cursor, y + 22, tick, listCentre);
  if (note) {
    const label = items[note.item] ?? "";
    const x = listCentre - Math.trunc(textWidth(label) / 2) + textWidth(label) + 14;
    drawText(screen, note.text, x, y + 22 + note.item * 12, note.ink);
  }
}

/** Width of the controls panel. */
export const controlsPanelWidth = 184;

/** Height of the controls panel around a table of `rows` rows. */
export function controlsPanelHeight(rows: number): number {
  return controlsHeight(rows) + 46;
}

/** The CONTROLS panel with its left edge at `x` and top at `y`, and a Back hint. */
export function drawControlsPanel(screen: Surface, rows: readonly ControlRow[], x: number, y: number): void {
  const w = controlsPanelWidth;
  const h = controlsPanelHeight(rows.length);
  const centre = x + w / 2;
  drawPanel(screen, x, y, w, h);
  drawTextCentered(screen, "CONTROLS", centre, y + 8, "yellow");
  drawControls(screen, rows, x + 8, x + 100, y + 20);
  drawHints(screen, panelHints, y + h - keyHeight - 6, centre);
}
