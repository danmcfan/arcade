export type Hitbox = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  collisionIds: Set<string>;
};

export function createHitbox(
  x: number = 0,
  y: number = 0,
  width: number = 0,
  height: number = 0
) {
  return {
    id: crypto.randomUUID(),
    x,
    y,
    width,
    height,
    collisionIds: new Set([]),
  };
}

export function overlap(hitbox1: Hitbox, hitbox2: Hitbox) {
  return (
    hitbox1.x < hitbox2.x + hitbox2.width &&
    hitbox1.x + hitbox1.width > hitbox2.x &&
    hitbox1.y < hitbox2.y + hitbox2.height &&
    hitbox1.y + hitbox1.height > hitbox2.y
  );
}
