import { State } from "../state";

export function handleMovement(state: State, deltaTime: number) {
  state.player.x += state.player.dx * (deltaTime / 15);
  state.player.y += state.player.dy * (deltaTime / 15);
}
