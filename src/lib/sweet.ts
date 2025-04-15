import type { RefObject } from "react";
import type { State } from "@/lib/engine/game";
import type { SpriteSheet, Sprite } from "@/lib/engine/sprite";
import type { Grid } from "@/lib/engine/grid";
import { hasControl } from "@/lib/engine/input";
import { createSpriteSheet, getSprite } from "@/lib/engine/sprite";
import { _drawLayers } from "@/lib/engine/grid";

export type Player = {
  x: number;
  y: number;
  sprite: Sprite;
};

export type Corner = {
  x: number;
  y: number;
  color: string;
};

export type SweetState = {
  scaleModifier: number;
  gridWidth: number;
  gridHeight: number;
  gridCellSize: number;
  spriteSheets: Record<string, SpriteSheet>;
  layers: Record<number, Grid>;
  corners: Corner[];
  player: Player;
};

export function createSweetState(): SweetState {
  const playerSpriteSheet = createSpriteSheet("images/Player.png", 32, 32);
  return {
    scaleModifier: 0.5,
    gridWidth: 18,
    gridHeight: 21,
    gridCellSize: 16,
    spriteSheets: {
      grassTiles: createSpriteSheet("images/Grass_Tiles_1.png", 16, 16),
      grassMiddle: createSpriteSheet("images/Grass_1_Middle.png", 16, 16),
      pathMiddle: createSpriteSheet("images/Path_Middle.png", 16, 16),
      player: playerSpriteSheet,
    },
    layers: {
      0: {
        cells: [
          41, 42, 42, 42, 42, 42, 42, 42, 43, 41, 42, 42, 42, 42, 42, 42, 42,
          43, 49, 65, 58, 66, 65, 58, 58, 66, 51, 49, 65, 58, 58, 66, 65, 58,
          66, 51, 49, 51, 81, 49, 51, 81, 81, 49, 51, 49, 51, 81, 81, 49, 51,
          81, 49, 51, 49, 73, 42, 74, 73, 42, 42, 74, 73, 74, 73, 42, 42, 74,
          73, 42, 74, 51, 49, 65, 58, 66, 65, 66, 65, 58, 58, 58, 58, 66, 65,
          66, 65, 58, 66, 51, 49, 73, 42, 74, 51, 49, 73, 42, 43, 41, 42, 74,
          51, 49, 73, 42, 74, 51, 57, 58, 58, 66, 51, 57, 58, 66, 51, 49, 65,
          58, 59, 49, 65, 58, 58, 59, 81, 81, 81, 49, 51, 41, 42, 74, 73, 74,
          73, 42, 43, 49, 51, 81, 81, 81, 81, 81, 81, 49, 51, 49, 82, 82, 82,
          82, 82, 82, 51, 49, 51, 81, 81, 81, 42, 42, 42, 74, 73, 74, 82, 82,
          82, 82, 82, 82, 73, 74, 73, 42, 42, 42, 58, 58, 58, 66, 65, 66, 82,
          82, 82, 82, 82, 82, 65, 66, 65, 58, 58, 58, 81, 81, 81, 49, 51, 49,
          82, 82, 82, 82, 82, 82, 51, 49, 51, 81, 81, 81, 81, 81, 81, 49, 51,
          49, 65, 58, 58, 58, 58, 66, 51, 49, 51, 81, 81, 81, 41, 42, 42, 74,
          73, 74, 73, 42, 43, 41, 42, 74, 73, 74, 73, 42, 42, 43, 49, 65, 58,
          66, 65, 58, 58, 66, 51, 49, 65, 58, 58, 66, 65, 58, 66, 51, 49, 73,
          43, 49, 73, 42, 42, 74, 73, 74, 73, 42, 42, 74, 51, 41, 74, 51, 57,
          66, 51, 49, 65, 66, 65, 58, 58, 58, 58, 66, 65, 66, 51, 49, 65, 59,
          41, 74, 73, 74, 51, 49, 73, 42, 43, 41, 42, 74, 51, 49, 73, 74, 73,
          43, 49, 65, 58, 58, 59, 57, 58, 66, 51, 49, 65, 58, 59, 57, 58, 58,
          66, 51, 49, 73, 42, 42, 42, 42, 42, 74, 73, 74, 73, 42, 42, 42, 42,
          42, 74, 51, 57, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58, 58,
          58, 58, 58, 59,
        ],
        spriteSheetMap: {
          0: "grassTiles",
          1: "grassMiddle",
          2: "pathMiddle",
        },
      },
    },
    corners: [
      {
        x: 17,
        y: 17,
        color: "red",
      },
      {
        x: 17 + 16 * 3,
        y: 17,
        color: "blue",
      },
      {
        x: 17 + 16 * 7,
        y: 17,
        color: "red",
      },
    ],
    player: {
      x: 2,
      y: -4,
      sprite: getSprite(playerSpriteSheet, 0, 0),
    },
  };
}

export function update(state: RefObject<State | null>) {
  if (!state.current) return;

  if (hasControl(state.current.input, "exit")) {
    state.current.exitingGame = true;
    if (state.current.transitions.length === 0) {
      state.current.transitions.push({
        type: "fadeOut",
        time: 0,
        duration: 500,
      });
      state.current.transitions.push({
        type: "fadeIn",
        time: 0,
        duration: 500,
      });
    }
  }

  return;
}

export function draw(state: State) {
  const { ctx, scale, activeGameState } = state;

  if (!activeGameState) return;

  const {
    layers,
    spriteSheets,
    scaleModifier,
    gridWidth,
    gridCellSize,
    corners,
    player,
  } = activeGameState;

  ctx.save();

  _drawLayers(
    ctx,
    layers,
    spriteSheets,
    scale * scaleModifier,
    gridWidth,
    gridCellSize
  );

  drawCorners(ctx, corners, scale * scaleModifier);

  drawPlayer(ctx, player, scale * scaleModifier);

  ctx.restore();

  return;
}

function drawCorners(
  ctx: CanvasRenderingContext2D,
  corners: Corner[],
  scale: number
) {
  ctx.save();

  for (const corner of corners) {
    ctx.beginPath();
    ctx.fillStyle = corner.color;
    ctx.arc(corner.x * scale, corner.y * scale, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  scale: number
) {
  ctx.save();

  ctx.drawImage(
    player.sprite.image,
    player.sprite.x,
    player.sprite.y,
    player.sprite.width,
    player.sprite.height,
    player.x * scale,
    player.y * scale,
    player.sprite.width * scale,
    player.sprite.height * scale
  );

  ctx.restore();
}
