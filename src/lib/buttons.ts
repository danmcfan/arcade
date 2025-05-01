import { State } from "./state";
import { getSprite, SpriteID } from "./sprite";

export function drawButtons(state: State) {
  const { ctx, sprites, gameWidth, gameHeight } = state;

  const centerX = gameWidth * 0.5;
  const offsetY = 16;
  const sizeModifier = 1.5;

  const sprite = getSprite(sprites, SpriteID.BUTTONS);

  ctx.save();

  ctx.drawImage(
    sprite.image,
    0,
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
    0,
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
    0,
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
    0,
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
