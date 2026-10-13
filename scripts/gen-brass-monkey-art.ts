// Build Brass Monkey's character art from its source in src/brass-monkey/art.ts:
//
//   bun run art      # also writes src/assets/images/brass-monkey/*.png
//
// Each frame is built from the source's parts and gets a 1 px black outline.
// monkey.png is one row of 16×16 frames: walk 1-3 (the head over each body,
// 1 px lower on a step), jump, climb and climb mirrored. gnome.png is one row
// of 32×32 frames, the body with each arm part, mirrored from its left half:
// idle, throw. gen-brass-monkey-art.test.ts fails when the committed PNGs
// drift.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import {
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

/** `frames` side by side, each `size` square. */
function sheet(frames: readonly Rows[], size: number): PNG {
  const png = blank(size * frames.length, size);
  frames.forEach((rows, i) => {
    paint(png, rows, sweetie, i * size, 0);
  });
  return png;
}

export const brassMonkeyImagesDir = join(repoRoot, "src/assets/images/brass-monkey");

/** Every generated Brass Monkey image: its file in src/assets/images/brass-monkey and how to draw it. */
export const brassMonkeyArtFiles: readonly { file: string; render: () => PNG }[] = [
  { file: "monkey.png", render: () => sheet(monkeyFrames(), 16) },
  { file: "gnome.png", render: () => sheet(gnomeFrames(), 32) },
];

if (import.meta.main) {
  mkdirSync(brassMonkeyImagesDir, { recursive: true });
  for (const { file, render } of brassMonkeyArtFiles) {
    const png = render();
    writeFileSync(join(brassMonkeyImagesDir, file), PNG.sync.write(png));
    console.log(`wrote ${join(brassMonkeyImagesDir, file)} (${png.width}x${png.height})`);
  }
}
