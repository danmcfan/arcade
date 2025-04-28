import { SweetState } from "./state";

export function handleAnimation(state: SweetState, deltaTime: number) {
  const { player, enemies } = state;

  player.frame += deltaTime / 100;
  player.frame = player.frame % 4;

  for (const enemy of enemies) {
    enemy.frame += deltaTime / 100;
    enemy.frame = enemy.frame % 4;
  }
}
