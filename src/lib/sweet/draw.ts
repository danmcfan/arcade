import { Direction, State } from "../state";
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
  ctx.clearRect(
    0,
    -80 * state.scale,
    state.gameWidth * state.scale,
    80 * state.scale
  );
  ctx.font = `bold ${6 * state.scale}px Monospace`;
  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.fillText(
    `Score: ${score.toString().padStart(4, " ")}`,
    state.gameWidth / 2,
    -2 * state.scale
  );
}
