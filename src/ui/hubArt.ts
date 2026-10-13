// Pixel-art source for the hub room (ADR 0006): the walls, the floor and the
// three cabinets, as rows of Sweetie 16 letters (`sweetie` in
// src/ui/sweetie16.ts, `.` is blank).
// scripts/gen-ui-art.ts writes `roomRows()` to src/assets/images/arcade.png.
//
// The room is an arcade at night: a dark wall lit by a cyan neon tube along
// the top, and a navy arcade carpet with a sparse confetti print. The
// cabinets are classic uprights in their minigames' colours, each screen
// showing a glimpse of its game. The wall above and beside each cabinet stays
// empty for prizes (#22).

import type { ArcadeTitle } from "../game/snapshot.ts";

/** Size of the room image (the hub's logical size less the 16-px margin). */
export const roomWidth = 160;
export const roomHeight = 144;

/** The floor: inside the walls, from the skirting down to the bottom wall. */
export const floorRect = { x: 24, y: 56, w: 112, h: 64 } as const;
/** The visible face of the top wall, above the floor. */
const wallTop = 24;

/** The wall, top to bottom from `wallTop`: neon tube, plain wall, then the skirting. */
const neonTube = ["k", "B", "c", "B", "n"] as const;
const skirting = ["p", "r", "k"] as const;

/** One 16x16 tile of the carpet's confetti print; `.` is the navy ground. */
const carpetTile: readonly string[] = [
  "................",
  "..b.............",
  ".bbb.......p....",
  "..b.......p.....",
  ".........p......",
  "....t...........",
  "................",
  "..............c.",
  "........y.......",
  "....p...........",
  "...ppp......t...",
  "............tt..",
  ".b..............",
  "..........c.....",
  "......t.........",
  "................",
];

/**
 * One cabinet seen from the front, 16x24: `1` its lit colour (marquee, coin
 * slots, buttons), `2` its trim (marquee frame, control panel), `3` its body,
 * `4` its shaded right side and `S` its screen (`cabinetScreens`).
 */
export const cabinetArt: readonly string[] = [
  ".kkkkkkkkkkkkkk.",
  "k22222222222222k",
  "k21111111111112k",
  "k22222222222222k",
  "kkkkkkkkkkkkkkkk",
  ".k333333333334k.",
  ".k3kkkkkkkkkk4k.",
  ".k3kSSSSSSSSk4k.",
  ".k3kSSSSSSSSk4k.",
  ".k3kSSSSSSSSk4k.",
  ".k3kSSSSSSSSk4k.",
  ".k3kSSSSSSSSk4k.",
  ".k3kkkkkkkkkk4k.",
  ".k333333333334k.",
  "kkkkkkkkkkkkkkkk",
  "k2k222222222222k",
  "k2k222221212222k",
  "kkkkkkkkkkkkkkkk",
  ".k333333333334k.",
  ".k3333kkkk3334k.",
  ".k3333k11k3334k.",
  ".k3333kkkk3334k.",
  ".k333333333334k.",
  ".kkkkkkkkkkkkkk.",
];

/** Each cabinet's colours (Sweetie 16 letters for `1` to `4`): the colours of its minigame. */
export const cabinetColours: Readonly<
  Record<ArcadeTitle, readonly [lit: string, trim: string, body: string, side: string]>
> = {
  brassMonkey: ["g", "G", "t", "n"],
  sweet: ["y", "o", "r", "p"],
  firefly: ["c", "B", "b", "n"],
};

/** What each screen shows, 8x5 (the `S` block): a glimpse of its game. */
export const cabinetScreens: Readonly<Record<ArcadeTitle, readonly string[]>> = {
  // A brass block on a girder.
  brassMonkey: ["nnnnnnnn", "nnnnnnyn", "nnynnnnn", "nyyynGgG", "GGGGnnnn"],
  // A bee by a honey drop.
  sweet: ["nnnnnnnn", "nwnnyynn", "nnnyooyn", "nnnyooyn", "nnnnyynn"],
  // Fireflies over the grass at night.
  firefly: ["knnnnknn", "nngnnnnn", "nnnnnnyn", "ngnnknnn", "tttttttt"],
};

/** A cabinet's rows in its own colours, with its screen. */
export function cabinetRows(title: ArcadeTitle): string[] {
  const colours = cabinetColours[title];
  const screen = cabinetScreens[title];
  const screenTop = cabinetArt.findIndex((row) => row.includes("S"));
  return cabinetArt.map((row, y) =>
    [...row]
      .map((px, x) => {
        if (px === "S") return screen[y - screenTop]![x - row.indexOf("S")]!;
        const n = "1234".indexOf(px);
        return n < 0 ? px : colours[n]!;
      })
      .join(""),
  );
}

/** Where a cabinet stands: its collision rect, in hub-image coordinates. */
export interface CabinetPlace {
  title: ArcadeTitle;
  rect: { x: number; y: number; w: number };
}

/** The room with every cabinet standing on it, centred on its collision rect's top edge. */
export function roomRows(cabinets: readonly CabinetPlace[]): string[] {
  const grid: string[][] = [];
  for (let y = 0; y < roomHeight; y++) {
    const row: string[] = [];
    for (let x = 0; x < roomWidth; x++) row.push(roomPixel(x, y));
    grid.push(row);
  }
  for (const c of cabinets) {
    const left = c.rect.x + Math.trunc((c.rect.w - cabinetArt[0]!.length) / 2);
    cabinetRows(c.title).forEach((row, dy) => {
      [...row].forEach((px, dx) => {
        if (px !== ".") grid[c.rect.y + dy]![left + dx] = px;
      });
    });
  }
  return grid.map((row) => row.join(""));
}

function roomPixel(x: number, y: number): string {
  const f = floorRect;
  if (x < f.x || x >= f.x + f.w || y < wallTop || y >= f.y + f.h) return "k";
  if (y < wallTop + neonTube.length) return neonTube[y - wallTop]!;
  if (y >= f.y - skirting.length && y < f.y) return skirting[y - (f.y - skirting.length)]!;
  if (y < f.y) return "d";
  // The wall's shadow, then the carpet.
  if (y === f.y) return "k";
  const px = carpetTile[(y - f.y) % 16]![(x - f.x) % 16]!;
  return px === "." ? "n" : px;
}
