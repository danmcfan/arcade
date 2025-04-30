import { Direction } from "../state";
import { SweetState } from "./state";
import { overlaps } from "./util";

export function handleEnemy(state: SweetState, deltaTime: number) {
  const { enemies, corners } = state;

  for (const enemy of enemies) {
    if (enemy.scaredTime > 0) {
      enemy.scaredTime -= deltaTime;
      if (enemy.scaredTime <= 0) {
        enemy.scaredTime = 0;
      }
    }

    for (const corner of corners) {
      if (overlaps(enemy, corner)) {
        if (enemy.lastCorner === corner) {
          continue;
        }

        let randomDirections = [...corner.directions];
        switch (enemy.direction) {
          case Direction.UP:
            randomDirections = randomDirections.filter(
              (d) => d !== Direction.DOWN
            );
            break;
          case Direction.DOWN:
            randomDirections = randomDirections.filter(
              (d) => d !== Direction.UP
            );
            break;
          case Direction.LEFT:
            randomDirections = randomDirections.filter(
              (d) => d !== Direction.RIGHT
            );
            break;
          case Direction.RIGHT:
            randomDirections = randomDirections.filter(
              (d) => d !== Direction.LEFT
            );
            break;
        }

        const randomDirection =
          randomDirections[Math.floor(Math.random() * randomDirections.length)];
        if (enemy.direction === randomDirection) {
          continue;
        }

        if (
          randomDirection === Direction.UP ||
          randomDirection === Direction.DOWN
        ) {
          enemy.x = corner.x;
        }
        if (
          randomDirection === Direction.LEFT ||
          randomDirection === Direction.RIGHT
        ) {
          enemy.y = corner.y;
        }

        enemy.direction = randomDirection;
        enemy.lastCorner = corner;
      }
    }
  }
}
