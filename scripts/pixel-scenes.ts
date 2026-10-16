// The game screens `bun run pixel preview` draws each option into. A scene
// renders from the art modules as they are at call time, so preview swaps an
// option into its export and calls the scene again. A scene is one image per
// game tick (60 a second), so its animations play in the preview as in the
// game. Add a scene here when prototyped art belongs to a screen none of these
// draw. A scene with `play` also opens in the real game from `bun run pixel
// play` (scripts/pixel-play.ts).

import type { PNG } from "pngjs";
import type { Direction } from "../src/engine/input.ts";
import { employeeSpot } from "../src/arcade/desk.ts";
import { prizes } from "../src/arcade/prizes.ts";
import { newScreen, screenFrame, updateScreen } from "../src/arcade/screen.ts";
import { powerCabinetX, powerFrameHeight, powerFrameWidth, powerSheetRows } from "../src/ui/hubArt.ts";
import { employeeRows, hubCabinets, hubRoomRows } from "./gen-ui-art.ts";
import { blank, mirrorX, paint, plot, recolour, toPng, type Rows } from "./pixel-art.ts";
import { playerFrames, playerFramesFor } from "../src/ui/playerArt.ts";
import { flowers } from "../src/sweet-sam/art.ts";
import { sweetie } from "../src/ui/sweetie16.ts";
import { saveKey, saveVersion } from "../src/title/save.ts";
import { noHighScores, Wallet } from "../src/arcade/wallet.ts";
import { tickerText, tickerTextWidth } from "../src/arcade/ticker.ts";
import { cardHeight, cardPriceY, cardTop, cardWidth, counterLayout, pictureHeight } from "../src/game/counterLayout.ts";
import { closeCursor, prizeCounterItems, shelf } from "../src/game/menus.ts";
import { cardInks } from "../src/game/overlay.ts";
import { glyphs, glyphWidth, inks, type Ink } from "../src/ui/glyphs.ts";
import { arrowOffset } from "../src/ui/menu.ts";
import { textWidth } from "../src/ui/text.ts";
import { nineSlice } from "../src/ui/nineSlice.ts";
import { cardArt, cardCorner, panelCorner, panelFrame } from "../src/ui/panelArt.ts";
import { greyLetters, mirroredPrizes, prizeArt } from "../src/ui/prizeArt.ts";
import { tickerGlyphs, tickerInks, tickerRect } from "../src/ui/tickerArt.ts";
import { titleBar, titleCabinet, titleWord } from "../src/ui/titleArt.ts";
import { backLights, logoOverlay, sheenPeriod } from "../src/title/logo.ts";

/** One game screen: which art sources it draws, and how to render it. */
export interface Scene {
  name: string;
  /** Repo-relative art source files whose exports this screen shows. */
  sources: readonly string[];
  /** The screen on each tick of one loop. */
  render: () => PNG[];
  /** Where the playable game opens: its query after `?debug&`, and the localStorage it starts with. */
  play?: { query: string; storage: Readonly<Record<string, string>> };
}

/** Ticks per walk frame: the player's `frameIncrement` of 0.1 (src/arcade/entity.ts). */
const ticksPerStep = 10;
/** The facings the player walks in place through, one walk cycle each. */
const walkOrder: readonly Direction[] = ["DOWN", "LEFT", "UP", "RIGHT"];

/** The player walking in place in front of the middle cabinet, drawn from `playerFramesFor` on `tick`. */
function withPlayer(room: PNG, tick: number): PNG {
  const step = Math.trunc(tick / ticksPerStep);
  const dir = walkOrder[Math.trunc(step / playerFrames) % walkOrder.length] ?? "DOWN";
  paint(room, playerFramesFor(dir)[step % playerFrames] ?? [], sweetie, 72, 66);
  return room;
}

/** Ticks the hub spends in each part of its loop: dark, switched on, then dark again after switching off. */
const hubLoop = { off: 40, on: 80, after: 40 } as const;

/**
 * The hub room with the employee behind the desk, the player walking in
 * place in front of the middle cabinet through each facing as its screen
 * switches on and off on the game's own timing (src/arcade/screen.ts), drawn
 * from screens.png's frames (`powerSheetRows`).
 */
