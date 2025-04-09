import type { RefObject } from "react";
import type { Sprite } from "@/lib/sprite";
import { drawSprite } from "@/lib/sprite";
import type { GameState } from "@/lib/game";
import {
  GRID_SIZE,
  probabilityHash,
  calculateFrame,
  screenPosition,
} from "@/lib/util";

const CHICKEN_SPEED = 0.25;

export type Chicken = {
  x: number;
  y: number;
  frame: number;
  face: "left" | "right";
  isWalking: boolean;
  isEating: boolean;
  sprite: Sprite;
};

export function updateChickens(state: RefObject<GameState>) {
  for (const chicken of state.current.chickens) {
    if (chicken.isWalking) {
      const positionDelta =
        CHICKEN_SPEED * state.current.scale * state.current.deltaFrame;
      switch (chicken.face) {
        case "left":
          chicken.x -= positionDelta;
          break;
        case "right":
          chicken.x += positionDelta;
      }
    }

    const p = Math.random() * 100;
    if (p < 0.1) {
      chicken.face = chicken.face === "left" ? "right" : "left";
    }

    chicken.frame = calculateFrame(
      chicken.sprite,
      chicken.frame,
      state.current.deltaFrame
    );
  }
}

export function drawChickens(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.save();

  ctx.translate(state.player.x, state.player.y);

  for (const chicken of state.chickens) {
    ctx.save();

    drawSprite(
      ctx,
      chicken.sprite,
      chicken.x,
      chicken.y,
      chicken.frame,
      state.scale,
      chicken.face === "right"
    );

    ctx.restore();
  }

  ctx.restore();
}

export function getInitialChickens(sprite: Sprite, scale: number) {
  const chickens: Chicken[] = [];
  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      const p = probabilityHash(x, y, 0);
      if (p < 5) {
        chickens.push(getInitialChicken(x, y, sprite, scale));
      }
    }
  }
  return chickens;
}

export function getInitialChicken(
  x: number,
  y: number,
  sprite: Sprite,
  scale: number
) {
  const { x: screenX, y: screenY } = screenPosition(x, y, scale);
  return {
    x: screenX,
    y: screenY,
    frame: 0,
    face: "right" as const,
    isWalking: true,
    isEating: false,
    sprite,
  };
}
