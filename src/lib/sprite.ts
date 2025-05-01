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
  BUTTONS = "Buttons.png",
  PLAYER = "Player.png",
  WOOD_FLOOR_TILES = "WoodFloorTiles.png",
  INTERIOR_WALLS = "InteriorWalls.png",
  GREEN_MACHINE = "GreenMachine.png",
  BEAR = "Bear.png",
  BEE = "Bee.png",
  FOOD = "Food.png",
  GRASS_MIDDLE = "GrassMiddle.png",
  GRASS_TILES = "GrassTiles.png",
  PATH_MIDDLE = "PathMiddle.png",
}

const spriteConfigs: Map<SpriteID, SpriteConfig> = new Map([
  [SpriteID.BUTTONS, { width: 16, height: 16 }],
  [SpriteID.PLAYER, { width: 32, height: 32 }],
  [SpriteID.WOOD_FLOOR_TILES, { width: 16, height: 16 }],
  [SpriteID.INTERIOR_WALLS, { width: 16, height: 16 }],
  [SpriteID.GREEN_MACHINE, { width: 16, height: 32 }],
  [SpriteID.BEAR, { width: 32, height: 32 }],
  [SpriteID.BEE, { width: 16, height: 16 }],
  [SpriteID.FOOD, { width: 16, height: 16 }],
  [SpriteID.GRASS_MIDDLE, { width: 16, height: 16 }],
  [SpriteID.GRASS_TILES, { width: 16, height: 16 }],
  [SpriteID.PATH_MIDDLE, { width: 16, height: 16 }],
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
    sprite.image.src = `/images/${spriteID}`;
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
