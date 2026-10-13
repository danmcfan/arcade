import { describe, expect, test } from "bun:test";
import * as rng from "../engine/rng.ts";
import type { Direction } from "../engine/input.ts";
import { Entity, newCorners, newEnemies, newPlayer, type Tile } from "./entity.ts";
import {
  findTarget,
  modeChase,
  modeScatter,
  modeSequence,
  resetEnemy,
  updateBlue,
  updateDirection,
  updateFrame,
  updatePosition,
} from "./update.ts";

const corners = newCorners();

/** Tile (tx, ty) in newCorner coordinates → pixel centre. */
function at(e: Entity, tx: number, ty: number): Entity {
  e.x = 8 * tx + 4;
  e.y = 8 * (ty + 3) + 4;
  return e;
}

function bee(kind: "red" | "pink" | "teal" | "orange" = "red"): Entity {
  const e = newEnemies().find((x) => x.kind === kind);
  if (e === undefined) throw new Error(kind);
  e.home = false;
  e.dotMinimum = 0;
  return e;
}

/** The i-th entity, or a thrown error naming it. */
function nth(list: readonly Entity[], i: number): Entity {
  const e = list[i];
  if (e === undefined) throw new Error(`no entity ${i}`);
  return e;
}

// Corner (6, 5) allows all four directions; its tile is (6, 8).
function atCross(dir: Direction): Entity {
  const e = at(bee(), 6, 5);
  e.direction = dir;
  return e;
}

describe("modeSequence", () => {
  test("scatter/chase durations end in an endless chase", () => {
    expect(modeSequence.map((m) => [m.mode, m.ticks])).toEqual([
      [modeScatter, 420],
      [modeChase, 1200],
      [modeScatter, 420],
      [modeChase, 1200],
      [modeScatter, 300],
      [modeChase, 1200],
      [modeScatter, 300],
      [modeChase, -1],
    ]);
    expect([modeScatter, modeChase]).toEqual([0, 1]);
  });
});

describe("findTarget", () => {
  const player = newPlayer(); // tile (14, 26)
  player.direction = "LEFT";
  const enemies = newEnemies(); // red at tile (14, 14)

  test("scatter: every bee heads for its own corner target", () => {
    expect(enemies.map((e) => findTarget(e, enemies, player, modeScatter))).toEqual([
      { x: 2, y: 0 },
      { x: 25, y: 0 },
      { x: 0, y: 34 },
      { x: 27, y: 34 },
    ]);
  });

  test("chase: red targets the player's tile", () => {
    expect(findTarget(nth(enemies, 0), enemies, player, modeChase)).toEqual({ x: 14, y: 26 });
  });

  test("chase: pink targets 4 tiles ahead of the player", () => {
    const pink = nth(enemies, 1);
    const cases: [Direction, Tile][] = [
      ["UP", { x: 14, y: 22 }],
      ["DOWN", { x: 14, y: 30 }],
      ["LEFT", { x: 10, y: 26 }],
      ["RIGHT", { x: 18, y: 26 }],
    ];
    for (const [d, t] of cases) {
      const p = newPlayer();
      p.direction = d;
      expect(findTarget(pink, enemies, p, modeChase)).toEqual(t);
    }
  });

  test("chase: teal doubles the vector from red to 2 tiles ahead of the player", () => {
    const teal = nth(enemies, 2);
    // ahead = (12, 26); red = (14, 14); target = ahead + (ahead - red) = (10, 38)
    expect(findTarget(teal, enemies, player, modeChase)).toEqual({ x: 10, y: 38 });
    const up = newPlayer();
    up.direction = "UP";
    // ahead = (14, 24); target = (14, 34)
    expect(findTarget(teal, enemies, up, modeChase)).toEqual({ x: 14, y: 34 });
  });

  test("chase: orange chases from 8+ tiles away, else retreats to its corner", () => {
    const orange = at(bee("orange"), 14, 15); // tile (14, 18): 8 tiles from the player
    expect(findTarget(orange, enemies, player, modeChase)).toEqual({ x: 14, y: 26 });
    at(orange, 14, 17); // tile (14, 20): 6 tiles away
    expect(findTarget(orange, enemies, player, modeChase)).toEqual({ x: 27, y: 34 });
  });

  test("scatter returns a copy of the bee's target", () => {
    const red = nth(enemies, 0);
    const t = findTarget(red, enemies, player, modeScatter);
    t.x = 99;
    expect(red.target).toEqual({ x: 2, y: 0 });
  });
});

