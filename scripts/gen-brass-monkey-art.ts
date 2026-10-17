// Build Brass Monkey's character art from its source in src/brass-monkey/art.ts:
//
//   bun run art      # also writes src/assets/images/brass-monkey/*.png
//
// Each frame is built from the source's parts and gets a 1 px black outline.
// monkey.png is one row of 16×16 frames: walk 1-3 (the head over each body,
// 1 px lower on a step), jump, climb and climb mirrored. gnome.png is one row
// of 32×32 frames, the body with each arm part, mirrored from its left half:
// idle, throw. gear.png (12×12: two turns), ember.png (12×12: two flickers
// and their mirrors) and bolt.png (10×14: at rest, then a glint running over
// its head) are one row of frames each; wrench.png (8×14) is the wrench
// upright and wrench-swing.png (14×8) the same turned a quarter clockwise. The floor tiles are girder.png (8×8),
// ladder.png (8×4, its rows by height), conveyor.png (8×8: the left end,
// middle and right end, 4 frames each), door.png (16×24, outlined but for its
// foot) and wall.png (32×32), none outlined but the door. girder-floor.png
// and conveyor-floor.png (224×256) are the two floors drawn from them, laid
// out by src/brass-monkey/floors.ts (the conveyors in their first frame; the
// game moves them). gen-art.test.ts fails when the
// committed PNGs drift.

import { join } from "node:path";
import { PNG } from "pngjs";
import {
  bolt,
  boltGlints,
  conveyorSlats,
  door,
  emberFlame,
  emberTips,
  gear,
  girder,
  gnomeArmsDown,
  gnomeArmsUp,
  gnomeBody,
  ladder,
  monkeyClimb,
  monkeyHead,
  monkeyJump,
  monkeyOtherStep,
  monkeyStand,
  monkeyStep,
  type Part,
  wallPanel,
  wrench,
} from "../src/brass-monkey/art.ts";
import { conveyorFloor, girderFloor, girderTop, type Floor } from "../src/brass-monkey/floors.ts";
import { sweetie } from "../src/ui/sweetie16.ts";
import { imageOutput, type ImageOutput } from "./image-outputs.ts";
import {
  blank,
  checkRows,
  empty,
  flipX,
  glint,
  mirrorX,
  outline,
  overlay,
  paint,
  rotate,
  type Rows,
} from "./pixel-art.ts";

const blankRow = empty.repeat(16);

/** The monkey's fills before outlining, in sheet order. */
export function monkeyFills(): Rows[] {
  return [
    [...monkeyHead, ...monkeyStand],
    [blankRow, ...monkeyHead, ...monkeyStep],
    [blankRow, ...monkeyHead, ...monkeyOtherStep],
    [...monkeyHead, ...monkeyJump],
    monkeyClimb,
  ];
}

/** The monkey's sheet frames, outlined: walk 1-3, jump, climb and its mirror. */
export function monkeyFrames(): Rows[] {
  const frames = monkeyFills().map((rows) => outline(rows));
  const climb = frames[4];
  if (climb === undefined) throw new Error("the monkey has no climbing frame");
  return [...frames, flipX(climb)];
}

const withArms = (arms: Part): string[] => overlay(gnomeBody, arms.rows, arms.x, arms.y);

/** The Gnome's sheet frames, mirrored and outlined: idle, throw. */
export function gnomeFrames(): Rows[] {
  return [gnomeArmsDown, gnomeArmsUp].map((arms) => outline(mirrorX(withArms(arms))));
}

/** The gear's sheet frames, outlined: its two turns. */
export function gearFrames(): Rows[] {
  return gear.map((rows) => outline(rows));
}

/** The ember's fills before outlining: the flame with each tip. */
export function emberFills(): Rows[] {
  return emberTips.map((tip) => overlay(emberFlame, tip.rows, tip.x, tip.y));
}

/** The ember's sheet frames, outlined: two flickers, then both mirrored so it sways. */
export function emberFrames(): Rows[] {
  const frames = emberFills().map((rows) => outline(rows));
  return [...frames, ...frames.map((rows) => flipX(rows))];
}

/** The bolt's sheet frames, outlined: at rest, then one frame for each step of the glint. */
export function boltFrames(): Rows[] {
  const rest = outline(bolt);
  return [rest, ...boltGlints.map(([x, y]) => glint(rest, x, y))];
}

/** The wrench, outlined: upright, as it stands on the floor and as the monkey raises it. */
export function wrenchFrames(): Rows[] {
  return [outline(wrench)];
}

/** The wrench swung down, its jaws to the right: the upright frame turned a quarter clockwise. */
export function wrenchSwingFrames(): Rows[] {
  return wrenchFrames().map((rows) => rotate(rows));
}

/** `row` (one period) laid along `w` px, moved `shift` px right. */
function slide(row: string, w: number, shift: number): string {
  const n = row.length;
  let out = "";
  for (let x = 0; x < w; x++) out += row[(((x - shift) % n) + n) % n] ?? empty;
  return out;
}

