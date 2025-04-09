import type { State } from "@/lib/game";
import type { Entity } from "@/lib/entity";
import { createImage, createSprite } from "@/lib/sprite";
import { createEntity, drawEntity } from "@/lib/entity";
import { TILE_SIZE } from "@/lib/utils";

export type Frame = {
  text: string;
  letters: Entity[];
  frames: Entity[];
};

// Constants for frame layout
const FRAME_PADDING = 2; // Padding in tiles
const LETTER_WIDTH = 6; // Width of each letter in pixels
const LETTER_DRAW_WIDTH = 7; // Width of each letter in pixels
const LETTER_HEIGHT = 8; // Height of each letter in pixels
const FRAME_TILE_SIZE = 16; // Size of frame tiles in pixels

export function createFrame(state: State, text: string): Frame {
  const { scale, width, height } = state;
  const tileSizeScaled = TILE_SIZE * scale;
  const letterSizeScaled = LETTER_DRAW_WIDTH * scale;
  const frameTileSizeScaled = FRAME_TILE_SIZE * scale;
  const verticalOffset = height / 2 - (tileSizeScaled * 14) / 2;

  // Calculate frame dimensions based on text length
  const textWidth = text.length * letterSizeScaled;
  const frameWidth = Math.max(
    textWidth + FRAME_PADDING * 2 * frameTileSizeScaled,
    frameTileSizeScaled * 3 // Minimum width of 3 tiles
  );

  // Calculate number of middle tiles needed
  const middleTilesCount = Math.ceil(frameWidth / frameTileSizeScaled) - 2; // Subtract corners

  const imageFrames = createImage("/images/UI_Frames.png");
  const spriteFrames = {
    topLeft: createSprite(imageFrames, 0, 0, 16, 16),
    top: createSprite(imageFrames, 16, 0, 16, 16),
    topRight: createSprite(imageFrames, 32, 0, 16, 16),
    left: createSprite(imageFrames, 0, 16, 16, 16),
    center: createSprite(imageFrames, 16, 16, 16, 16),
    right: createSprite(imageFrames, 32, 16, 16, 16),
    bottomLeft: createSprite(imageFrames, 0, 32, 16, 16),
    bottom: createSprite(imageFrames, 16, 32, 16, 16),
    bottomRight: createSprite(imageFrames, 32, 32, 16, 16),
  };

  // Create frame grid
  const frameGrid = [
    [
      spriteFrames.topLeft,
      ...Array(middleTilesCount).fill(spriteFrames.top),
      spriteFrames.topRight,
    ],
    [
      spriteFrames.left,
      ...Array(middleTilesCount).fill(spriteFrames.center),
      spriteFrames.right,
    ],
    [
      spriteFrames.bottomLeft,
      ...Array(middleTilesCount).fill(spriteFrames.bottom),
      spriteFrames.bottomRight,
    ],
  ];

  // Create frame entities
  const frames: Entity[] = [];
  for (let y = 0; y < frameGrid.length; y++) {
    const row = frameGrid[y];
    for (let x = 0; x < row.length; x++) {
      const sprite = row[x];
      const entity = createEntity(sprite, {
        x: x * frameTileSizeScaled + (width / 2 - frameWidth / 2),
        y: y * frameTileSizeScaled + verticalOffset,
      });
      frames.push(entity);
    }
  }

  // Create text entities
  const imageFont = createImage("/images/Font.png");
  const characters = text.toLowerCase().split("");
  const letters: Entity[] = [];

  for (let i = 0; i < characters.length; i++) {
    const character = characters[i];
    const col = character.charCodeAt(0) - 97;

    if (col < 0 || col > 25) {
      continue;
    }

    const sprite = createSprite(
      imageFont,
      col * LETTER_WIDTH,
      0,
      LETTER_WIDTH,
      LETTER_HEIGHT
    );
    const entity = createEntity(sprite, {
      x: i * letterSizeScaled + (width / 2 - textWidth / 2),
      y: (frameTileSizeScaled * 2.5) / 2 + verticalOffset,
    });
    letters.push(entity);
  }

  return { text, frames, letters };
}

export function drawFrame(state: State, frame: Frame) {
  for (const entity of frame.frames) {
    drawEntity(state, entity);
  }

  for (const entity of frame.letters) {
    drawEntity(state, entity);
  }
}
