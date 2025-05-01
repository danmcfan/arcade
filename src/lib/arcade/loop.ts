import { State } from "../state";
import { clearScreen, scaleScreen, centerScreen } from "../draw";
import { drawBackground } from "../background";
import { handleInput } from "./input";
import { drawMachines, drawPlayer } from "./draw";
import { handleAnimation } from "./animate";
import { handleMovement } from "./movement";
import { handleCollision } from "./collision";

export function arcadeLoop(state: State, deltaTime: number) {
  handleInput(state);
  handleMovement(state, deltaTime);
  handleCollision(state);
  handleAnimation(state, deltaTime);

  state.ctx.save();

  clearScreen(state);
  scaleScreen(state);
  centerScreen(state);

  drawBackground(state.ctx, state.background, state.sprites);
  drawMachines(state);
  drawPlayer(state);

  state.ctx.restore();
}
