import type { State } from "@/lib/game";
import type { Sprite } from "@/lib/sprite";
import type { Hitbox } from "@/lib/hitbox";

export type Entity = {
  sprite: Sprite;
  position: { x: number; y: number };
  hitbox: Hitbox | null;
  frame: number;
  direction: "up" | "down" | "left" | "right" | null;
  isWalking: boolean;
};

export function createEntity(
  sprite: Sprite,
  position: { x: number; y: number }
): Entity {
  return {
    sprite,
    position,
    hitbox: null,
    frame: 0,
    direction: null,
    isWalking: false,
  };
}

export function drawEntity(state: State, entity: Entity) {
  const { sprite, position } = entity;
  const { image, width, height } = sprite;
  const { ctx, scale } = state;

  ctx.save();

  let dx = Math.floor(position.x);
  let dy = Math.floor(position.y);

  ctx.save();

  if (entity.direction === "left") {
    ctx.scale(-1, 1);
    dx = Math.floor(-position.x - sprite.width * scale);
  }

  ctx.drawImage(
    image,
    sprite.x,
    sprite.y,
    width,
    height,
    dx,
    dy,
    Math.floor(width * scale),
    Math.floor(height * scale)
  );

  ctx.restore();

  if (entity.hitbox && state.debug) {
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    ctx.fillRect(
      entity.hitbox.x,
      entity.hitbox.y,
      entity.hitbox.width,
      entity.hitbox.height
    );
  }

  ctx.restore();
}
