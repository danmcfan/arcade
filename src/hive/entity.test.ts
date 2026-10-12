import { describe, expect, test } from "bun:test";
import {
  distance,
  newCorners,
  newEnemies,
  newItems,
  newPlayer,
  pointToTile,
  tileEq,
  tunnelLeftX,
  tunnelRightX,
  tunnelRowY,
  velocityEnemyNormal,
  velocityEnemyPower,
  velocityEnemyTunnel,
  velocityMax,
  velocityPlayerNormal,
  velocityPlayerPower,
} from "./entity.ts";

describe("speed constants (Go untyped constants, folded exactly)", () => {
  test("velocities are velocityMax (1.25) times 0.8 / 0.9 / 0.75 / 0.5 / 0.4", () => {
    expect(velocityMax).toBe(1.25);
    expect(velocityPlayerNormal).toBe(1.0);
    expect(velocityPlayerPower).toBe(1.125);
    expect(velocityEnemyNormal).toBe(0.9375);
    expect(velocityEnemyPower).toBe(0.625);
    expect(velocityEnemyTunnel).toBe(0.5);
  });

  test("tunnel bounds are tileSize*4.5 and tileSize*(28-4.5) on row 8*17+4", () => {
    expect(tunnelLeftX).toBe(36);
    expect(tunnelRightX).toBe(188);
    expect(tunnelRowY).toBe(140);
  });
});

describe("tiles", () => {
  test("pointToTile truncates x/8 and y/8", () => {
    expect(pointToTile(112, 212)).toEqual({ x: 14, y: 26 });
    expect(pointToTile(7.99, 8)).toEqual({ x: 0, y: 1 });
    expect(pointToTile(223.5, 140)).toEqual({ x: 27, y: 17 });
  });

  test("distance is euclidean on tile coordinates", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(distance({ x: 2, y: 2 }, { x: 2, y: 2 })).toBe(0);
    expect(distance({ x: 1, y: 1 }, { x: 0, y: 0 })).toBe(Math.SQRT2);
  });

  test("tileEq compares by value", () => {
    expect(tileEq({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
    expect(tileEq({ x: 1, y: 2 }, { x: 2, y: 1 })).toBe(false);
  });
});

describe("constructors", () => {
  test("player starts at (112, 212) facing down at velocityMax", () => {
    const p = newPlayer();
    expect([p.x, p.y, p.direction, p.velocity, p.width, p.height]).toEqual([112, 212, "DOWN", 1.25, 16, 16]);
    expect(p.frameDirection).toEqual({ DOWN: 0, UP: 1, LEFT: 2, RIGHT: 3 });
  });

  test("enemies: red outside the house, pink/teal/orange home with dot minimums", () => {
    const es = newEnemies();
    expect(es.map((e) => [e.kind, e.x, e.y, e.direction, e.home, e.dotMinimum, e.target.x, e.target.y])).toEqual([
      ["red", 112, 116, "RIGHT", false, 0, 2, 0],
      ["pink", 112, 140, "LEFT", true, 0, 25, 0],
      ["teal", 96, 140, "RIGHT", true, 30, 0, 34],
      ["orange", 128, 140, "LEFT", true, 60, 27, 34],
    ]);
    for (const e of es) {
      expect(e.velocity).toBe(0.75);
      expect(e.frameDirection).toEqual({ DOWN: 0, UP: 1, LEFT: 1, RIGHT: 0 });
    }
  });

  test("244 items: 240 pellets then 4 power pellets, all food", () => {
    const items = newItems();
    expect(items.length).toBe(244);
    expect(items.every((i) => i?.isFood === true)).toBe(true);
    expect(items.filter((i) => i?.powerPellet === true).map((i) => [i?.x, i?.y])).toEqual([
      [12, 52],
      [212, 52],
      [12, 212],
      [212, 212],
    ]);
    expect([items[0]?.x, items[0]?.y, items[0]?.width, items[0]?.height]).toEqual([12, 36, 8, 12]);
  });

  test("64 corners at tile centres", () => {
    const cs = newCorners();
    expect(cs.length).toBe(64);
    expect([cs[0]?.x, cs[0]?.y, cs[0]?.directions]).toEqual([12, 36, ["DOWN", "RIGHT"]]);
  });
});
