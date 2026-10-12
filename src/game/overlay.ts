// What the Game draws over a frozen minigame: the minigame pause menu, its
// controls panel, and the payout. They look like the hub pause menu (shared
// pieces in src/ui/menu.ts), centred on the minigame's layout.

import type { Surface } from "../engine/surface.ts";
import { controlsHeight, controlsPanelWidth, dim, drawControlsPanel, drawHints, drawPausePanel, type Hint } from "../ui/menu.ts";
import { minigameControls, minigamePauseMenu, quitGameIndex, quitGameNote } from "../ui/menus.ts";
import { drawReels } from "../ui/reelText.ts";
import { drawPanel, drawText, drawTextCentered, keyHeight } from "../ui/text.ts";
import type { Payout } from "./payout.ts";
import type { GameMenu } from "./snapshot.ts";
import type { SoftwareName } from "./software.ts";

export interface MenuOverlay {
  menu: GameMenu;
  software: SoftwareName;
  cursor: number;
  payout: Payout | null;
  tick: number;
  /** The minigame's layout. */
  width: number;
  height: number;
  /** The part of the layout the minigame paints, dimmed behind the panel. */
  playfield: { x: number; y: number; w: number; h: number };
}

export const payoutTitle = "PAYOUT";
export const freePlayLine = "FREE PLAY: 0 TICKETS";
export const skipHints: readonly Hint[] = [{ keys: ["SPACE"], label: "SKIP" }];
export const closeHints: readonly Hint[] = [{ keys: ["SPACE"], label: "OK" }];

const payoutWidth = 152;
const payoutHeight = 74;
const pauseHeight = 64;

export function drawMenuOverlay(screen: Surface, o: MenuOverlay): void {
  const { x, y, w, h } = o.playfield;
  dim(screen, x, y, w, h);
  const centre = Math.trunc(o.width / 2);
  const middle = Math.trunc(o.height / 2);
  switch (o.menu) {
    case "paused":
      drawPausePanel(screen, minigamePauseMenu, o.cursor, o.tick, centre, middle - pauseHeight / 2, {
        item: quitGameIndex,
        text: quitGameNote,
        ink: "orange",
      });
      return;
    case "controls": {
      const rows = minigameControls[o.software];
      const ph = controlsHeight(rows.length) + 46;
      drawControlsPanel(screen, rows, centre - controlsPanelWidth / 2, middle - Math.trunc(ph / 2));
      return;
    }
    case "payout":
      if (o.payout !== null) drawPayout(screen, o.payout, centre, middle - payoutHeight / 2);
      return;
  }
}

/** The payout panel, top at `y`: the score spinning down, the tickets spinning up, and a key hint. */
function drawPayout(screen: Surface, p: Payout, centre: number, y: number): void {
  const left = centre - payoutWidth / 2;
  const right = left + payoutWidth - 12;
  drawPanel(screen, left, y, payoutWidth, payoutHeight);
  drawTextCentered(screen, payoutTitle, centre, y + 8, "yellow");
  drawText(screen, "SCORE", left + 12, y + 24, "white");
  drawReels(screen, p.scoreReels, right, y + 24, "white");
  if (p.freePlay) {
    drawTextCentered(screen, freePlayLine, centre, y + 38, "orange");
  } else {
    drawText(screen, "TICKETS", left + 12, y + 38, "white");
    drawReels(screen, p.ticketReels, right, y + 38, "yellow");
  }
  drawHints(screen, p.counting ? skipHints : closeHints, y + payoutHeight - keyHeight - 6, centre);
}
