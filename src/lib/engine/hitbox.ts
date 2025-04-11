export type Hitbox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export function createHitbox(
  x: number,
  y: number,
  width: number,
  height: number
): Hitbox {
  return {
    x,
    y,
    width,
    height,
  };
}

export function intersects(a: Hitbox, b: Hitbox): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}
