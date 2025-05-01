import { Direction } from "../types";
import { State } from "../state";
import { SweetState } from "./state";
import { SpriteID, Sprite, getSprite } from "../sprite";

export function drawBear(
  ctx: CanvasRenderingContext2D,
  state: SweetState,
  sprites: Map<SpriteID, Sprite>
) {
  const { player } = state;
  const sprite = getSprite(sprites, SpriteID.BEAR);

  let row = 0;
  switch (player.direction) {
    case Direction.UP:
      row = 17;
      break;
    case Direction.DOWN:
      row = 18;
      break;
    case Direction.LEFT:
    case Direction.RIGHT:
      row = 1;
      break;
  }

  ctx.save();

  let dx = player.x - (sprite.width * player.size) / 2;
  const dy = player.y - (sprite.height * player.size) / 2 - 8;
  if (player.direction === Direction.LEFT) {
    ctx.scale(-1, 1);
    dx = -player.x - (sprite.width * player.size) / 2;
  }

  ctx.drawImage(
    sprite.image,
    sprite.width * Math.floor(player.frame),
    sprite.height * row,
    sprite.width,
    sprite.height,
    Math.floor(dx),
    Math.floor(dy),
    Math.floor(sprite.width * player.size),
    Math.floor(sprite.height * player.size)
  );

  ctx.restore();
}

export function drawEnemies(
  ctx: CanvasRenderingContext2D,
  state: SweetState,
  sprites: Map<SpriteID, Sprite>
) {
  const { enemies } = state;
  const sprite = getSprite(sprites, SpriteID.BEE);

  for (const enemy of enemies) {
    ctx.save();

    let dx = enemy.x - sprite.width / 2;
    const dy = enemy.y - sprite.height / 2;

    if (enemy.direction === Direction.LEFT) {
      ctx.scale(-1, 1);
      dx = -enemy.x - sprite.width / 2;
    }

    let row = 0;
    if (enemy.scaredTime > 0) {
      row = 1;
    }

    ctx.drawImage(
      sprite.image,
      sprite.width * Math.floor(enemy.frame),
      sprite.height * row,
      sprite.width,
      sprite.height,
      Math.floor(dx),
      Math.floor(dy),
      sprite.width,
      sprite.height
    );

    ctx.restore();
  }
}

export function drawPoints(
  ctx: CanvasRenderingContext2D,
  state: SweetState,
  sprites: Map<SpriteID, Sprite>
) {
  const { points } = state;
  const sprite = getSprite(sprites, SpriteID.FOOD);

  for (const point of points) {
    const dx = point.x - (sprite.width * 0.5) / 2;
    const dy = point.y - (sprite.height * 0.5) / 2;

    ctx.drawImage(
      sprite.image,
      0 * sprite.width,
      11 * sprite.height,
      sprite.width,
      sprite.height,
      Math.floor(dx),
      Math.floor(dy),
      sprite.width * 0.5,
      sprite.height * 0.5
    );
  }
}

export function drawPowers(
  ctx: CanvasRenderingContext2D,
  state: SweetState,
  sprites: Map<SpriteID, Sprite>
) {
  const { powers } = state;
  const sprite = getSprite(sprites, SpriteID.FOOD);

  for (const power of powers) {
    const dx = power.x - (sprite.width * 0.75) / 2;
    const dy = power.y - (sprite.height * 0.75) / 2;

    ctx.drawImage(
      sprite.image,
      6 * sprite.width,
      2 * sprite.height,
      sprite.width,
      sprite.height,
      Math.floor(dx),
      Math.floor(dy),
      sprite.width * 0.75,
      sprite.height * 0.75
    );
  }
}

export function drawScore(
  ctx: CanvasRenderingContext2D,
  state: State,
  score: number
) {
  const scale = state.scaleBase * state.scaleModifier;
  ctx.font = `bold ${4 * scale}px Monospace`;
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText(
    `Score: ${score.toString().padStart(4, " ")}`,
    state.gameWidth / 2,
    0
  );
}

export function drawCorners(
  ctx: CanvasRenderingContext2D,
  corners: { x: number; y: number; directions: Direction[] }[]
) {
  const radius = 1;
  const lineLength = 4; // Length of direction lines beyond the circle

  for (const corner of corners) {
    // Draw circle with transparent center and blue border
    ctx.beginPath();
    ctx.arc(corner.x, corner.y, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "blue";
    ctx.stroke();

    // Draw direction lines
    ctx.beginPath();
    for (const direction of corner.directions) {
      switch (direction) {
        case Direction.UP:
          ctx.moveTo(corner.x, corner.y);
          ctx.lineTo(corner.x, corner.y - lineLength);
          break;
        case Direction.DOWN:
          ctx.moveTo(corner.x, corner.y);
          ctx.lineTo(corner.x, corner.y + lineLength);
          break;
        case Direction.LEFT:
          ctx.moveTo(corner.x, corner.y);
          ctx.lineTo(corner.x - lineLength, corner.y);
          break;
        case Direction.RIGHT:
          ctx.moveTo(corner.x, corner.y);
          ctx.lineTo(corner.x + lineLength, corner.y);
          break;
      }
    }
    ctx.strokeStyle = "blue";
    ctx.stroke();
  }
}
