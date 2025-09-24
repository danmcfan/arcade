export enum SpriteSheetID {
  ARCADE = "arcade.png",
  BEAR = "bear.png",
  BEE = "bee.png",
  GAMER = "gamer.png",
  HIVE = "hive.png",
  SWEET_SAM_TITLE = "sweet-sam-title.png",
}

export type SpriteSheet = {
  image: HTMLImageElement;
  loaded: boolean;
  width: number;
  height: number;
  rows: number;
  cols: number;
  total: number;
};

export type SpriteSheetConfig = {
  width: number;
  height: number;
};

export function createSpriteSheets(
  spriteSheetConfigs: Map<SpriteSheetID, SpriteSheetConfig>
): Map<SpriteSheetID, SpriteSheet> {
  const spriteSheets = new Map<SpriteSheetID, SpriteSheet>();
  for (const [
    spriteSheetID,
    spriteSheetConfig,
  ] of spriteSheetConfigs.entries()) {
    const sprite = {
      image: new Image(),
      loaded: false,
      width: spriteSheetConfig.width,
      height: spriteSheetConfig.height,
      rows: 0,
      cols: 0,
      total: 0,
    };
    sprite.image.src = `/${spriteSheetID}`;
    sprite.image.onload = () => {
      sprite.loaded = true;
      sprite.rows = sprite.image.height / sprite.height;
      sprite.cols = sprite.image.width / sprite.width;
      sprite.total = sprite.rows * sprite.cols;
    };
    spriteSheets.set(spriteSheetID, sprite);
  }
  return spriteSheets;
}

export function areSpritesLoaded(sprites: Map<string, SpriteSheet>) {
  return Array.from(sprites.values()).every((sprite) => sprite.loaded);
}

export function getSpriteSheet(
  spriteSheets: Map<SpriteSheetID, SpriteSheet>,
  spriteSheetID: SpriteSheetID
) {
  const spriteSheet = spriteSheets.get(spriteSheetID);
  if (!spriteSheet || !spriteSheet.loaded) {
    throw new Error(`Sprite sheet ${spriteSheetID} not loaded`);
  }
  return spriteSheet;
}
