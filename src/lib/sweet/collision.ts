import { SweetState } from "./state";
import { overlaps } from "./util";

export function handleCollision(state: SweetState) {
  const { player, points, powers } = state;

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
    }
  }
}
