// Pixel-art source for the hub room (ADR 0006): the walls, the floor and the
// three cabinets, as rows of palette letters (`.` is blank).
// scripts/gen-ui-art.ts writes `roomRows()` to src/assets/images/arcade.png.
//
// The room is calm on purpose: a plain dark wall with one trim line where it
// meets the floor, and a large checker of two close dark blues, so the
// cabinets and the player are the brightest things in it. The wall above and
// beside each cabinet stays empty for prizes (#22).

import type { ArcadeTitle } from "../game/snapshot.ts";

/** Sweetie 16 colours, keyed by the letter the rows use. */
export const hubPalette: Readonly<Record<string, string>> = {
  k: "#1a1c2c",
  w: "#5d275d",
  t: "#b13e53",
  f: "#29366f",
  F: "#333c57",
  // Brass Monkey
  g: "#38b764",
  G: "#a7f070",
  e: "#257179",
  // Sweet Sam
  o: "#ef7d57",
  y: "#ffcd75",
  r: "#b13e53",
  // Firefly
  b: "#41a6f6",
  c: "#73eff7",
  d: "#3b5dc9",
};

/** Size of the room image (the hub's logical size less the 16-px margin). */
export const roomWidth = 160;
export const roomHeight = 144;

/** The floor: inside the walls, from the trim line down to the bottom wall. */
export const floorRect = { x: 24, y: 56, w: 112, h: 64 } as const;
/** The visible face of the top wall, above the floor. */
const wallTop = 24;
/** Side of one floor square. */
export const checker = 8;

/**
 * One cabinet seen from the front, 14x24: `1` its top colour, `2` its light
 * colour (marquee, screen glint, buttons, coin slot), `3` its body colour.
 */
export const cabinetArt: readonly string[] = [
  ".kkkkkkkkkkkk.",
  "k111111111111k",
  "k122222222221k",
  "k111111111111k",
  "k333333333333k",
  "k3kkkkkkkkkk3k",
  "k3k2kkkkkkkk3k",
  "k3kkkkkkkkkk3k",
  "k3kkkkkkkkkk3k",
  "k3kkkkkkkkkk3k",
  "k3kkkkkkkkkk3k",
  "k333333333333k",
  "kkkkkkkkkkkkkk",
  "k11k111111111k",
  "k1kkk11121211k",
  "k333333333333k",
  "k333333333333k",
  "k3333kkkk3333k",
  "k3333k22k3333k",
  "k3333kkkk3333k",
  "k333333333333k",
  "k333333333333k",
  "k333333333333k",
  ".kkkkkkkkkkkk.",
];

/** Each cabinet's colours (palette letters for `1`, `2` and `3`): the colours of its minigame. */
export const cabinetColours: Readonly<Record<ArcadeTitle, readonly [top: string, light: string, body: string]>> = {
  brassMonkey: ["g", "G", "e"],
  sweet: ["o", "y", "r"],
  firefly: ["b", "c", "d"],
};

/** A cabinet's rows in its own colours. */
export function cabinetRows(title: ArcadeTitle): string[] {
  const [top, light, body] = cabinetColours[title];
  return cabinetArt.map((row) => row.replaceAll("1", top).replaceAll("2", light).replaceAll("3", body));
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
  if (y < f.y - 1) return "w";
  if (y === f.y - 1) return "t";
  const square = Math.trunc((x - f.x) / checker) + Math.trunc((y - f.y) / checker);
  return square % 2 === 0 ? "f" : "F";
}