describe("updateDirection", () => {
  test("all-equal distances resolve Up first", () => {
    const e = atCross("RIGHT");
    updateDirection(e, corners, { x: 6, y: 8 });
    expect(e.direction).toBe("UP");
  });

  test("tie-break priority is Up, Left, Down, Right", () => {
    const e1 = atCross("DOWN"); // up excluded: left/down/right all 1 away
    updateDirection(e1, corners, { x: 6, y: 8 });
    expect(e1.direction).toBe("LEFT");

    const e2 = atCross("LEFT"); // left (5,8) and down (6,9) both 1 from (5,9)
    updateDirection(e2, corners, { x: 5, y: 9 });
    expect(e2.direction).toBe("LEFT");

    const e3 = atCross("DOWN"); // down (6,9) and right (7,8) both 1 from (7,9)
    updateDirection(e3, corners, { x: 7, y: 9 });
    expect(e3.direction).toBe("DOWN");
  });

  test("the closest next tile wins", () => {
    const e = atCross("UP");
    updateDirection(e, corners, { x: 10, y: 8 });
    expect(e.direction).toBe("RIGHT");
  });

  test("never turns back: the opposite direction is excluded", () => {
    const e = atCross("RIGHT"); // target straight behind
    updateDirection(e, corners, { x: 0, y: 8 });
    expect(e.direction).not.toBe("LEFT");
  });

  test("snaps the bee onto the corner", () => {
    const e = atCross("RIGHT");
    e.x += 0.25;
    e.y -= 0.5;
    updateDirection(e, corners, { x: 6, y: 8 });
    expect([e.x, e.y]).toEqual([52, 68]);
  });

  test("off a corner nothing changes", () => {
    const e = at(bee(), 7, 5);
    e.direction = "RIGHT";
    updateDirection(e, corners, { x: 0, y: 0 });
    expect([e.direction, e.x, e.y]).toEqual(["RIGHT", 60, 68]);
  });

  test("a pending reverse fires once the bee has left reverseTile (compared by value)", () => {
    const e = at(bee(), 7, 5); // tile (7, 8)
    e.direction = "RIGHT";
    e.reverseDirection = true;
    e.reverseTile = { x: 7, y: 8 }; // a fresh object equal by value: no reverse yet
    updateDirection(e, corners, { x: 0, y: 0 });
    expect<unknown[]>([e.direction, e.reverseDirection]).toEqual(["RIGHT", true]);

    e.x = 8 * 8 + 4; // tile (8, 8)
    updateDirection(e, corners, { x: 0, y: 0 });
    expect<unknown[]>([e.direction, e.reverseDirection]).toEqual(["LEFT", false]);
  });

  test("the reverse beats corner logic and does not snap", () => {
    const e = atCross("RIGHT");
    e.x += 0.25;
    e.reverseDirection = true;
    e.reverseTile = { x: 0, y: 0 };
    updateDirection(e, corners, { x: 6, y: 8 });
    expect([e.direction, e.x, e.reverseDirection]).toEqual(["LEFT", 52.25, false]);
  });

  test("scared bees pick a random allowed direction with one intn draw", () => {
    rng.seed(4);
    const pick = rng.intn(3);
    rng.seed(4);
    const e = atCross("RIGHT");
    e.blueFrames = 100;
    updateDirection(e, corners, { x: 6, y: 8 });
    // corner (6,5) is [UP, DOWN, LEFT, RIGHT]; LEFT removed
    const allowed: Direction[] = ["UP", "DOWN", "RIGHT"];
    const want = allowed[pick];
    if (want === undefined) throw new Error(`intn(3) gave ${pick}`);
    expect(e.direction).toBe(want);
    rng.seed(4);
    rng.float();
    const afterOne = rng.state();
    rng.seed(4);
    const e2 = atCross("RIGHT");
    e2.blueFrames = 100;
    updateDirection(e2, corners, { x: 6, y: 8 });
    expect(rng.state()).toBe(afterOne);
  });

  test("a dead end panics like Go", () => {
    const c = new Entity();
    c.x = 4;
    c.y = 4;
    c.directions = ["LEFT"];
    const e = bee();
    e.x = 4;
    e.y = 4;
    e.direction = "RIGHT";
    expect(() => {
      updateDirection(e, [c], { x: 0, y: 0 });
    }).toThrow("no valid directions for enemy at (4, 4)");
  });
});

