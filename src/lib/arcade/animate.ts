import { State } from "../state";

export function handleAnimation(state: State, deltaTime: number) {
  state.player.frame += deltaTime / 100;
  state.player.frame %= 6;

  for (const machine of state.machines) {
    if (machine.active) {
      machine.frame += deltaTime / 100;
      machine.frame %= 9;
      if (machine.frame < 1) {
        machine.frame = 1;
      }
    }
  }
}
