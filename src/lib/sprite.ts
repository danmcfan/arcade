export type Sprite = {
  image: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
};

export function createSprite(
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number
): Sprite {
  return {
    image,
    x,
    y,
    width,
    height,
  };
}

export function createImage(path: string): HTMLImageElement {
  const image = new Image();
  image.src = path;
  return image;
}
