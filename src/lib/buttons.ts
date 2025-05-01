import { State } from "./state";
import { getSprite, SpriteID } from "./sprite";

export function drawButtons(state: State) {
  const { ctx, sprites, gameWidth, gameHeight, keys } = state;

  const centerX = gameWidth * 0.5;
  const offsetY = 16;
  const sizeModifier = 1.5;

  const sprite = getSprite(sprites, SpriteID.BUTTONS);

  ctx.save();

  let isUp = 0;
  let isDown = 0;
  let isLeft = 0;
  let isRight = 0;

  if (keys.has("KeyD") || keys.has("ArrowRight")) {
    isRight = 2;
  } else if (keys.has("KeyA") || keys.has("ArrowLeft")) {
    isLeft = 2;
  } else if (keys.has("KeyS") || keys.has("ArrowDown")) {
    isDown = 2;
  } else if (keys.has("KeyW") || keys.has("ArrowUp")) {
    isUp = 2;
  }

  ctx.drawImage(
    sprite.image,
    isUp * sprite.width,
    0,
    sprite.width,
    sprite.height,
    centerX - sprite.width * 0.5 * sizeModifier,
    gameHeight + offsetY,
    sprite.width * sizeModifier,
    sprite.height * sizeModifier
  );

  ctx.drawImage(
    sprite.image,
    isDown * sprite.width,
    sprite.height * 1,
    sprite.width,
    sprite.height,
    centerX - sprite.width * 0.5 * sizeModifier,
    gameHeight + sprite.height * 1 * sizeModifier + offsetY,
    sprite.width * sizeModifier,
    sprite.height * sizeModifier
  );

  ctx.save();
  ctx.scale(-1, 1);
  ctx.drawImage(
    sprite.image,
    isLeft * sprite.width,
    sprite.height * 2,
    sprite.width,
    sprite.height,
    -centerX + sprite.width * 0.5 * sizeModifier,
    gameHeight + sprite.height * 0.5 * sizeModifier + offsetY,
    sprite.width * sizeModifier,
    sprite.height * sizeModifier
  );
  ctx.restore();

  ctx.drawImage(
    sprite.image,
    isRight * sprite.width,
    sprite.height * 2,
    sprite.width,
    sprite.height,
    centerX + sprite.width * 0.5 * sizeModifier,
    gameHeight + sprite.height * 0.5 * sizeModifier + offsetY,
    sprite.width * sizeModifier,
    sprite.height * sizeModifier
  );

  ctx.restore();
}
