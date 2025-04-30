import { Direction } from "../types";
import { State } from "../state";
import { SpriteID, getSprite } from "../sprite";

export function drawPlayer(state: State) {
  const { ctx, player } = state;
  const { x, y, direction, running, frame } = player;

  let row = 0;
  switch (direction) {
    case Direction.UP:
      row = 2;
      break;
    case Direction.DOWN:
      row = 0;
      break;
    case Direction.LEFT:
      row = 1;
      break;
    case Direction.RIGHT:
      row = 1;
      break;
  }

  if (running) {
    row += 3;
  }

  const sprite = getSprite(state.sprites, SpriteID.PLAYER);

  ctx.save();

  let dx = x - sprite.width * 0.5;
  if (direction === Direction.LEFT) {
    ctx.scale(-1, 1);
    dx = -x - sprite.width * 0.5;
  }

  ctx.drawImage(
    sprite.image,
    sprite.width * Math.floor(frame),
    sprite.height * row,
    sprite.width,
    sprite.height,
    Math.floor(dx),
    Math.floor(y - sprite.height * 0.5),
    sprite.width,
    sprite.height
  );

  ctx.restore();
}

export function drawMachines(state: State) {
  const { ctx, machines } = state;

  for (const machine of machines) {
    const { x, y, spriteID, frame } = machine;

    const sprite = getSprite(state.sprites, spriteID);

    ctx.drawImage(
      sprite.image,
      sprite.width * Math.floor(frame),
      sprite.height * 0,
      sprite.width,
      sprite.height,
      Math.floor(x),
      Math.floor(y),
      sprite.width,
      sprite.height
    );
  }
}
