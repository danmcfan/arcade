import type { RefObject } from "react";
import type { State } from "@/lib/engine/game";
import type { SpriteSheet } from "@/lib/engine/sprite";
import type { Grid } from "@/lib/engine/grid";
import type { Corner } from "@/lib/sweet/corner";
import {
  createCorners,
  createPoints,
  createPowers,
} from "@/lib/sweet/constants";
import { hasControl } from "@/lib/engine/input";
import { createSpriteSheet } from "@/lib/engine/sprite";
import { _drawLayers } from "@/lib/engine/grid";
import { drawCorner } from "@/lib/sweet/corner";
import { drawScore } from "@/lib/sweet/score";
import type { Entity, Position, Sprite, Animation } from "@/lib/sweet/ecs";
import {
  createEntity,
  createPosition,
  createSprite,
  createAnimation,
  inputSystem,
  animationSystem,
  positionSystem,
  collisionSystem,
  floatSystem,
  drawSystem,
} from "@/lib/sweet/ecs";

export type SweetState = {
  scaleModifier: number;
  gridWidth: number;
  gridHeight: number;
  gridCellSize: number;
  spriteSheets: Record<string, SpriteSheet>;
  layers: Record<number, Grid>;
  score: number;
  entities: Set<Entity>;
  positions: Map<Entity, Position>;
  sprites: Map<Entity, Sprite>;
  animations: Map<Entity, Animation>;
  players: Set<Entity>;
  corners: Corner[];
  points: Set<Entity>;
  powers: Set<Entity>;
  timeDeltaFloat: number;
  floating: boolean;
  floatOffset: number;
};

export function createSweetState(): SweetState {
  const state: SweetState = {
    scaleModifier: 0.5,
    gridWidth: 18,
    gridHeight: 21,
    gridCellSize: 16,
    spriteSheets: {
      grassTiles: createSpriteSheet("images/GrassTiles.png", 16, 16),
      grassMiddle: createSpriteSheet("images/GrassMiddle.png", 16, 16),
      pathMiddle: createSpriteSheet("images/PathMiddle.png", 16, 16),
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
    score: 0,
    entities: new Set<Entity>(),
    positions: new Map<Entity, Position>(),
    sprites: new Map<Entity, Sprite>(),
    animations: new Map<Entity, Animation>(),
    players: new Set<Entity>(),
    corners: createCorners(),
    points: new Set<Entity>(),
    powers: new Set<Entity>(),
    timeDeltaFloat: 0,
    floating: false,
    floatOffset: 0,
  };

  const player = createEntity(state.entities);
  state.positions.set(player, createPosition(144, 256, 3, "left", 0.75));
  state.sprites.set(
    player,
    createSprite("images/Player.png", 0, 0, 32, 32, -16, -20)
  );
  state.animations.set(player, createAnimation(0));
  state.players.add(player);

  for (const position of createPoints()) {
    const point = createEntity(state.entities);
    state.positions.set(point, position);
    state.sprites.set(
      point,
      createSprite("images/Food.png", 0, 11 * 16, 16, 16, -8, -8, 0.5)
    );
    state.animations.set(point, createAnimation(0));
    state.points.add(point);
  }

  for (const position of createPowers()) {
    const power = createEntity(state.entities);
    state.positions.set(power, position);
    state.sprites.set(
      power,
      createSprite("images/Food.png", 6 * 16, 2 * 16, 16, 16, -8, -8, 0.75)
    );
    state.animations.set(power, createAnimation(0));
    state.powers.add(power);
  }

  return state;
}

export function update(state: RefObject<State | null>) {
  if (!state.current) return;
  const { timeDelta, input, activeGameState } = state.current;
  if (!activeGameState) return;

  const timeFactor = timeDelta / (1000 / 120);

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

  inputSystem(activeGameState, input);
  animationSystem(activeGameState, timeFactor);
  positionSystem(activeGameState, timeFactor);
  collisionSystem(activeGameState);
  floatSystem(activeGameState, timeDelta);

  return;
}

export function draw(state: State) {
  const { ctx, scale, activeGameState, debug } = state;

  if (!activeGameState) return;

  const {
    score,
    layers,
    spriteSheets,
    scaleModifier,
    gridWidth,
    gridCellSize,
    corners,
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

  if (debug) {
    for (const corner of corners) {
      drawCorner(corner, ctx, modifiedScale);
    }
  }

  drawSystem(activeGameState, ctx, modifiedScale, debug);

  drawScore(score, ctx, modifiedScale);

  ctx.restore();

  return;
}
