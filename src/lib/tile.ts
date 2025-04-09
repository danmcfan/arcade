import type { GameState } from "@/lib/game";
import type { Sprite } from "@/lib/sprite";
import { SpriteID, getSprite, drawSprite } from "@/lib/sprite";
import { GRID_SIZE, probabilityHash } from "@/lib/util";

export type Grid = Array<Array<0 | 1 | 2 | 3>>;

export type Background = {
  grid: Grid;
};

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  state: GameState
) {
  // Save the context state
  ctx.save();

  // Translate the context by the game state offset
  ctx.translate(state.player.x, state.player.y);

  drawGrassTiles(ctx, state);

  // Restore the context to its original state
  ctx.restore();
}

function drawGrassTiles(ctx: CanvasRenderingContext2D, state: GameState) {
  const grassTile = getSprite(state.sprites, SpriteID.GRASS_MIDDLE);
  const grass1 = getSprite(state.sprites, SpriteID.GRASS_1);
  const grass2 = getSprite(state.sprites, SpriteID.GRASS_2);
  const grass3 = getSprite(state.sprites, SpriteID.GRASS_3);

  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      const cell = state.background.grid[x][y];

      // Draw based on probability: grass1 (15%), grass2 (10%), grass3 (5%), nothing (70%)
      let sprite: Sprite | null = null;
      switch (cell) {
        case 1:
          sprite = grass1;
          break;
        case 2:
          sprite = grass2;
          break;
        case 3:
          sprite = grass3;
          break;
      }
      drawSprite(
        ctx,
        grassTile,
        x * grassTile.width * state.scale,
        y * grassTile.height * state.scale,
        0,
        state.scale
      );
      if (sprite) {
        drawSprite(
          ctx,
          sprite,
          x * grass1.width * state.scale,
          y * grass1.height * state.scale,
          Math.floor(state.currentFrame / 8) % sprite.animationFrames,
          state.scale
        );
      }
    }
  }
}

export function getInitialBackground(): Background {
  const grid = getGrid();
  return {
    grid,
  };
}

function getGrid(seed: number = 0): Grid {
  return Array.from({ length: GRID_SIZE }, (_, rowIndex) =>
    Array.from({ length: GRID_SIZE }, (_, colIndex) => {
      const p = probabilityHash(rowIndex, colIndex, seed);

      if (p < 15) return 1;
      if (p < 25) return 2;
      if (p < 30) return 3;
      return 0;
    })
  );
}
