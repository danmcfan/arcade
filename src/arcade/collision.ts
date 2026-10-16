// Port of internal/arcade/collision.go.

/** Edge of one hub tile, in pixels. */
export const tileSize = 8;

/** Go `rect` is a value type: copy it (`{ ...r }`) wherever Go copies. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * The hub's walls: the back wall, down to where the player's head can
 * overlap it, then the frame's left, right and bottom edges, a tile thick
 * just outside it. The carpet runs out to the frame (#72), so all of it is
 * walkable.
 */
export function newWalls(): Rect[] {
  return [
    { x: 0, y: 0, w: tileSize * 20, h: tileSize * 6 },
    { x: -tileSize, y: 0, w: tileSize, h: tileSize * 18 },
    { x: tileSize * 20, y: 0, w: tileSize, h: tileSize * 18 },
    { x: 0, y: tileSize * 18, w: tileSize * 20, h: tileSize },
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
