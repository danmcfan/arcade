import { RefObject } from "react";
import type { Sprite } from "@/lib/sprite";
import type { GameState } from "@/lib/game";
import { GRID_SIZE } from "./util";
import type { Hitbox } from "@/lib/hitbox";
import { drawSprite, getSprite, SpriteID } from "@/lib/sprite";
import { screenPosition, calculateFrame, probabilityHash } from "@/lib/util";
import { createHitbox } from "@/lib/hitbox";

export type Skeleton = {
  x: number;
  y: number;
  hitPoints: number;
  hitbox: Hitbox;
  frame: number;
  direction: "up" | "down" | "left" | "right";
  isWalking: boolean;
  isDead: boolean;
  damageDelay: number;
  deadDelay: number;
  sprite: Sprite;
};

export function updateSkeletons(state: RefObject<GameState>) {
  for (const skeleton of state.current.skeletons) {
    skeleton.hitbox.x = skeleton.x;
    skeleton.hitbox.y = skeleton.y;
    skeleton.hitbox.width = skeleton.sprite.width * state.current.scale;
    skeleton.hitbox.height = skeleton.sprite.height * state.current.scale;

    if (skeleton.deadDelay > 0) {
      skeleton.sprite = getSprite(
        state.current.sprites,
        SpriteID.SKELETON_DEAD
      );
    } else if (skeleton.damageDelay > 0) {
      skeleton.sprite = getSprite(
        state.current.sprites,
        SpriteID.SKELETON_DAMAGE_DOWN
      );
    } else {
      skeleton.sprite = getSprite(
        state.current.sprites,
        SpriteID.SKELETON_IDLE_DOWN
      );
    }

    skeleton.frame = calculateFrame(
      skeleton.sprite,
      skeleton.frame,
      state.current.deltaFrame
    );

    if (skeleton.damageDelay > 0) {
      skeleton.damageDelay = Math.max(
        0,
        skeleton.damageDelay - state.current.deltaFrame
      );
    }
    if (skeleton.deadDelay > 0) {
      skeleton.deadDelay = Math.max(
        0,
        skeleton.deadDelay - state.current.deltaFrame
      );
    }
  }
}

export function drawSkeletons(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.save();

  ctx.translate(state.player.x, state.player.y);

  for (const skeleton of state.skeletons) {
    if (skeleton.deadDelay === 0 && skeleton.isDead) {
      continue;
    }
    drawSprite(
      ctx,
      skeleton.sprite,
      skeleton.x,
      skeleton.y,
      skeleton.frame,
      state.scale,
      skeleton.direction === "right"
    );
    if (state.debug) {
      ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
      ctx.fillRect(
        skeleton.hitbox.x,
        skeleton.hitbox.y,
        skeleton.hitbox.width,
        skeleton.hitbox.height
      );
    }
  }

  ctx.restore();
}

export function getInitialSkeletons(sprite: Sprite, scale: number) {
  const skeletons: Skeleton[] = [];
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      const p = probabilityHash(x, y, 0);
      if (p < 1) {
        skeletons.push(getInitialSkeleton(x, y, sprite, scale));
      }
    }
  }
  return skeletons;
}

export function getInitialSkeleton(
  x: number,
  y: number,
  sprite: Sprite,
  scale: number
) {
  const { x: screenX, y: screenY } = screenPosition(x, y, scale);
  return {
    x: screenX,
    y: screenY,
    hitPoints: 2,
    hitbox: createHitbox(0, 0, 0, 0),
    frame: 0,
    direction: "down" as const,
    isWalking: false,
    isDead: false,
    damageDelay: 0,
    deadDelay: 0,
    sprite,
  };
}