function hubFrames(decorate: (room: PNG) => void = () => {}): PNG[] {
  const cabinets = hubCabinets();
  const room = hubRoomRows();
  const sheet = powerSheetRows(cabinets);
  const row = Math.trunc(cabinets.length / 2);
  const cabinet = cabinets[row];
  if (cabinet === undefined) throw new Error("the hub has no cabinets");
  const screen = newScreen();
  const frames: PNG[] = [];
  for (let tick = 0; tick < hubLoop.off + hubLoop.on + hubLoop.after; tick++) {
    updateScreen(screen, tick >= hubLoop.off && tick < hubLoop.off + hubLoop.on);
    const png = toPng(room);
    paint(png, employeeRows(), sweetie, employeeSpot.x, employeeSpot.y);
    const column = screenFrame(screen);
    if (column !== null) {
      const cell = sheet
        .slice(row * powerFrameHeight, (row + 1) * powerFrameHeight)
        .map((r) => r.slice(column * powerFrameWidth, (column + 1) * powerFrameWidth));
      paint(png, cell, sweetie, cabinet.rect.x - powerCabinetX, cabinet.rect.y);
    }
    decorate(png);
    frames.push(withPlayer(png, tick));
  }
  return frames;
}

/** Every prize's decoration on the wall where it hangs, as if the player owned them all. */
function paintPrizes(room: PNG): void {
  for (const p of prizes) {
    const rows = prizeArt[p.id];
    paint(room, mirroredPrizes.has(p.id) ? mirrorX(rows) : rows, sweetie, p.x, p.y);
  }
}

/** Sweet Sam's level counter on the black maze: every bonus flower in level order, one frame, 8 px apart. */
function flowerRow(): PNG[] {
  const gap = 8;
  const png = blank(gap + flowers.length * (16 + gap), 32);
  paint(
    png,
    Array.from({ length: 32 }, () => "k".repeat(png.width)),
    sweetie,
  );
  flowers.forEach((f, i) => {
    paint(png, f, sweetie, gap + i * (16 + gap), 8);
  });
  return [png];
}

/** `frame` (rows with `corner` px corners) painted at (x, y), `w`×`h`, as the game's nine-slice draws it. */
function paintNineSlice(png: PNG, frame: Rows, corner: number, x: number, y: number, w: number, h: number): void {
  for (const c of nineSlice(frame[0]?.length ?? 0, frame.length, corner, w, h)) {
    const cell = frame.slice(c.sy, c.sy + c.h).map((r) => r.slice(c.sx, c.sx + c.w));
    paint(png, cell, sweetie, x + c.dx, y + c.dy);
  }
}

/** `text` in the game font and `ink`, top left at (x, y), as drawText draws it. */
function paintText(png: PNG, text: string, x: number, y: number, ink: Ink): number {
  let cx = x;
  for (const ch of text.toUpperCase()) {
    const rows = glyphs[ch];
    if (rows === undefined) continue;
    paint(png, rows, { "#": inks[ink] }, cx, y);
    cx += glyphWidth(ch) + 1;
  }
  return cx - x - 1;
}

/** Ticks the prize counter's cursor rests on each item. */
const ticksPerItem = 30;

/**
 * The prize counter menu over the hub, as the game draws it (src/game/overlay.ts,
 * `counterLayout`), for a player with 75 tickets who owns one 25-ticket prize:
 * cards for sale, too dear and owned. The cursor rests on each card, then
 * CLOSE.
 */
