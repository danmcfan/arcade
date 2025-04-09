import type { GameState } from "@/lib/game";
import { GRID_SIZE, TILE_SIZE } from "@/lib/util";

export function drawGrid(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.save();
  ctx.translate(state.player.x, state.player.y);

  for (let x = 0; x < GRID_SIZE; x++) {
    for (let y = 0; y < GRID_SIZE; y++) {
      ctx.strokeStyle = "#00FF00";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        x * TILE_SIZE * state.scale,
        y * TILE_SIZE * state.scale,
        TILE_SIZE * state.scale,
        TILE_SIZE * state.scale
      );

      if (x % 10 === 0 && y % 10 === 0) {
        ctx.fillStyle = "#00FF00";
        ctx.font = `${Math.max(8, state.scale * 2)}px monospace`;
        ctx.fillText(
          `${x},${y}`,
          x * TILE_SIZE * state.scale + 4,
          y * TILE_SIZE * state.scale + TILE_SIZE + 2
        );
      }
    }
  }

  ctx.restore();
}
