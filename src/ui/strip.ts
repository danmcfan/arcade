// Lays out pixel-art pieces left to right in one sheet row, for icons.png and
// prizes.png.

/** One piece's rectangle in its sheet (top row 0). */
export interface StripRect {
  x: number;
  w: number;
  h: number;
}

/** `art`'s own keys, typed as its key union. */
function keysOf<K extends string>(art: Readonly<Record<K, readonly string[]>>): K[] {
  return Object.keys(art).filter((k): k is K => k in art);
}

function isComplete<K extends string>(
  rects: Partial<Record<K, StripRect>>,
  keys: readonly K[],
): rects is Record<K, StripRect> {
  return keys.every((k) => rects[k] !== undefined);
}

/** Each piece's rectangle, in `art`'s key order, `gap` pixels apart. */
export function stripRects<K extends string>(
  art: Readonly<Record<K, readonly string[]>>,
  gap: number,
): Record<K, StripRect> {
  const keys = keysOf(art);
  const rects: Partial<Record<K, StripRect>> = {};
  let x = 0;
  for (const k of keys) {
    const rows = art[k];
    const top = rows[0];
    if (top === undefined) throw new Error(`strip: ${k} has no rows`);
    rects[k] = { x, w: top.length, h: rows.length };
    x += top.length + gap;
  }
  if (!isComplete(rects, keys)) throw new Error("strip: a piece has no rectangle");
  return rects;
}
