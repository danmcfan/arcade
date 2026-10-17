import { describe, expect, test } from "bun:test";
import type { Direction } from "../engine/input.ts";
import {
  distance,
  Entity,
  newCorners,
  pointToTile,
  targetBottomLeft,
  targetBottomRight,
  targetTopLeft,
  targetTopRight,
} from "./entity.ts";
import { levelValues } from "./levels.ts";
import {
  distanceThreshold,
  findCorner,
  moveEntity,
  stepSize,
  subSteps,
  updateDirection,
  updatePosition,
} from "./update.ts";
import { sweetSamAdvantages } from "./advantages.ts";

const corners = newCorners();

const step: Record<Direction, [number, number]> = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] };

/** The nearest corner from `c` along `d`, or null where the corridor leads into the tunnel. */
function nextCorner(c: Entity, d: Direction): Entity | null {
  const [dx, dy] = step[d];
  let best: Entity | null = null;
  let bestDist = Infinity;
  for (const o of corners) {
    const along = (o.x - c.x) * dx + (o.y - c.y) * dy;
    const across = (o.x - c.x) * dy + (o.y - c.y) * dx;
    if (across === 0 && along > 0 && along < bestDist) {
      best = o;
      bestDist = along;
    }
  }
  return best;
}

/** One tick's move; whether `e` was in `c`'s reach after any of its sub-steps. */
function moveReaching(e: Entity, c: Entity): boolean {
  let reached = false;
  const sub = stepSize(e.velocity);
  for (let k = 0; k < subSteps(e.velocity); k++) {
    updatePosition(e, corners, sub);
    reached ||= findCorner(e, corners) === c;
  }
  return reached || findCorner(e, corners) === c;
}

/** Every speed the bear or a bee can have, on any level, with or without running shoes. */
const shoes = sweetSamAdvantages(["runningShoes"]).playerSpeedFactor;
const speeds = [
  ...new Set(
    Array.from({ length: 22 }, (_, i) => levelValues(i + 1)).flatMap((v) => [
      v.bearVelocity,
      v.bearVelocity * shoes,
      v.bearSleepyVelocity,
      v.beeVelocity,
      v.sleepyBeeVelocity,
      v.tunnelVelocity,
      v.elroy[0].velocity,
      v.elroy[1].velocity,
    ]),
  ),
].toSorted((a, b) => a - b);

describe("bee speeds against the maze", () => {
  test.each(speeds)("a bee at %p px/tick reaches every next corner from every corner", (v) => {
    let paths = 0;
    for (const c of corners) {
      for (const d of c.directions) {
        const next = nextCorner(c, d);
        if (next === null) continue;
        const [dx, dy] = step[d];
        const gap = Math.abs(next.x - c.x) + Math.abs(next.y - c.y);
        // From the corner itself and from arbitrary sub-pixel offsets behind
        // it, as after the tunnel, the bee home or a sleepy spell.
        for (let offset = 0; offset < 1; offset += 1 / 16) {
          const e = new Entity();
          e.x = c.x - dx * offset;
          e.y = c.y - dy * offset;
          e.direction = d;
          e.velocity = v;
          let found = false;
          for (let t = 0; t < (gap + 2) / v + 2 && !found; t++) {
            found = moveReaching(e, next);
          }
          expect(found).toBe(true);
          paths++;
        }
      }
    }
    expect(paths).toBeGreaterThan(100);
  });

  // The tunnel has no corners, so its speeds (0.5 on level 1, as in Go) are left out.
  const cornerSpeeds = speeds.filter((v) => v > 0.5);
  test.each(cornerSpeeds)("at %p px/tick each step leaves a corner's reach, so it turns only once", (v) => {
    expect(stepSize(v)).toBeGreaterThan(0.5);
    expect(stepSize(v)).toBeLessThanOrEqual(1);
  });

  test("a bee at 105% (1.3125 px/tick) laps the maze, turning at every junction it targets", () => {
    const fastest = levelValues(5).elroy[1].velocity;
    expect(fastest).toBe(1.3125);
    const lanes = corners.flatMap((c) =>
      c.directions.flatMap((d) => {
        const n = nextCorner(c, d);
        return n === null ? [] : [[c, n] as const];
      }),
    );
    // On a lane between two joined corners, give or take a corner's reach.
    const r = distanceThreshold;
    const onLane = (e: Entity): boolean =>
      lanes.some(
        ([a, b]) =>
          e.x >= Math.min(a.x, b.x) - r &&
          e.x <= Math.max(a.x, b.x) + r &&
          e.y >= Math.min(a.y, b.y) - r &&
          e.y <= Math.max(a.y, b.y) + r,
      );
    const start = corners[0];
    if (start === undefined) throw new Error("no corners");
    const e = new Entity();
    e.x = start.x;
    e.y = start.y;
    e.direction = "RIGHT";
    e.velocity = fastest;
    for (const target of [targetTopRight, targetBottomRight, targetBottomLeft, targetTopLeft]) {
      let reached = false;
      for (let t = 0; t < 2000 && !reached; t++) {
        updateDirection(e, corners, target);
        moveEntity(e, corners, target);
        expect(onLane(e)).toBe(true);
        reached = distance(pointToTile(e.x, e.y), target) <= 5;
      }
      expect(reached).toBe(true);
    }
  });
});
