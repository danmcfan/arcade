import { SweetState } from "./state";

export function handleAnimation(state: SweetState, deltaTime: number) {
  const { player } = state;

  console.log(player.frame, deltaTime);

  player.frame += deltaTime / 100;
  player.frame = player.frame % 4;

  console.log(player.frame);
}
