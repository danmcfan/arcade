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
// its head) are one row of frames each. gen-brass-monkey-art.test.ts fails
// when the committed PNGs drift.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import {
  bolt,
  boltGlints,
  ember,
  gear,
  gnomeArmsDown,
  gnomeArmsUp,
  gnomeBody,
  monkeyClimb,
  monkeyHead,
  monkeyJump,
  monkeyOtherStep,
  monkeyStand,
  monkeyStep,
  type Part,
} from "../src/brass-monkey/art.ts";
import { sweetie } from "../src/ui/sweetie16.ts";
import { repoRoot } from "../test/parity/fixtures.ts";
import { blank, empty, flipX, mirrorX, outline, overlay, paint, type Rows } from "./pixel-art.ts";

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

/** The ember's sheet frames, outlined: two flickers, then both mirrored so it sways. */
export function emberFrames(): Rows[] {
  const frames = ember.map((rows) => outline(rows));
  return [...frames, ...frames.map((rows) => flipX(rows))];
}

/** `rows` with a white + centred on (gx, gy), painted only over the sprite's colours (not its outline). */
function glint(rows: Rows, gx: number, gy: number): string[] {
  const lit = (x: number, y: number): boolean =>
    (x === gx && Math.abs(y - gy) <= 1) || (y === gy && Math.abs(x - gx) <= 1);
  return rows.map((row, y) =>
    row
      .split("")
      .map((px, x) => (px !== empty && px !== "k" && lit(x, y) ? "w" : px))
      .join(""),
  );
}

/** The bolt's sheet frames, outlined: at rest, then one frame for each step of the glint. */
export function boltFrames(): Rows[] {
  const rest = outline(bolt);
  return [rest, ...boltGlints.map(([x, y]) => glint(rest, x, y))];
}

/** `frames` side by side, each the size of the first. */
function sheet(frames: readonly Rows[]): PNG {
  const w = frames[0]?.[0]?.length ?? 0;
  const h = frames[0]?.length ?? 0;
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
];

if (import.meta.main) {
  mkdirSync(brassMonkeyImagesDir, { recursive: true });
  for (const { file, render } of brassMonkeyArtFiles) {
    const png = render();
    writeFileSync(join(brassMonkeyImagesDir, file), PNG.sync.write(png));
    console.log(`wrote ${join(brassMonkeyImagesDir, file)} (${png.width}x${png.height})`);
  }
}
