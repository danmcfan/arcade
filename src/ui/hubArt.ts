// Pixel-art source for the hub room (ADR 0006): the walls, the floor and the
// three cabinets, as rows of Sweetie 16 letters (`sweetie` in
// src/ui/sweetie16.ts, `.` is blank).
// scripts/gen-ui-art.ts writes `roomRows()` to src/assets/images/arcade.png.
//
// The room is an arcade at night, filling the whole 160x144 Game Boy frame
// (#72): a dark wall from the ceiling's cyan neon tube down to the skirting,
// with the LED scoreboard in its marquee of bulbs (src/ui/tickerArt.ts) under
// the tube, and a navy arcade carpet with a sparse confetti print out to the
// frame's edges. The cabinets are classic uprights in their minigames'
// colours, their screens dark glass until the player walks up. Then the screen warms up like a CRT
// and shows a glimpse of its game, and its light pools on the carpet:
// `powerSheetRows()`, written to src/assets/images/screens.png. The wall
// around each cabinet stays empty for prizes (#22). The prize desk
// (src/ui/deskArt.ts) stands across the bottom of the floor.

import type { ArcadeTitle } from "../game/snapshot.ts";
import { deskPixel } from "./deskArt.ts";
import { tickerBoardPixel } from "./tickerArt.ts";

/** Size of the room image: the Game Boy's screen. */
export const roomWidth = 160;
export const roomHeight = 144;

/** The floor the player walks on: inside the walls, from the skirting down to the bottom wall. */
export const floorRect = { x: 24, y: 56, w: 112, h: 64 } as const;

/** The wall, top to bottom from the ceiling: neon tube, plain wall, then the skirting. */
const neonTube = ["k", "B", "c", "B", "n"] as const;
const skirting = ["p", "r", "k"] as const;

