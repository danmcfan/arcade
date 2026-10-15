// Pixel-art source for menu panels and prize counter cards (ADR 0006): rows of
// Sweetie 16 letters (`sweetie` in src/ui/sweetie16.ts, `.` is blank), each a
// nine-slice frame (src/ui/nineSlice.ts) drawn at any size. scripts/gen-ui-art.ts
// writes the panel to src/assets/images/panel.png and the cards, left to right,
// to src/assets/images/cards.png.

import { stripRects } from "./strip.ts";

/**
 * The corners of `panelFrame`, kept as drawn; the middle 4 px repeat. Content
 * sits 3 px or more inside the edges, so a corner can be ornate but an edge is
 * at most 3 px deep.
 */
export const panelCorner = 6;

/** Every panel: the pause menus, the controls and payout panels, the title menu and the prize counter. */
export const panelFrame = [
  ".oooooooooooooo.",
  "owyyyyyyyyyyyywo",
  "oyrrrrrrrrrrrryo",
  "oyrppppppppppryo",
  "oyrppppppppppryo",
  "oyrppppppppppryo",
  "oyrppppppppppryo",
  "oyrppppppppppryo",
  "oyrppppppppppryo",
  "oyrppppppppppryo",
  "oyrppppppppppryo",
  "oyrppppppppppryo",
  "oyrppppppppppryo",
  "oyrrrrrrrrrrrryo",
  "owyyyyyyyyyyyywo",
  ".oooooooooooooo.",
];

/**
 * The corners of each card frame; the middle 2 px repeat. A card's picture and
 * price sit 2 px inside its edges, so an edge is at most 2 px deep.
 */
export const cardCorner = 4;

/** The prize counter's cards, by offer, and the cursor drawn over the selected one (its middle is blank). */
export const cardArt = {
  /** A prize the player can buy. */
  buy: [
    "..yyyyyy..",
    "..yooooy..",
    "yyykkkkyyy",
    "yokkkkkkoy",
    "yokkkkkkoy",
    "yokkkkkkoy",
    "yokkkkkkoy",
    "yyykkkkyyy",
    "..yooooy..",
    "..yyyyyy..",
  ],
  /** A prize the player has too few tickets for. */
  short: [
    "..rrrrrr..",
    "..rkkkkr..",
    "rrrkkkkrrr",
    "rkkkkkkkkr",
    "rkkkkkkkkr",
    "rkkkkkkkkr",
    "rkkkkkkkkr",
    "rrrkkkkrrr",
    "..rkkkkr..",
    "..rrrrrr..",
  ],
  /** A prize the player owns. */
  owned: [
    "..mmmmmm..",
    "..mddddm..",
    "mmmddddmmm",
    "mddddddddm",
    "mddddddddm",
    "mddddddddm",
    "mddddddddm",
    "mmmddddmmm",
    "..mddddm..",
    "..mmmmmm..",
  ],
  /** The selected card's ring. */
  cursor: [
    "..wwwwww..",
    "..wyyyyw..",
    "wwwy..ywww",
    "wyyy..yyyw",
    "wy......yw",
    "wy......yw",
    "wyyy..yyyw",
    "wwwy..ywww",
    "..wyyyyw..",
    "..wwwwww..",
  ],
};

export type CardLook = keyof typeof cardArt;

/** Each card frame's rectangle in cards.png (top row 0). */
export const cardRects: Readonly<Record<CardLook, { x: number; w: number; h: number }>> = stripRects(cardArt, 1);

export const cardSheetWidth = Object.values(cardRects).reduce((w, r) => Math.max(w, r.x + r.w), 0);
export const cardSheetHeight = Math.max(...Object.values(cardRects).map((r) => r.h));