function prizeCounterFrames(): PNG[] {
  const owned = shelf.at(-1)?.id;
  const wallet = new Wallet({
    highScores: noHighScores,
    tokens: 3,
    tickets: 75,
    arcadeWon: false,
    prizes: owned === undefined ? [] : [owned],
  });
  const items = prizeCounterItems(wallet, () => {
    // The scene never chooses CLOSE.
  });
  const below = tickerRect.y + tickerRect.h;
  const layout = counterLayout({ x: 0, y: below, w: 160, h: 144 - below });
  const { panel } = layout;
  const frames: PNG[] = [];
  for (let tick = 0; tick < items.length * ticksPerItem; tick++) {
    const cursor = Math.trunc(tick / ticksPerItem);
    const png = toPng(hubRoomRows());
    paintNineSlice(png, panelFrame, panelCorner, panel.x, panel.y, panel.w, panel.h);
    layout.cards.forEach((card, i) => {
      const prize = shelf[i];
      const item = items[i];
      if (prize === undefined || item === undefined) return;
      const offer = item.inert === true ? "owned" : item.enabled ? "buy" : "short";
      paintNineSlice(png, cardArt[offer], cardCorner, card.x, card.y, cardWidth, cardHeight);
      if (i === cursor) paintNineSlice(png, cardArt.cursor, cardCorner, card.x, card.y, cardWidth, cardHeight);
      const rows = mirroredPrizes.has(prize.id) ? mirrorX(prizeArt[prize.id]) : prizeArt[prize.id];
      const picture = offer === "owned" ? recolour(rows, greyLetters) : rows;
      const centre = card.x + cardWidth / 2;
      const w = picture[0]?.length ?? 0;
      paint(png, picture, sweetie, centre - Math.trunc(w / 2), card.y + cardTop + pictureHeight - picture.length);
      for (const g of tickerText(
        item.value ?? "",
        cardInks[offer],
        centre - Math.trunc(tickerTextWidth(item.value ?? "") / 2),
      )) {
        const glyph = tickerGlyphs[g.ch] ?? [];
        paint(png, glyph, { "#": sweetie[tickerInks[g.ink]] }, g.x, card.y + cardPriceY);
      }
    });
    for (const [at, centre] of [[closeCursor, layout.closeCentre]] as const) {
      const item = items[at];
      if (item === undefined) continue;
      const left = Math.round(centre - Math.trunc(textWidth(item.label) / 2));
      const ink: Ink = item.enabled ? (cursor === at ? "yellow" : "white") : "grey";
      paintText(png, item.label, left, layout.rowY, ink);
      if (cursor === at) paintText(png, ">", left - 8 + arrowOffset(tick) - 1, layout.rowY, "yellow");
    }
    const info = items[cursor];
    if (info !== undefined) {
      const price = info.value ?? "";
      paintText(png, info.label, layout.infoLeft, layout.infoTop, "white");
      paintText(png, price, layout.infoRight - textWidth(price), layout.infoTop, "white");
      paintText(png, info.note ?? "", layout.infoLeft, layout.infoTop + 9, "white");
    }
    frames.push(png);
  }
  return frames;
}

/** The title screen's top: the logo on the background, animating through one sheen (src/title/draw.ts). */
function titleTop(): PNG[] {
  return Array.from({ length: sheenPeriod }, (_, tick) => {
    const png = blank(192, 80);
    paint(
      png,
      Array.from({ length: 80 }, () => "k".repeat(192)),
      sweetie,
    );
    for (const p of backLights(tick)) plot(png, p.x, p.y, p.colour);
    for (const layer of [titleCabinet, titleBar, titleWord]) paint(png, layer.rows, sweetie, layer.x, layer.y + 2);
    for (const p of logoOverlay(tick)) plot(png, p.x, p.y + 2, p.colour);
    return png;
  });
}

export const scenes: readonly Scene[] = [
  {
    name: "hub",
    sources: [
      "src/ui/hubArt.ts",
      "src/ui/deskArt.ts",
      "src/ui/tickerArt.ts",
      "src/ui/employeeArt.ts",
      "src/ui/playerArt.ts",
    ],
    render: () => hubFrames(),
    // Continue (Space) stands the player above the prize desk, facing it, with
    // enough tickets that Space again opens the prize counter with every prize in reach.
    play: {
      query: "scene=title",
      storage: {
        [saveKey]: JSON.stringify({
          v: saveVersion,
          highScores: noHighScores,
          tokens: 3,
          tickets: 500,
          prizes: [],
          player: { x: 80, y: 95, dir: "DOWN" },
        }),
      },
    },
  },
  {
    name: "prize counter",
    sources: ["src/ui/panelArt.ts"],
    render: prizeCounterFrames,
    // Continue (Space) stands the player at the prize desk; Space again opens the menu, with
    // 75 tickets and the last shelf prize owned, so cards for sale, too dear and owned all show.
    play: {
      query: "scene=title",
      storage: {
        [saveKey]: JSON.stringify({
          v: saveVersion,
          highScores: noHighScores,
          tokens: 3,
          tickets: 75,
          prizes: [shelf.at(-1)?.id],
          player: { x: 80, y: 95, dir: "DOWN" },
        }),
      },
    },
  },
  { name: "hub with every prize", sources: ["src/ui/prizeArt.ts"], render: () => hubFrames(paintPrizes) },
  { name: "title", sources: ["src/ui/titleArt.ts"], render: titleTop },
  { name: "sweet-sam flowers", sources: ["src/sweet-sam/art.ts"], render: flowerRow },
];

/** The scene that shows `file`'s art; throws naming this file when none does. */
export function sceneFor(file: string): Scene {
  const scene = scenes.find((s) => s.sources.includes(file));
  if (scene === undefined) throw new Error(`no scene shows ${file}; add one to scripts/pixel-scenes.ts`);
  return scene;
}
