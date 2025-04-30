import { State } from "../state";
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

  state.ctx.clearRect(
    -state.width / 2,
    -state.height / 2,
    state.width,
    state.height
  );
  drawBackground(state.ctx, state.background, state.sprites);
  drawMachines(state);
  drawPlayer(state);
}
