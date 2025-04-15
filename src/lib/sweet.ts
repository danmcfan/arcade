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
  timeDelta: number;
  frame: number;
};

export type Bee = {
  x: number;
  y: number;
  sprite: Sprite;
  timeDelta: number;
  frame: number;
};

export type Consumable = {
  x: number;
  y: number;
  sprite: Sprite;
  timeDelta: number;
  raising: boolean;
  raised: number;
};

export type SweetState = {
  scaleModifier: number;
  gridWidth: number;
  gridHeight: number;
  gridCellSize: number;
  spriteSheets: Record<string, SpriteSheet>;
  layers: Record<number, Grid>;
  player: Player;
  bees: Bee[];
  berries: Consumable[];
  powerUps: Consumable[];
};

export function createSweetState(): SweetState {
  const playerSpriteSheet = createSpriteSheet("images/Player.png", 32, 32);
  const beeSpriteSheet = createSpriteSheet("images/Bee.png", 16, 16);
  const foodSpriteSheet = createSpriteSheet("images/Food.png", 16, 16);
  return {
    scaleModifier: 0.5,
    gridWidth: 18,
    gridHeight: 21,
    gridCellSize: 16,
    spriteSheets: {
      grassTiles: createSpriteSheet("images/GrassTiles.png", 16, 16),
      grassMiddle: createSpriteSheet("images/GrassMiddle.png", 16, 16),
      pathMiddle: createSpriteSheet("images/PathMiddle.png", 16, 16),
      player: playerSpriteSheet,
      bee: beeSpriteSheet,
      food: foodSpriteSheet,
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
          82, 82, 82, 51, 49, 51, 81, 81, 81, 41, 42, 42, 74, 73, 74, 82, 82,
          82, 82, 82, 82, 73, 74, 73, 42, 42, 43, 57, 58, 58, 66, 65, 66, 82,
          82, 82, 82, 82, 82, 65, 66, 65, 58, 58, 59, 81, 81, 81, 49, 51, 49,
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
    player: {
      x: 2,
      y: -4,
      sprite: getSprite(playerSpriteSheet, 0, 0),
      timeDelta: 0,
      frame: 0,
    },
    bees: [
      {
        x: 135,
        y: 150,
        sprite: getSprite(beeSpriteSheet, 0, 0),
        timeDelta: 0,
        frame: 0,
      },
    ],
    berries: [
      {
        x: 124,
        y: 12,
        sprite: getSprite(foodSpriteSheet, 11, 0),
        timeDelta: 0,
        raised: 0,
        raising: true,
      },
    ],
    powerUps: [
      {
        x: 264,
        y: 8,
        sprite: getSprite(foodSpriteSheet, 7, 7),
        timeDelta: 0,
        raised: 0,
        raising: true,
      },
    ],
  };
}

export function update(state: RefObject<State | null>) {
  if (!state.current) return;
  const { activeGameState } = state.current;
  if (!activeGameState) return;

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

  updatePlayer(activeGameState.player, state.current.timeDelta);
  for (const bee of activeGameState.bees) {
    updateBee(bee, state.current.timeDelta);
  }

  for (const berry of activeGameState.berries) {
    updateConsumable(berry, state.current.timeDelta);
  }

  for (const powerUp of activeGameState.powerUps) {
    updateConsumable(powerUp, state.current.timeDelta);
  }

  state.current.activeGameState = activeGameState;

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
    player,
    bees,
    berries,
    powerUps,
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

  const modifiedScale = scale * scaleModifier;

  drawPlayer(ctx, player, modifiedScale);
  drawBees(ctx, bees, modifiedScale);
  drawBerries(ctx, berries, modifiedScale);
  drawPowerUps(ctx, powerUps, modifiedScale);

  ctx.restore();

  return;
}

function updatePlayer(player: Player, timeDelta: number) {
  player.timeDelta += timeDelta;
  if (player.timeDelta < 1000 / 120) {
    return;
  }

  const elapsedFrames = Math.floor(player.timeDelta / (1000 / 120));

  player.frame += elapsedFrames / 10;
  player.frame %= 6;
  player.sprite.x = Math.floor(player.frame) * player.sprite.width;

  player.timeDelta = 0;
}

function updateBee(bee: Bee, timeDelta: number) {
  bee.timeDelta += timeDelta;
  if (bee.timeDelta < 1000 / 120) {
    return;
  }

  const elapsedFrames = Math.floor(bee.timeDelta / (1000 / 120));

  bee.frame += elapsedFrames / 10;
  bee.frame %= 4;
  bee.sprite.x = Math.floor(bee.frame) * bee.sprite.width;

  bee.timeDelta = 0;
}

function updateConsumable(consumable: Consumable, timeDelta: number) {
  consumable.timeDelta += timeDelta;
  if (consumable.timeDelta < 1000 / 120) {
    return;
  }

  const elapsedFrames = Math.floor(consumable.timeDelta / (1000 / 120));

  if (consumable.raising) {
    consumable.raised += elapsedFrames / 20;
  } else {
    consumable.raised -= elapsedFrames / 20;
  }

  if (consumable.raised <= 0) {
    consumable.raised = 0;
    consumable.raising = true;
  }

  if (consumable.raised >= 2) {
    consumable.raised = 2;
    consumable.raising = false;
  }

  consumable.timeDelta = 0;
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  scale: number
) {
  drawSprite(ctx, player.sprite, player.x, player.y, scale);
}

function drawBees(ctx: CanvasRenderingContext2D, bees: Bee[], scale: number) {
  for (const bee of bees) {
    drawSprite(ctx, bee.sprite, bee.x, bee.y, scale, 1.5);
  }
}

function drawBerries(
  ctx: CanvasRenderingContext2D,
  berries: Consumable[],
  scale: number
) {
  for (const berry of berries) {
    drawSprite(ctx, berry.sprite, berry.x, berry.y + berry.raised, scale, 0.5);
  }
}

function drawPowerUps(
  ctx: CanvasRenderingContext2D,
  powerUps: Consumable[],
  scale: number
) {
  for (const powerUp of powerUps) {
    drawSprite(
      ctx,
      powerUp.sprite,
      powerUp.x,
      powerUp.y + powerUp.raised,
      scale
    );
  }
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
  sprite: Sprite,
  x: number,
  y: number,
  scale: number,
  sizeModifier: number = 1
) {
  ctx.save();

  ctx.drawImage(
    sprite.image,
    Math.floor(sprite.x),
    Math.floor(sprite.y),
    Math.floor(sprite.width),
    Math.floor(sprite.height),
    Math.floor(x * scale),
    Math.floor(y * scale),
    Math.floor(sprite.width * scale * sizeModifier),
    Math.floor(sprite.height * scale * sizeModifier)
  );

  ctx.restore();
}
