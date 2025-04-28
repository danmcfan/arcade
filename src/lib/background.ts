import { SpriteID, Sprite, getSprite } from "./sprite";

export type Background = {
  cells: number[];
  spriteIDs: SpriteID[];
  width: number;
};

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  background: Background,
  sprites: Map<SpriteID, Sprite>
) {
  const { cells, spriteIDs, width } = background;

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    if (cell === 0) {
      continue;
    }

    let currentTotal = 0;
    let sprite = null;
    let localIndex = cell;

    for (let j = 0; j < spriteIDs.length; j++) {
      const spriteID = spriteIDs[j];
      sprite = getSprite(sprites, spriteID);
      if (cell <= currentTotal + sprite.total) {
        localIndex = cell - currentTotal - 1;
        break;
      }
      currentTotal += sprite.total;
    }

    if (!sprite) {
      continue;
    }

    const rowIndex = Math.floor(localIndex / sprite.cols);
    const colIndex = localIndex % sprite.cols;

    const x = i % width;
    const y = Math.floor(i / width);

    ctx.drawImage(
      sprite.image,
      Math.floor(colIndex * sprite.width),
      Math.floor(rowIndex * sprite.height),
      sprite.width,
      sprite.height,
      Math.floor(x * sprite.width),
      Math.floor(y * sprite.height),
      sprite.width,
      sprite.height
    );
  }
}
