// Port of internal/arcade/collision.go.

import { tileSize } from "./state.ts";

/** Go `rect` is a value type: copy it (`{ ...r }`) wherever Go copies. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function newWalls(): Rect[] {
  return [
    { x: 0, y: 0, w: tileSize * 20, h: tileSize * 6 },
    { x: 0, y: tileSize * 6, w: tileSize * 3, h: tileSize * 9 },
    { x: tileSize * 17, y: tileSize * 6, w: tileSize * 3, h: tileSize * 9 },
    { x: 0, y: tileSize * 15, w: tileSize * 20, h: tileSize * 3 },
  ];
}

export function checkCollision(a: Rect, b: Rect): boolean {
  const leftA = a.x;
  const rightA = leftA + a.w;
  const topA = a.y;
  const bottomA = topA + a.h;

  const leftB = b.x;
  const rightB = leftB + b.w;
  const topB = b.y;
  const bottomB = topB + b.h;

  return leftA < rightB && rightA > leftB && topA < bottomB && bottomA > topB;
}

export function checkCollisions(a: Rect, bs: readonly Rect[]): boolean {
  for (const b of bs) {
    if (checkCollision(a, b)) {
      return true;
    }
  }
  return false;
}
