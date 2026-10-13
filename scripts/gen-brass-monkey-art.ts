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
// its head) are one row of frames each. The floor tiles are girder.png (8×8),
// ladder.png (8×4, its rows by height), conveyor.png (8×8: the left end,
// middle and right end, 4 frames each), door.png (16×24, outlined but for its
// foot) and wall.png (32×32), none outlined but the door. girder-floor.png
// and conveyor-floor.png (224×256) are the two floors drawn from them, laid
// out by src/brass-monkey/floors.ts (the conveyors in their first frame; the
// game moves them). gen-brass-monkey-art.test.ts fails when the
// committed PNGs drift.

import { mkdirSync, writeFileSync } from "node:fs";
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
} from "../src/brass-monkey/art.ts";
import { conveyorFloor, girderFloor, girderTop, type Floor } from "../src/brass-monkey/floors.ts";
import { sweetie } from "../src/ui/sweetie16.ts";
import { repoRoot } from "../test/parity/fixtures.ts";
import { blank, checkRows, empty, flipX, glint, mirrorX, outline, overlay, paint, type Rows } from "./pixel-art.ts";

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

export const brassMonkeyImagesDir = join(repoRoot, "src/assets/images/brass-monkey");

/** Every generated Brass Monkey image: its file in src/assets/images/brass-monkey and how to draw it. */
export const brassMonkeyArtFiles: readonly { file: string; render: () => PNG }[] = [
  { file: "monkey.png", render: () => sheet(monkeyFrames()) },
  { file: "gnome.png", render: () => sheet(gnomeFrames()) },
  { file: "gear.png", render: () => sheet(gearFrames()) },
  { file: "ember.png", render: () => sheet(emberFrames()) },
  { file: "bolt.png", render: () => sheet(boltFrames()) },
  { file: "girder.png", render: () => sheet([girder]) },
  { file: "ladder.png", render: () => sheet([ladder]) },
  { file: "conveyor.png", render: () => sheet(conveyorFrames()) },
  { file: "door.png", render: () => sheet([doorFrame()]) },
  { file: "wall.png", render: () => sheet([wallPanel]) },
  { file: "girder-floor.png", render: () => sheet([girderFloorRows()]) },
  { file: "conveyor-floor.png", render: () => sheet([conveyorFloorRows()]) },
];

if (import.meta.main) {
  mkdirSync(brassMonkeyImagesDir, { recursive: true });
  for (const { file, render } of brassMonkeyArtFiles) {
    const png = render();
    writeFileSync(join(brassMonkeyImagesDir, file), PNG.sync.write(png));
    console.log(`wrote ${join(brassMonkeyImagesDir, file)} (${png.width}x${png.height})`);
  }
}
