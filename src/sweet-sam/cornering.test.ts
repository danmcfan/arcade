import { describe, expect, test } from "bun:test";
import { opposite, type Direction } from "../engine/input.ts";
import { newCorners, newEnemies, newPlayer, type Entity } from "./entity.ts";
import { corneringWindow, dirSteps, steer, updateDirection, updatePosition } from "./update.ts";

const corners = newCorners();

// Corner (6, 5) allows all four directions; its centre is (52, 68).
const crossX = 52;
const crossY = 68;

/** The bear heading `dir` at (x, y) at full speed. */
function bear(x: number, y: number, dir: Direction): Entity {
  const e = newPlayer();
  e.x = x;
  e.y = y;
  e.direction = dir;
  e.velocity = 1;
  return e;
}

/** Holds `held` (or "" for nothing) for `ticks` ticks of steering and moving. */
function run(e: Entity, held: Direction | "", ticks: number): void {
  for (let t = 0; t < ticks; t++) {
    steer(e, corners, held);
    updatePosition(e, corners);
  }
}

/** Whether a turn pressed `ahead` px before the junction's centre (negative: after it) is taken at once. */
function takes(dir: Direction, turn: Direction, ahead: number): boolean {
  const [dx, dy] = dirSteps[dir];
  const e = bear(crossX - dx * ahead, crossY - dy * ahead, dir);
  steer(e, corners, turn);
  return e.direction === turn;
}

describe("the bear corners like Pac-Man", () => {
  test.each([1, 2, 3, 4])("UP pressed %p px before the junction turns the bear onto the new corridor", (px) => {
    const e = bear(crossX + px, crossY, "LEFT");
    run(e, "UP", 1);
    expect(e.direction).toBe("UP");
    run(e, "", 10);
    expect(e.x).toBe(crossX);
    expect(e.y).toBeLessThan(crossY);
  });
});

describe("the cornering window depends on the bear's direction", () => {
  test.each<[Direction, Direction]>([
    ["RIGHT", "UP"],
    ["DOWN", "LEFT"],
  ])("moving %p, the window is 3 px before and 4 px after", (dir, turn) => {
    expect(takes(dir, turn, 4)).toBe(false);
    expect(takes(dir, turn, 3)).toBe(true);
    expect(takes(dir, turn, -4)).toBe(true);
    expect(takes(dir, turn, -5)).toBe(false);
  });

  test.each<[Direction, Direction]>([
    ["LEFT", "UP"],
    ["UP", "LEFT"],
  ])("moving %p, the window is 4 px before and 3 px after", (dir, turn) => {
    expect(takes(dir, turn, 5)).toBe(false);
    expect(takes(dir, turn, 4)).toBe(true);
    expect(takes(dir, turn, -3)).toBe(true);
    expect(takes(dir, turn, -4)).toBe(false);
  });
});

describe("what the bear's cornering leaves alone", () => {
  test("a turn into a wall is ignored", () => {
    // Corner (1, 1) at (12, 36) allows only DOWN and RIGHT.
    const e = bear(14, 36, "LEFT");
    run(e, "UP", 6);
    expect([e.direction, e.x, e.y]).toEqual(["LEFT", 12, 36]);
  });

  test("a tap released before the junction is taken when the bear reaches it", () => {
    const e = bear(crossX + 10, crossY, "LEFT");
    run(e, "UP", 1);
    run(e, "", 6);
    expect(e.direction).toBe("UP");
    run(e, "", 10);
    expect(e.x).toBe(crossX);
  });

  test("a tap the junction cannot take is forgotten once the bear passes its window", () => {
    // Corner (6, 1) at (52, 36) is a wall upward; the bear runs on LEFT past it.
    const e = bear(60, 36, "LEFT");
    run(e, "UP", 1);
    run(e, "", 14);
    expect([e.direction, e.turn]).toEqual(["LEFT", ""]);
  });

  test("a turn held until the junction still works", () => {
    const e = bear(crossX + 12, crossY, "LEFT");
    run(e, "UP", 20);
    expect([e.direction, e.x]).toEqual(["UP", crossX]);
  });

  test("the bear ends every early turn on a corridor centre line", () => {
    for (const c of corners) {
      for (const from of c.directions) {
        for (const to of c.directions) {
          const direction = opposite(from);
          const [before] = corneringWindow(direction);
          for (let px = 1; px <= before; px++) {
            const e = newPlayer();
            e.velocity = 1;
            e.direction = direction;
            // Approach the corner `px` before its centre, coming in from `from`.
            e.x = c.x + (from === "LEFT" ? -px : from === "RIGHT" ? px : 0);
            e.y = c.y + (from === "UP" ? -px : from === "DOWN" ? px : 0);
            run(e, to, 1);
            run(e, "", 8);
            if (to === from || to === opposite(from)) {
              expect(e.x === c.x || e.y === c.y).toBe(true);
            } else {
              expect(e.direction).toBe(to);
              expect(to === "UP" || to === "DOWN" ? e.x : e.y).toBe(to === "UP" || to === "DOWN" ? c.x : c.y);
            }
          }
        }
      }
    }
  });
});

describe("bees do not pre-turn", () => {
  test("a bee 3 px before a junction keeps its direction, then turns at the centre", () => {
    const e = newEnemies().find((b) => b.kind === "red");
    if (e === undefined) throw new Error("red");
    e.home = false;
    e.x = crossX + 3;
    e.y = crossY;
    e.direction = "LEFT";
    e.velocity = 1;
    // Straight up from the junction.
    const target = { x: 6, y: 0 };
    updateDirection(e, corners, target);
    expect([e.direction, e.x]).toEqual<unknown>(["LEFT", crossX + 3]);
    for (let t = 0; t < 3; t++) updatePosition(e, corners);
    updateDirection(e, corners, target);
    expect([e.direction, e.x, e.y]).toEqual<unknown>(["UP", crossX, crossY]);
  });
});
