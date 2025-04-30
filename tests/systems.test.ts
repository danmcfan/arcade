import { test } from "vitest";
import { createEnemies, createCorners } from "../src/lib/sweet/constant";
import { handleEnemy } from "../src/lib/sweet/enemy";
import { handleMovement } from "../src/lib/sweet/movement";

const FPS = 60;
const HOURS = 5;

const FRAMES = FPS * 60 * 60 * HOURS;

test(" System", () => {
  const enemies = createEnemies();
  const corners = createCorners();

  for (let i = 0; i < FRAMES; i++) {
    const deltaTime = 1 / FPS;
    handleEnemy(enemies, corners, deltaTime);
    handleMovement(enemies, corners, deltaTime);
  }
});
