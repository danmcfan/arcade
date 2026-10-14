// Pixel-art source for the prize desk (#75), derived from its shape in
// src/arcade/desk.ts: a yellow-edged orange top with a black outline, a red
// front face with a purple foot, the glass prize case set into the long part,
// and the flap's board lifted on its hinge. src/ui/hubArt.ts draws it into the
// room (arcade.png).

import { deskFace, deskFlap, deskParts, inDeskPart, onDeskTop } from "../arcade/desk.ts";

/** The glass case's contents, tiled along it: a star, a ball, a bear, a heart and a flower (the old counter's case). */
const caseRows: readonly string[] = [
  "cwnnnnnnnnnncnnnnnnnnnnnnncnnnnnnn",
  "wnnnnynnnnnBBnnnoonoonnrrnrrnnngnn",
  "nnnyyyyynnBwBBnnooooonnrrrrrnngggn",
  "nnnnyyynnnBBBBnnoyoyonnnrrrnnnnGnn",
  "nnnnynynnnnBBnnnnooonnnnnrnnnnnGnn",
];

/** How far below the top surface the face reaches at (x, y): 1..deskFace, or 0 when not on the face. */
function faceDepth(x: number, y: number): number {
  if (onDeskTop(x, y)) return 0;
  for (let k = 1; k <= deskFace; k++) if (onDeskTop(x, y - k)) return k;
  return 0;
}

const onDesk = (x: number, y: number): boolean => onDeskTop(x, y) || faceDepth(x, y) > 0;

/** The desk's colour at (x, y) of the hub image, or null where the desk is not. */
export function deskPixel(x: number, y: number): string | null {
  if (y >= deskFlap.y && y < deskFlap.y + deskFlap.h && x >= deskFlap.x && x < deskFlap.x + deskFlap.w) {
    // The flap, lifted: a grey board on its hinge.
    return y === deskFlap.y || x === deskFlap.x || x === deskFlap.x + deskFlap.w - 1 ? "k" : "l";
  }
  if (!onDesk(x, y)) return null;
  if (!onDesk(x + 1, y) || !onDesk(x - 1, y) || !onDesk(x, y + 1) || !onDesk(x, y - 1)) return "k";
  if (onDeskTop(x, y)) {
    const glass = deskParts.find((p) => p.glass === true && inDeskPart(p, x, y));
    if (glass && y >= glass.y + 2 && y < glass.y + 7 && x >= glass.x + 3 && x < glass.x + glass.w - 3) {
      const gx = x - glass.x - 3;
      const gy = y - glass.y - 2;
      if (gx === 0 || gx === glass.w - 7 || gy === 0 || gy === 4) return "k";
      const row = caseRows[gy] ?? "";
      return row[gx % row.length] ?? "n";
    }
    return onDesk(x, y - 2) ? "o" : "y";
  }
  const k = faceDepth(x, y);
  if (k === 1) return "k";
  return k === deskFace - 1 ? "p" : "r";
}
