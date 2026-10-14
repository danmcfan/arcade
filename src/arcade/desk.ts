// The prize desk (#75, redrawn in #88): a U-shaped counter across the bottom
// of the hub, after the Celadon Dept Store 4F counter in Fire Red. Its back
// run faces the player; its two arms run down to rounded ends on the bottom
// row, with the employee locked inside. The art (src/ui/deskArt.ts) is drawn
// over `deskRect`, and the collision comes from it too.

import type { Rect } from "./collision.ts";

/** The desk's bounds in the hub image: the back run's top edge to the arms' rounded ends. */
export const deskRect: Rect = { x: 36, y: 107, w: 88, h: 37 };

/** Where the employee stands, top-left of their 16x24 sprite: inside the U, head just under the placemat. */
export const employeeSpot = { x: 72, y: 116 } as const;

/** The bottom wall's top edge: collision stops there, as the wall below is solid anyway. */
const bottomWallY = 120;

/**
 * The desk's collision rects, the prize counter the player faces to open the
 * menu: the whole U down to the bottom wall. The back run reaches below the
 * wall, so the inside of the U is never reachable.
 */
export const counterRects: readonly Rect[] = [{ ...deskRect, h: bottomWallY - deskRect.y }];
