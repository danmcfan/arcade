import { State } from "../state";
import { clear, scale, center } from "../draw";
import { drawBackground } from "../background";
import { handleInput } from "./input";
import { handleEnemy } from "./enemy";
import { handleMovement } from "./movement";
import { handleCollision } from "./collision";
import { handleAnimation } from "./animate";
import {
  drawPoints,
  drawPowers,
  drawBear,
  drawEnemies,
  drawScore,
} from "./draw";

export function sweetLoop(state: State, deltaTime: number) {
  handleInput(state);

  const { activeGameState } = state;

  if (!activeGameState) {
    return;
  }

  const { player, enemies, corners } = activeGameState;
  const entities = [player, ...enemies];

  handleEnemy(enemies, corners, deltaTime);
  handleMovement(entities, corners, deltaTime);
  handleCollision(activeGameState);
  handleAnimation(activeGameState, deltaTime);

  state.ctx.save();

  clear(state);
  scale(state);
  center(state);

  drawBackground(state.ctx, activeGameState.background, state.sprites);
  drawPoints(state.ctx, activeGameState, state.sprites);
  drawPowers(state.ctx, activeGameState, state.sprites);
  drawBear(state.ctx, activeGameState, state.sprites);
  drawEnemies(state.ctx, activeGameState, state.sprites);
  drawScore(state.ctx, state, activeGameState.score);

  state.ctx.restore();
}
