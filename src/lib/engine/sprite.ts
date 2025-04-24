export type SpriteSheet = {
  image: HTMLImageElement;
  loaded: boolean;
  width: number;
  height: number;
  rows: number;
  cols: number;
  total: number;
  spriteWidth: number;
  spriteHeight: number;
};

export type Sprite = {
  image: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
};

export function createSpriteSheet(
  src: string,
  spriteWidth: number,
  spriteHeight: number
): SpriteSheet {
  const spriteSheet = {
    image: new Image(),
    loaded: false,
    width: 0,
    height: 0,
    rows: 0,
    cols: 0,
    total: 0,
    spriteWidth,
    spriteHeight,
  };

  spriteSheet.image.src = src;
  spriteSheet.image.onload = () => {
    spriteSheet.loaded = true;
    spriteSheet.width = spriteSheet.image.width;
    spriteSheet.height = spriteSheet.image.height;
    spriteSheet.rows = spriteSheet.height / spriteHeight;
    spriteSheet.cols = spriteSheet.width / spriteWidth;
    spriteSheet.total = spriteSheet.rows * spriteSheet.cols;
  };
  return spriteSheet;
}

export function getSprite(
  spriteSheet: SpriteSheet,
  row: number,
  col: number,
  offsetX: number = 0,
  offsetY: number = 0
): Sprite {
  if (spriteSheet.loaded) {
    if (
      row < 0 ||
      row >= spriteSheet.rows ||
      col < 0 ||
      col >= spriteSheet.cols
    ) {
      throw new Error("Invalid sprite index");
    }
  }

  return {
    image: spriteSheet.image,
    x: col * spriteSheet.spriteWidth,
    y: row * spriteSheet.spriteHeight,
    width: spriteSheet.spriteWidth,
    height: spriteSheet.spriteHeight,
    offsetX: offsetX,
    offsetY: offsetY,
  };
}
