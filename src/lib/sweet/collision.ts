import { SweetState } from "./state";
import { overlaps } from "./util";

export function handleCollision(state: SweetState) {
  const { player, points, powers, enemies } = state;

  for (const point of points) {
    if (overlaps(player, point)) {
      points.splice(points.indexOf(point), 1);
      state.score += 10;
    }
  }

  for (const power of powers) {
    if (overlaps(player, power)) {
      powers.splice(powers.indexOf(power), 1);
      state.score += 50;
      for (const enemy of enemies) {
        enemy.scaredTime = 10_000;
      }
    }
  }

  for (const enemy of enemies) {
    if (overlaps(player, enemy)) {
      if (enemy.scaredTime > 0) {
        enemies.splice(enemies.indexOf(enemy), 1);
        state.score += 200;
      } else {
        state.score -= 100;
      }
    }
  }
}
