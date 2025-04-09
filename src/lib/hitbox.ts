export type Hitbox = {
  id: number;
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
    id: Math.floor(Math.random() * Number.MAX_SAFE_INTEGER),
    x,
    y,
    width,
    height,
  };
}

export function checkCollision(hitbox1: Hitbox, hitbox2: Hitbox) {
  return (
    hitbox1.x < hitbox2.x + hitbox2.width &&
    hitbox1.x + hitbox1.width > hitbox2.x &&
    hitbox1.y < hitbox2.y + hitbox2.height &&
    hitbox1.y + hitbox1.height > hitbox2.y
  );
}
