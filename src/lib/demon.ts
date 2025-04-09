import { RefObject } from "react";
import type { Sprite } from "@/lib/sprite";
import type { GameState } from "@/lib/game";
import type { Hitbox } from "@/lib/hitbox";
import { drawSprite } from "@/lib/sprite";
import { screenPosition, calculateFrame } from "@/lib/util";
import { createHitbox } from "@/lib/hitbox";

export type Demon = {
  x: number;
  y: number;
  hitbox: Hitbox;
  frame: number;
  sprite: Sprite;
};

export function updateDemons(state: RefObject<GameState>) {
  for (const demon of state.current.demons) {
    demon.hitbox.x = demon.x;
    demon.hitbox.y = demon.y;
    demon.hitbox.width = demon.sprite.width * state.current.scale;
    demon.hitbox.height = demon.sprite.height * state.current.scale;

    demon.frame = calculateFrame(
      demon.sprite,
      demon.frame,
      state.current.deltaFrame
    );
  }
}

export function drawDemons(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.save();

  ctx.translate(state.player.x, state.player.y);

  for (const demon of state.demons) {
    drawSprite(ctx, demon.sprite, demon.x, demon.y, demon.frame, state.scale);
    if (state.debug) {
      ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
      ctx.fillRect(
        demon.hitbox.x,
        demon.hitbox.y,
        demon.hitbox.width,
        demon.hitbox.height
      );
    }
  }

  ctx.restore();
}

export function getInitialDemons(sprite: Sprite, scale: number) {
  const demons: Demon[] = [getInitialDemon(100, 100, sprite, scale)];
  return demons;
}

export function getInitialDemon(
  x: number,
  y: number,
  sprite: Sprite,
  scale: number
) {
  const { x: screenX, y: screenY } = screenPosition(x, y, scale);
  return {
    x: screenX,
    y: screenY,
    hitbox: createHitbox(0, 0, 0, 0),
    frame: 0,
    sprite,
  };
}
