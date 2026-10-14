// Pixel-art source for the prize desk (#75, redrawn in #88), drawn over
// `deskRect` in src/arcade/desk.ts. After the Celadon Dept Store 4F counter in
// Fire Red, at its sizes: a charcoal top with rounded corners and a grey lip
// along its front edge, a cyan band under the back run seen inside the U, the
// 4F placemat where the player talks to the employee, and each arm ending in
// the 4F counter's rounded end. src/ui/hubArt.ts draws it into the room
// (arcade.png).

import { deskRect } from "../arcade/desk.ts";

/** The desk drawn whole, `deskRect`'s size; `.` is where the desk is not. */
export const deskRows: readonly string[] = [
  ".....kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.....",
  "...kkddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddkk...",
  "..kddddddddddddddddddddddddddddddddddkkkkkkkkkkkkkkddddddddddddddddddddddddddddddddddk..",
  ".kddddddddddddddddddddddddddddddddddkGGGGGGGGGGGGGGkddddddddddddddddddddddddddddddddddk.",
  ".kddddddddddddddddddddddddddddddddddkGGyyyyyyyyyyGGkddddddddddddddddddddddddddddddddddk.",
  "kmddddddddddddddddddddddddddddddddddkGyyyyyyyyyyyyGkddddddddddddddddddddddddddddddddddmk",
  "kmddddddddddddddddddddddddddddddddddkGyyyyyyyyyyyyGkddddddddddddddddddddddddddddddddddmk",
  "kmddddddddddddddddddddddddddddddddddkGyyyyyyyyyyyyGkddddddddddddddddddddddddddddddddddmk",
  "kmddddddddddddddddddddddddddddddddddkGyyyyyyyyyyyyGkddddddddddddddddddddddddddddddddddmk",
  "kmddddddddddddddddddddddddddddddddddkGGyyyyyyyyyyGGkddddddddddddddddddddddddddddddddddmk",
  "kmddddddddddddddddddddddddddddddddddkGGGGGGGGGGGGGGkddddddddddddddddddddddddddddddddddmk",
  "kmdddddddddddddddddddddddddddddddddddkkkkkkkkkkkkkkdddddddddddddddddddddddddddddddddddmk",
  "kmddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddmk",
  "kmddddddddddddmkmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmkmddddddddddddmk",
  "kmddddddddddddmkmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmkmddddddddddddmk",
  "kmddddddddddddmkmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmkmddddddddddddmk",
  "kmddddddddddddmkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkmddddddddddddmk",
  "kmddddddddddddmkBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBkmddddddddddddmk",
  "kmddddddddddddmkBccccccBBccccccBBccccccBBccccccBBccccccBBccccccBBccccccBkmddddddddddddmk",
  "kmddddddddddddmkBccccccBBccccccBBccccccBBccccccBBccccccBBccccccBBccccccBkmddddddddddddmk",
  "kmddddddddddddmkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkmddddddddddddmk",
  "kmddddddddddddmk........................................................kmddddddddddddmk",
  "kmddddddddddddmk........................................................kmddddddddddddmk",
  "kmddddddddddddmk........................................................kmddddddddddddmk",
  "kmddddddddddddmk........................................................kmddddddddddddmk",
  "kmddddddddddddmk........................................................kmddddddddddddmk",
  "kmddddddddddddmk........................................................kmddddddddddddmk",
  "kmmddddddddddmmk........................................................kmmddddddddddmmk",
  "kmmmmddddddmmmmk........................................................kmmmmddddddmmmmk",
  "kkmmmmmmmmmmmmkk........................................................kkmmmmmmmmmmmmkk",
  "kkkmmmmmmmmmmkkk........................................................kkkmmmmmmmmmmkkk",
  "kkBkkmmmmmmkkBkk........................................................kkBkkmmmmmmkkBkk",
  "kkBBBkkkkkkBBBkk........................................................kkBBBkkkkkkBBBkk",
  "kkBBBBBBBBBBBBkk........................................................kkBBBBBBBBBBBBkk",
  "kkkBBBcBBcBBBkkk........................................................kkkBBBcBBcBBBkkk",
  "kkkkkBcBBcBkkkkk........................................................kkkkkBcBBcBkkkkk",
  "kkkkkkkkkkkkkkkk........................................................kkkkkkkkkkkkkkkk",
];

/** The desk's colour at (x, y) of the hub image, or null where the desk is not. */
export function deskPixel(x: number, y: number): string | null {
  const px = deskRows[y - deskRect.y]?.[x - deskRect.x];
  return px === undefined || px === "." ? null : px;
}
