import { describe, expect, test } from "bun:test";
import { newEnemies } from "./entity.ts";
import { levelValues } from "./levels.ts";
import { afterDeath, dropEaten, newRelease, noDropEaten, waitingInHome, type Release } from "./release.ts";
import type { Entity } from "./entity.ts";

const level1 = levelValues(1);

/** Bees still held in the home, by kind. */
function waiting(bees: readonly Entity[]): (string | null)[] {
  return bees.filter((e) => waitingInHome(e)).map((e) => e.kind);
}

function eat(r: Release, bees: Entity[], n: number): void {
  for (let i = 0; i < n; i++) dropEaten(r, bees);
}

describe("personal counters", () => {
  test("only the preferred bee in the home counts eaten drops", () => {
    const bees = newEnemies(level1.dotMinimums);
    const r = newRelease();
    eat(r, bees, 1);
    expect(bees.map((e) => e.dotMinimum)).toEqual([0, 0, 29, 60]);
    eat(r, bees, 29);
    expect(bees.map((e) => e.dotMinimum)).toEqual([0, 0, 0, 60]);
    eat(r, bees, 1);
    expect(bees.map((e) => e.dotMinimum)).toEqual([0, 0, 0, 59]);
  });
});

describe("the global counter after a death", () => {
  test("pink, teal and orange leave at 7, 17 and 32, then personal counters return", () => {
    const r = newRelease();
    const old = newEnemies(level1.dotMinimums);
    eat(r, old, 10); // teal 20 left
    const bees = afterDeath(r, old);
    expect(waiting(bees)).toEqual(["pink", "teal", "orange"]);
    eat(r, bees, 6);
    expect(waiting(bees)).toEqual(["pink", "teal", "orange"]);
    eat(r, bees, 1);
    expect(waiting(bees)).toEqual(["teal", "orange"]);
    eat(r, bees, 9);
    expect(waiting(bees)).toEqual(["teal", "orange"]);
    eat(r, bees, 1);
    expect(waiting(bees)).toEqual(["orange"]);
    eat(r, bees, 14);
    expect(waiting(bees)).toEqual(["orange"]);
    eat(r, bees, 1);
    expect(waiting(bees)).toEqual([]);
    expect(r.globalDots).toBeNull();
  });

  test("the global counter stays on at 32 when orange was already out of the home", () => {
    const r = newRelease();
    const bees = afterDeath(r, newEnemies(level1.dotMinimums));
    const orange = bees.find((e) => e.kind === "orange");
    if (orange === undefined) throw new Error("no orange");
    orange.home = false;
    orange.held = false;
    orange.dotMinimum = 0;
    eat(r, bees, 32);
    expect(r.globalDots).toBe(32);
  });

  test("the personal counters survive the death while the global counter runs", () => {
    const r = newRelease();
    const old = newEnemies(level1.dotMinimums);
    eat(r, old, 10);
    const bees = afterDeath(r, old);
    expect(bees.map((e) => e.dotMinimum)).toEqual([0, 0, 20, 60]);
  });
});

describe("the idle timer", () => {
  test.each([
    [1, 240],
    [4, 240],
    [5, 180],
  ])("on level %d the preferred bee leaves after %d ticks without a drop", (level, ticks) => {
    // Level 1's dot limits, so teal and orange wait on the idle timer alone.
    const bees = newEnemies(level1.dotMinimums);
    const r = newRelease();
    eat(r, bees, 1);
    for (let i = 0; i < ticks - 1; i++) noDropEaten(r, bees, levelValues(level));
    expect(waiting(bees)).toEqual(["teal", "orange"]);
    noDropEaten(r, bees, levelValues(level));
    expect(waiting(bees)).toEqual(["orange"]);
    expect(r.idleTicks).toBe(0);
  });

  test("eating a drop resets it", () => {
    const bees = newEnemies(level1.dotMinimums);
    const r = newRelease();
    for (let i = 0; i < 239; i++) noDropEaten(r, bees, level1);
    dropEaten(r, bees);
    expect(r.idleTicks).toBe(0);
    for (let i = 0; i < 239; i++) noDropEaten(r, bees, level1);
    expect(waiting(bees)).toEqual(["teal", "orange"]);
  });

  test("it releases a bee held by the global counter too", () => {
    const r = newRelease();
    const bees = afterDeath(r, newEnemies(level1.dotMinimums));
    for (let i = 0; i < 240; i++) noDropEaten(r, bees, level1);
    expect(waiting(bees)).toEqual(["teal", "orange"]);
  });
});
