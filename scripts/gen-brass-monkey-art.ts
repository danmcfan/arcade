// Build Brass Monkey's character art from its source in src/brass-monkey/art.ts:
//
//   bun run art      # also writes src/assets/images/brass-monkey/*.png
//
// Each source frame is a fill; every frame here gets a 1 px black outline.
// monkey.png is one row of 16×16 frames: walk 1-3, jump, climb and climb
// mirrored. gnome.png is one row of 32×32 frames, each mirrored from its left
// half: idle, throw. gen-brass-monkey-art.test.ts fails when the committed PNGs
// drift.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { gnomeIdle, gnomeThrow, monkeyClimb, monkeyJump, monkeyWalk } from "../src/brass-monkey/art.ts";
import { sweetie } from "../src/ui/sweetie16.ts";
import { repoRoot } from "../test/parity/fixtures.ts";
import { blank, flipX, mirrorX, outline, paint, type Rows } from "./pixel-art.ts";

/** The monkey's sheet frames, outlined, in sheet order. */
export function monkeyFrames(): string[][] {
  const climb = outline(monkeyClimb);
  return [...monkeyWalk.map((rows) => outline(rows)), outline(monkeyJump), climb, flipX(climb)];
}

/** The Gnome's sheet frames, mirrored and outlined: idle, throw. */
export function gnomeFrames(): string[][] {
  return [gnomeIdle, gnomeThrow].map((half) => outline(mirrorX(half)));
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
