export type Sprite = {
  image: HTMLImageElement;
  loaded: boolean;
  width: number;
  height: number;
  rows: number;
  cols: number;
  total: number;
};

type SpriteConfig = {
  width: number;
  height: number;
};

export enum SpriteID {
  BEAR = "bear.png",
  HIVE = "hive.png",
}

const spriteConfigs: Map<SpriteID, SpriteConfig> = new Map([
  [SpriteID.HIVE, { width: 304, height: 368 }],
  [SpriteID.BEAR, { width: 32, height: 32 }],
]);

export function initSprites(sprites: Map<SpriteID, Sprite>) {
  for (const [spriteID, spriteConfig] of spriteConfigs.entries()) {
    const sprite = {
      image: new Image(),
      loaded: false,
      width: spriteConfig.width,
      height: spriteConfig.height,
      rows: 0,
      cols: 0,
      total: 0,
    };
    sprite.image.src = `/${spriteID}`;
    sprite.image.onload = () => {
      sprite.loaded = true;
      sprite.rows = sprite.image.height / sprite.height;
      sprite.cols = sprite.image.width / sprite.width;
      sprite.total = sprite.rows * sprite.cols;
    };
    sprites.set(spriteID, sprite);
  }
}

export function areSpritesLoaded(sprites: Map<SpriteID, Sprite>) {
  return Array.from(sprites.values()).every((sprite) => sprite.loaded);
}

export function getSprite(sprites: Map<SpriteID, Sprite>, spriteID: SpriteID) {
  const sprite = sprites.get(spriteID);
  if (!sprite || !sprite.loaded) {
    throw new Error(`Sprite ${spriteID} not loaded`);
  }
  return sprite;
}
