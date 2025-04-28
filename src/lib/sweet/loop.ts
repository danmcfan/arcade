import { State } from "../state";
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

  handleEnemy(activeGameState, deltaTime);
  handleMovement(activeGameState, deltaTime);
  handleCollision(activeGameState);
  handleAnimation(activeGameState, deltaTime);

  state.ctx.clearRect(0, 0, state.width, state.height);
  drawBackground(state.ctx, activeGameState.background, state.sprites);
  drawPoints(state.ctx, activeGameState, state.sprites);
  drawPowers(state.ctx, activeGameState, state.sprites);
  drawBear(state.ctx, activeGameState, state.sprites);
  drawEnemies(state.ctx, activeGameState, state.sprites);
  drawScore(state.ctx, state, activeGameState.score);
}
