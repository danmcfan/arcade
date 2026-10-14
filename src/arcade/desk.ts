// The prize desk (#75): a long curved counter across the bottom of the hub,
// its arms running down to the bottom wall, with a lifted flap at its right
// end. The employee stands inside it. The parts are the desk's top surface;
// a front face `deskFace` px tall hangs below each. The art (src/ui/deskArt.ts)
// and the collision rects both come from these parts.

import type { Rect } from "./collision.ts";

/** One part of the desk's top: a rectangle with some corners rounded, `glass` for the prize case. */
export interface DeskPart extends Rect {
  glass?: boolean;
  round?: { tl?: number; tr?: number; bl?: number; br?: number };
}

/** Height of the front face below the top surface. */
export const deskFace = 6;

export const deskParts: readonly DeskPart[] = [
  { x: 32, y: 106, w: 96, h: 8, glass: true, round: { tl: 5, tr: 5 } },
  { x: 32, y: 108, w: 10, h: 22, round: { bl: 6 } },
  { x: 118, y: 108, w: 10, h: 22, round: { br: 6 } },
];

/** The flap: a gap in the desk's top (x, w); its board stands lifted at y..y+h. */
export const deskFlap = { x: 104, w: 6, y: 103, h: 4 } as const;

/** Where the employee stands, top-left of their 16x24 sprite: inside the desk, behind its front. */
export const employeeSpot = { x: 72, y: 108 } as const;

/** The bottom wall's top edge: collision stops there, as the wall below is solid anyway. */
const bottomWallY = 120;

/** Whether (x, y) is on part `p`'s top surface, its rounded corners cut off. */
export function inDeskPart(p: DeskPart, x: number, y: number): boolean {
  if (x < p.x || x >= p.x + p.w || y < p.y || y >= p.y + p.h) return false;
  const r = p.round ?? {};
  const outside = (rad: number, cx: number, cy: number): boolean => (x - cx) ** 2 + (y - cy) ** 2 > rad * rad;
  const { tl = 0, tr = 0, bl = 0, br = 0 } = r;
  if (tl > 0 && x < p.x + tl && y < p.y + tl && outside(tl, p.x + tl - 0.5, p.y + tl - 0.5)) return false;
  if (tr > 0 && x >= p.x + p.w - tr && y < p.y + tr && outside(tr, p.x + p.w - tr - 0.5, p.y + tr - 0.5)) return false;
  if (bl > 0 && x < p.x + bl && y >= p.y + p.h - bl && outside(bl, p.x + bl - 0.5, p.y + p.h - bl - 0.5)) return false;
  if (br > 0 && x >= p.x + p.w - br && y >= p.y + p.h - br && outside(br, p.x + p.w - br - 0.5, p.y + p.h - br - 0.5))
    return false;
  return true;
}

/** Whether (x, y) is on the desk's top surface (not in the flap's gap). */
export function onDeskTop(x: number, y: number): boolean {
  if (x >= deskFlap.x && x < deskFlap.x + deskFlap.w) return false;
  return deskParts.some((p) => inDeskPart(p, x, y));
}

/**
 * The desk's collision rects, the prize counter the player faces to open the
 * menu: each part's top plus its face, clipped at the bottom wall. The flap
 * splits the part it crosses; its gap is too narrow for the player.
 */
export const counterRects: readonly Rect[] = deskParts.flatMap((p): Rect[] => {
  const h = Math.min(bottomWallY, p.y + p.h + deskFace) - p.y;
  const left = deskFlap.x - p.x;
  if (left > 0 && deskFlap.x + deskFlap.w < p.x + p.w) {
    return [
      { x: p.x, y: p.y, w: left, h },
      { x: deskFlap.x + deskFlap.w, y: p.y, w: p.x + p.w - deskFlap.x - deskFlap.w, h },
    ];
  }
  return [{ x: p.x, y: p.y, w: p.w, h }];
});
