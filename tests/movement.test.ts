import { test } from "vitest";
import { createEnemies, createCorners } from "../src/lib/sweet/constant";
import { handleMovement } from "../src/lib/sweet/movement";

const N = 216_000;

test("Movement System", () => {
  const enemies = createEnemies();
  const corners = createCorners();

  for (let i = 0; i < N; i++) {
    handleMovement(enemies, corners, 15 * Math.random());
  }
});
