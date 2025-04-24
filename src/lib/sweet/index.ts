import type { RefObject } from "react";
import type { State } from "@/lib/engine/game";
import type { SpriteSheet } from "@/lib/engine/sprite";
import type { Grid } from "@/lib/engine/grid";
import {
  createCorners,
  createPoints,
  createPowers,
} from "@/lib/sweet/constants";
import { hasControl } from "@/lib/engine/input";
import { createSpriteSheet } from "@/lib/engine/sprite";
import { _drawLayers } from "@/lib/engine/grid";
import { drawScore } from "@/lib/sweet/score";
import type {
  Entity,
  Direction,
  Position,
  Enemy,
  Sprite,
  Animation,
} from "@/lib/sweet/ecs";
import {
  createEntity,
  createPosition,
  createEnemy,
  createSprite,
  createAnimation,
  inputSystem,
  enemySystem,
  animationSystem,
  positionSystem,
  cornerSystem,
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
  directions: Map<Entity, Direction[]>;
  enemyComponents: Map<Entity, Enemy>;
  sprites: Map<Entity, Sprite>;
  animations: Map<Entity, Animation>;
  players: Set<Entity>;
  enemies: Set<Entity>;
  corners: Set<Entity>;
  points: Set<Entity>;
  powers: Set<Entity>;
  timeDeltaFloat: number;
  floating: boolean;
  floatOffset: number;
  gameOver: boolean;
  reset: boolean;
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
    directions: new Map<Entity, Direction[]>(),
    enemyComponents: new Map<Entity, Enemy>(),
    sprites: new Map<Entity, Sprite>(),
    animations: new Map<Entity, Animation>(),
    players: new Set<Entity>(),
    enemies: new Set<Entity>(),
    corners: new Set<Entity>(),
    points: new Set<Entity>(),
    powers: new Set<Entity>(),
    timeDeltaFloat: 0,
    floating: false,
    floatOffset: 0,
    gameOver: false,
    reset: false,
  };

  const player = createEntity(state.entities);
  state.positions.set(player, createPosition(144, 256, 3, "left", 0.75));
  state.sprites.set(
    player,
    createSprite("images/Player.png", 0, 0, 32, 32, -16, -20)
  );
  state.animations.set(player, createAnimation(0));
  state.players.add(player);

  for (const [x, y, direction] of [
    [96, 128, "right"],
    [194, 128, "left"],
    [96, 194, "up"],
    [194, 194, "up"],
  ]) {
    const enemy = createEntity(state.entities);
    state.positions.set(
      enemy,
      createPosition(x as number, y as number, 3, direction as Direction, 0.4)
    );
    state.enemyComponents.set(enemy, createEnemy(null));
    state.sprites.set(
      enemy,
      createSprite("images/Bee.png", 0, 0, 16, 16, -8, -10)
    );
    state.animations.set(enemy, createAnimation(0));
    state.enemies.add(enemy);
  }

  for (const corner of createCorners()) {
    const cornerEntity = createEntity(state.entities);
    state.positions.set(cornerEntity, createPosition(corner.x, corner.y));
    state.directions.set(cornerEntity, corner.directions);
    state.corners.add(cornerEntity);
  }

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

  if (activeGameState.gameOver) {
    if (activeGameState.reset) {
      state.current.activeGameState = createSweetState();
      state.current.transitions.push({
        type: "fadeIn",
        time: 0,
        duration: 1000,
      });
    } else {
      state.current.transitions.push({
        type: "fadeOut",
        time: 0,
        duration: 500,
      });
      activeGameState.reset = true;
    }
    return;
  }

  inputSystem(activeGameState, input);
  enemySystem(activeGameState, timeFactor);
  animationSystem(activeGameState, timeFactor);
  positionSystem(activeGameState, timeFactor);
  cornerSystem(activeGameState);
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

  drawSystem(activeGameState, ctx, modifiedScale, debug);
  drawScore(score, ctx, modifiedScale);

  ctx.restore();

  return;
}