/** One 16x16 tile of the carpet's confetti print; `.` is the navy ground. */
export const carpetTile: readonly string[] = [
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
 * One cabinet seen from the front, 16x24, a band of body colour between black
 * lines down each side: `1` its lit colour (marquee, buttons, coin slots), `w`
 * the marquee's lettering, `2` its trim (marquee, control panel), `3` its
 * body, `4` its shaded right side and `S` its screen (`cabinetScreens`).
 */
export const cabinetArt: readonly string[] = [
  "kkkkkkkkkkkkkkkk",
  "k3k2222222222k4k",
  "k3k21w1ww1w12k4k",
  "k3k2222222222k4k",
  "k3kkkkkkkkkkkk4k",
  "k3k3333333333k4k",
  "k3kkkkkkkkkkkk4k",
  "k3kkSSSSSSSSkk4k",
  "k3kkSSSSSSSSkk4k",
  "k3kkSSSSSSSSkk4k",
  "k3kkSSSSSSSSkk4k",
  "k3kkSSSSSSSSkk4k",
  "k3kkkkkkkkkkkk4k",
  "k3k3333333333k4k",
  "k3k2222222222k4k",
  "k3k21k1222112k4k",
  "k3k2222222222k4k",
  "k3kkkkkkkkkkkk4k",
  "k3k3333333333k4k",
  "k3k33kkkkkk33k4k",
  "k3k33k1kk1k33k4k",
  "k3k33kkkkkk33k4k",
  "k3k3333333333k4k",
  "kkkkkkkkkkkkkkkk",
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

/** A screen switched off: dark glass with a glint in its top-left corner. */
export const screenGlass: readonly string[] = ["kdkkkkkk", "dkkkkkkk", "kkkkkkkk", "kkkkkkkk", "kkkkkkkk"];

/** A cabinet's rows in its own colours, its screen switched off. */
export function cabinetRows(title: ArcadeTitle): string[] {
  const colours = cabinetColours[title];
  const screen = screenGlass;
  const screenTop = cabinetArt.findIndex((row) => row.includes("S"));
  return cabinetArt.map((row, y) =>
    Array.from(row)
      .map((px, x) => {
        if (px === "S") return at(at(screen, y - screenTop, "screen row"), x - row.indexOf("S"), "screen pixel");
        const n = "1234".indexOf(px);
        return n < 0 ? px : at(colours, n, "cabinet colour");
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
    const left = c.rect.x + Math.trunc((c.rect.w - at(cabinetArt, 0, "cabinet row").length) / 2);
    cabinetRows(c.title).forEach((row, dy) => {
      const gridRow = at(grid, c.rect.y + dy, "room row");
      Array.from(row).forEach((px, dx) => {
        if (px !== ".") gridRow[left + dx] = px;
      });
    });
  }
  return grid.map((row) => row.join(""));
}

function roomPixel(x: number, y: number): string {
  const f = floorRect;
  const desk = deskPixel(x, y);
  if (desk !== null) return desk;
  if (y < neonTube.length) return at(neonTube, y, "neon row");
  const board = tickerBoardPixel(x, y);
  if (board !== null) return board;
  if (y >= f.y - skirting.length && y < f.y) return at(skirting, y - (f.y - skirting.length), "skirting row");
  if (y < f.y) return "d";
  // The wall's shadow, then the carpet, its print lined up on the floor's corner.
  if (y === f.y) return "k";
  const px = at(at(carpetTile, (y - f.y) % 16, "carpet row"), (((x - f.x) % 16) + 16) % 16, "carpet pixel");
  return px === "." ? "n" : px;
}

/** `xs[i]`, throwing if the art is shorter than its layout expects. */
function at<T>(xs: ArrayLike<T>, i: number, what: string): T {
  const v = xs[i];
  if (v === undefined) throw new Error(`hub art: no ${what} at ${i}`);
  return v;
}

/** Each colour one step lighter, for the screen's over-bright moment. */
const lighter: Readonly<Record<string, string>> = {
  k: "d",
  d: "m",
  m: "l",
  l: "w",
  n: "b",
  b: "B",
  B: "c",
  t: "G",
  G: "g",
  p: "r",
  r: "o",
  o: "y",
  c: "w",
  g: "w",
  y: "w",
  w: "w",
};

function lighten(px: string): string {
  const v = lighter[px];
  if (v === undefined) throw new Error(`hub art: no lighter colour for "${px}"`);
  return v;
}

/** What a screen shows in one frame of switching on or off. */
type ScreenStep =
  "dot" | "dimDot" | "line2" | "line4" | "line6" | "line8" | "band" | "brightBand" | "bright" | "picture";

/**
 * The frames of a screen switching on and off, in screens.png's column
 * order: its screen, and how bright the pool of light on the carpet is (0 to
 * 3). src/arcade/screen.ts plays them by name.
 */
export const powerFrames = [
  { name: "dot", screen: "dot", glow: 0 },
  { name: "line2", screen: "line2", glow: 0 },
  { name: "line4", screen: "line4", glow: 0 },
  { name: "line6", screen: "line6", glow: 0 },
  { name: "line8", screen: "line8", glow: 0 },
  { name: "band", screen: "band", glow: 1 },
  { name: "bright", screen: "bright", glow: 2 },
  { name: "on", screen: "picture", glow: 3 },
  { name: "offBand", screen: "brightBand", glow: 2 },
  { name: "offLine8", screen: "line8", glow: 1 },
  { name: "offLine6", screen: "line6", glow: 1 },
  { name: "offLine4", screen: "line4", glow: 0 },
  { name: "offLine2", screen: "line2", glow: 0 },
  { name: "offDot", screen: "dimDot", glow: 0 },
] as const satisfies readonly { name: string; screen: ScreenStep; glow: number }[];

export type PowerFrame = (typeof powerFrames)[number]["name"];

/** One power frame: the cabinet and the carpet in front of it. The cabinet stands `powerCabinetX` px in. */
export const powerFrameWidth = 28;
export const powerFrameHeight = 36;
export const powerCabinetX = 6;

/** The middle two pixels of an 8x5 screen. */
function centre(x: number, y: number): boolean {
  return y === 2 && (x === 3 || x === 4);
}

/** The glass's colour at (x, y): the switched-off screen around the dot. */
function glass(x: number, y: number): string {
  return at(at(screenGlass, y, "glass row"), x, "glass pixel");
}

/** Half the length of a `lineN` step's white line. */
const lineHalf: Readonly<Record<string, number>> = { line2: 1, line4: 2, line6: 3, line8: 4 };

/** The screen's 8x5 rows in step `step`, showing `picture` when it is on. */
function screenStep(step: ScreenStep, picture: readonly string[]): string[] {
  const rows = (f: (x: number, y: number, px: string) => string): string[] =>
    picture.map((row, y) =>
      Array.from(row)
        .map((px, x) => f(x, y, px))
        .join(""),
    );
  switch (step) {
    case "dot":
      return rows((x, y) => (centre(x, y) ? "w" : glass(x, y)));
    case "dimDot":
      return rows((x, y) => (centre(x, y) ? "l" : glass(x, y)));
    case "line2":
    case "line4":
    case "line6":
    case "line8": {
      const half = lineHalf[step] ?? 0;
      return rows((x, y) => (y === 2 && x >= 4 - half && x < 4 + half ? "w" : "k"));
    }
    case "band":
      return rows((_x, y) => {
        if (y === 2) return "w";
        return y === 1 || y === 3 ? "c" : "k";
      });
    case "brightBand":
      return rows((_x, y, px) => (y >= 1 && y <= 3 ? lighten(px) : "k"));
    case "bright":
      return rows((_x, _y, px) => lighten(px));
    case "picture":
      break;
  }
  return [...picture];
}

/** The Bayer 4x4 threshold map: an ordered dither keeps the light in whole pixels of the palette. */
const bayer = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
] as const;

/** How strong the pool of light is at each glow level, at its centre. */
const glowStrength = [0, 0.25, 0.6, 1.1] as const;

/** The pool of light's radii, in px. */
const poolRx = 13;
const poolRy = 7;

/**
 * screens.png: one row of `powerFrames` per cabinet in `cabinets`' order, each
 * frame the room around that cabinet with its screen in that step and its
 * light on the navy carpet, `.` wherever the room is unchanged. The light is
 * an ellipse in front of the cabinet, dithered to at most every other pixel.
 */
export function powerSheetRows(cabinets: readonly CabinetPlace[]): string[] {
  const room = roomRows(cabinets);
  const covered = new Set<string>();
  for (const c of cabinets) {
    cabinetArt.forEach((row, dy) => {
      Array.from(row).forEach((px, dx) => {
        if (px !== ".") covered.add(`${String(c.rect.x + dx)},${String(c.rect.y + dy)}`);
      });
    });
  }
  const screenTop = cabinetArt.findIndex((row) => row.includes("S"));
  const screenLeft = at(cabinetArt, screenTop, "cabinet row").indexOf("S");
  const sheet: string[] = [];
  for (const c of cabinets) {
    const left = c.rect.x - powerCabinetX;
    const band = Array.from({ length: powerFrameHeight }, () => "");
    for (const frame of powerFrames) {
      const grid = room.map((row) => Array.from(row));
      screenStep(frame.screen, cabinetScreens[c.title]).forEach((row, y) => {
        const gridRow = at(grid, c.rect.y + screenTop + y, "room row");
        Array.from(row).forEach((px, x) => {
          gridRow[c.rect.x + screenLeft + x] = px;
        });
      });
      const strength = glowStrength[frame.glow];
      const cx = c.rect.x + 7.5;
      const cy = c.rect.y + cabinetArt.length + 3;
      for (let y = c.rect.y; y < c.rect.y + powerFrameHeight; y++) {
        const gridRow = at(grid, y, "room row");
        const threshold = at(bayer, y % 4, "bayer row");
        for (let x = left; x < left + powerFrameWidth; x++) {
          if (y <= floorRect.y || gridRow[x] !== "n" || covered.has(`${String(x)},${String(y)}`)) continue;
          const r = Math.hypot((x - cx) / poolRx, (y - cy) / poolRy);
          if (r < 1 && Math.min(0.5, strength * (1 - r)) * 16 > at(threshold, x % 4, "bayer cell")) gridRow[x] = "b";
        }
      }
      for (let y = 0; y < powerFrameHeight; y++) {
        const roomRow = at(room, c.rect.y + y, "room row");
        const gridRow = at(grid, c.rect.y + y, "room row");
        let row = "";
        for (let x = left; x < left + powerFrameWidth; x++) {
          const px = at(gridRow, x, "room pixel");
          row += px === at(roomRow, x, "room pixel") ? "." : px;
        }
        band[y] = at(band, y, "frame row") + row;
      }
    }
    sheet.push(...band);
  }
  return sheet;
}