describe("updateBlue", () => {
  test("counts down, and in the last 120 frames toggles flash every 6 frames", () => {
    const e = bee();
    e.blueFrames = 122;
    updateBlue(e);
    expect([e.blueFrames, e.flash, e.flashFrames]).toEqual([121, false, 0]);
    updateBlue(e);
    expect([e.blueFrames, e.flash, e.flashFrames]).toEqual([120, true, 5]);
    const flashes: boolean[] = [];
    for (let i = 0; i < 12; i++) {
      updateBlue(e);
      flashes.push(e.flash);
    }
    expect(flashes).toEqual([true, true, true, true, true, false, false, false, false, false, false, true]);
  });

  test("when not blue, flash state is cleared", () => {
    const e = bee();
    e.flash = true;
    e.flashFrames = 3;
    updateBlue(e);
    expect([e.blueFrames, e.flash, e.flashFrames]).toEqual([0, false, 0]);
  });
});

describe("updateFrame", () => {
  test("advances by frameIncrement mod frameTotal while moving, resets when stopped", () => {
    const e = newPlayer();
    e.frame = 3.95;
    updateFrame(e);
    expect(e.frame).toBe((3.95 + 0.1) % 4);
    e.velocity = 0;
    updateFrame(e);
    expect(e.frame).toBe(0);
  });
});

describe("updatePosition", () => {
  test("moves along the current direction by velocity", () => {
    const e = at(bee(), 7, 5);
    e.direction = "RIGHT";
    e.velocity = 0.9375;
    updatePosition(e, corners);
    expect(e.x).toBe(60.9375);
  });

  test("blocked at a corner that does not allow the direction", () => {
    const e = at(bee(), 1, 1); // corner allows DOWN, RIGHT
    e.direction = "LEFT";
    e.velocity = 1;
    updatePosition(e, corners);
    expect([e.x, e.y]).toEqual([12, 36]);
  });

  test("waits while dotMinimum > 0", () => {
    const e = bee("teal");
    e.dotMinimum = 3;
    const [x, y] = [e.x, e.y];
    updatePosition(e, corners);
    expect([e.x, e.y]).toEqual([x, y]);
  });

  test("home bees centre on x=112 then rise to y=116 at 0.5px, then leave home", () => {
    const e = nth(newEnemies(), 2); // teal at (96, 140)
    e.dotMinimum = 0;
    updatePosition(e, corners);
    expect([e.x, e.y, e.home]).toEqual([96.5, 140, true]);
    e.x = 112;
    updatePosition(e, corners);
    expect([e.x, e.y]).toEqual([112, 139.5]);
    e.y = 116;
    e.direction = "LEFT";
    e.velocity = 1;
    updatePosition(e, corners);
    expect([e.home, e.x]).toEqual([false, 111]);
  });

  test("tunnel wrap on row 140: x <= 0 → 224, x >= 224 → 0", () => {
    const e = bee();
    e.y = 140;
    e.x = 0.5;
    e.direction = "LEFT";
    e.velocity = 0.5;
    updatePosition(e, corners);
    expect(e.x).toBe(224);
    e.direction = "RIGHT";
    e.x = 223.5;
    updatePosition(e, corners);
    expect(e.x).toBe(0);
  });

  test("no wrap off the tunnel row", () => {
    const e = bee();
    e.y = 141;
    e.x = 0.5;
    e.direction = "LEFT";
    e.velocity = 1;
    updatePosition(e, corners);
    expect(e.x).toBe(-0.5);
  });
});

describe("resetEnemy", () => {
  test("sends the bee home with one intn(2) draw, leaving reverse/velocity/frame alone", () => {
    rng.seed(8);
    const dir = (["LEFT", "RIGHT"] as const)[rng.intn(2)];
    const s = rng.state();
    rng.seed(8);
    const e = bee();
    Object.assign(e, { blueFrames: 50, flashFrames: 2, flash: true, dotMinimum: 4, reverseDirection: true });
    e.velocity = 0.625;
    e.frame = 2.5;
    resetEnemy(e);
    expect(rng.state()).toBe(s);
    expect<unknown[]>([e.x, e.y, e.direction, e.blueFrames, e.flashFrames, e.flash, e.home, e.dotMinimum]).toEqual([
      112,
      140,
      dir,
      0,
      0,
      false,
      true,
      0,
    ]);
    expect([e.reverseDirection, e.velocity, e.frame]).toEqual([true, 0.625, 2.5]);
  });
});