/** `rows` with the top row's pixel at x blanked: a belt's rounded corner. */
function corner(rows: Rows, x: number): string[] {
  const [top = "", ...rest] = rows;
  return [top.slice(0, x) + empty + top.slice(x + 1)].concat(rest);
}

/**
 * The conveyor's frames: the left end 1-4, the middle 1-4, the right end 1-4.
 * Each is the girder with the slats for its top two rows, moved 1 px right a
 * frame (run them backwards for a belt moving left); the ends round the
 * belt's top corner.
 */
export function conveyorFrames(): Rows[] {
  const frames = [0, 1, 2, 3].map((f) =>
    conveyorSlats.map((row) => slide(row, girder[0]?.length ?? 0, f)).concat(girder.slice(2)),
  );
  return [...frames.map((rows) => corner(rows, 0)), ...frames, ...frames.map((rows) => corner(rows, 7))];
}

/** The exit door, outlined in black but not along its foot, which stands on the floor. */
export function doorFrame(): Rows {
  return outline(door);
}

/**
 * The conveyor tile for column x of a belt from x0 to x1 (exclusive) in its
 * first frame: the left end, the middle or the right end.
 */
function beltTile(x: number, x0: number, x1: number): Rows {
  const frames = conveyorFrames();
  const at = x === x0 ? 0 : x + 8 >= x1 ? 8 : 4;
  return frames[at] ?? [];
}

/** `floor` drawn from the tiles: the wall, then the ladders, the girders (a conveyor's in its first frame) and the exit door. */
function floorRows(floor: Floor): Rows {
  const tile = wallPanel.length;
  let rows: Rows = Array.from({ length: floor.height }, (_, y) =>
    Array.from({ length: floor.width }, (_px, x) => wallPanel[y % tile]?.[x % tile] ?? empty).join(""),
  );
  for (const piece of floor.ladders) {
    for (let y = piece.top; y <= piece.bottom; y++) {
      if (piece.gap && y >= piece.gap[0] && y <= piece.gap[1]) continue;
      rows = overlay(rows, [ladder[y % ladder.length] ?? ""], piece.x, y);
    }
  }
  const step = girder[0]?.length ?? 0;
  for (const g of floor.girders) {
    for (let x = g.x0; x < g.x1; x += step)
      rows = overlay(rows, g.belt === undefined ? girder : beltTile(x, g.x0, g.x1), x, girderTop(g, x));
  }
  return overlay(rows, doorFrame(), floor.door.x, floor.door.y - door.length);
}

/** The girder floor. */
export function girderFloorRows(): Rows {
  return floorRows(girderFloor);
}

/** The conveyor floor. */
export function conveyorFloorRows(): Rows {
  return floorRows(conveyorFloor);
}

/** `frames` side by side; they must all be one size. */
function sheet(frames: readonly Rows[]): PNG {
  const w = frames[0]?.[0]?.length ?? 0;
  const h = frames[0]?.length ?? 0;
  for (const rows of frames) checkRows("sheet frame", rows, { w, h });
  const png = blank(w * frames.length, h);
  frames.forEach((rows, i) => {
    paint(png, rows, sweetie, i * w, 0);
  });
  return png;
}

export const brassMonkeyImagesDir = "src/assets/images/brass-monkey";

/** Every generated Brass Monkey image: its file, its size and how to draw it. */
export const brassMonkeyArtFiles: readonly ImageOutput[] = [
  imageOutput(join(brassMonkeyImagesDir, "monkey.png"), 96, 16, () => sheet(monkeyFrames())),
  imageOutput(join(brassMonkeyImagesDir, "gnome.png"), 64, 32, () => sheet(gnomeFrames())),
  imageOutput(join(brassMonkeyImagesDir, "gear.png"), 24, 12, () => sheet(gearFrames())),
  imageOutput(join(brassMonkeyImagesDir, "ember.png"), 48, 12, () => sheet(emberFrames())),
  imageOutput(join(brassMonkeyImagesDir, "bolt.png"), 40, 14, () => sheet(boltFrames())),
  imageOutput(join(brassMonkeyImagesDir, "wrench.png"), 8, 14, () => sheet(wrenchFrames())),
  imageOutput(join(brassMonkeyImagesDir, "wrench-swing.png"), 14, 8, () => sheet(wrenchSwingFrames())),
  imageOutput(join(brassMonkeyImagesDir, "girder.png"), 8, 8, () => sheet([girder])),
  imageOutput(join(brassMonkeyImagesDir, "ladder.png"), 8, 4, () => sheet([ladder])),
  imageOutput(join(brassMonkeyImagesDir, "conveyor.png"), 96, 8, () => sheet(conveyorFrames())),
  imageOutput(join(brassMonkeyImagesDir, "door.png"), 16, 24, () => sheet([doorFrame()])),
  imageOutput(join(brassMonkeyImagesDir, "wall.png"), 32, 32, () => sheet([wallPanel])),
  imageOutput(join(brassMonkeyImagesDir, "girder-floor.png"), 224, 256, () => sheet([girderFloorRows()])),
  imageOutput(join(brassMonkeyImagesDir, "conveyor-floor.png"), 224, 256, () => sheet([conveyorFloorRows()])),
];
