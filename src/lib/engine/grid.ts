import type { State } from "@/lib/engine/game";
import { getSprite } from "@/lib/engine/sprite";

export type Grid = {
  cells: number[];
  spriteSheetMap: Record<number, string>;
};

export function createGrid(
  cells: number[],
  spriteSheetMap: Record<number, string>
): Grid {
  return {
    cells,
    spriteSheetMap,
  };
}

export function drawLayers(state: State) {
  const { ctx, gridWidth, gridCellSize, scale } = state;

  ctx.save();

  const { layers } = state;
  for (let z = 0; z < 10; z++) {
    if (!layers[z]) continue;
    const { cells, spriteSheetMap } = layers[z];
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];

      if (cell === 0) continue;

      // Find the correct sprite sheet for this cell
      let currentTotal = 0;
      let spriteSheet = null;
      let localIndex = cell;

      // Iterate through sprite sheets in order until we find the one containing our cell
      for (let j = 0; j < Object.keys(spriteSheetMap).length; j++) {
        spriteSheet = state.spriteSheets[spriteSheetMap[j]];
        if (!spriteSheet || !spriteSheet.loaded) continue;

        if (cell <= currentTotal + spriteSheet.total) {
          localIndex = cell - currentTotal - 1;
          break;
        }
        currentTotal += spriteSheet.total;
      }

      if (!spriteSheet || !spriteSheet.loaded) continue;

      const rowIndex = Math.floor(localIndex / spriteSheet.cols);
      const colIndex = localIndex % spriteSheet.cols;

      const x = i % gridWidth;
      const y = Math.floor(i / gridWidth);

      const sprite = getSprite(spriteSheet, rowIndex, colIndex);
      ctx.drawImage(
        sprite.image,
        sprite.x,
        sprite.y,
        sprite.width,
        sprite.height,
        Math.floor(x * gridCellSize * scale),
        Math.floor(y * gridCellSize * scale),
        Math.floor(sprite.width * scale),
        Math.floor(sprite.height * scale)
      );
    }
  }

  ctx.restore();

  if (state.debug) {
    ctx.save();

    for (const hitbox of state.collisionHitboxes) {
      ctx.fillStyle = "rgba(255, 0, 0, 0.25)";
      ctx.fillRect(
        Math.floor(hitbox.x * scale),
        Math.floor(hitbox.y * scale),
        Math.floor(hitbox.width * scale),
        Math.floor(hitbox.height * scale)
      );
    }

    ctx.restore();
  }
}
