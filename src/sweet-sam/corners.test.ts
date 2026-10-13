import { describe, expect, test } from "bun:test";
import type { Direction } from "../engine/input.ts";
import { Entity, newCorners } from "./entity.ts";
import { levelCap, levelValues } from "./levels.ts";
import { findCorner, updatePosition } from "./update.ts";

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

const speeds = [...new Set(Array.from({ length: levelCap }, (_, i) => levelValues(i + 1).beeVelocity))];

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
            updatePosition(e, corners);
            found = findCorner(e, corners) === next;
          }
          expect(found).toBe(true);
          paths++;
        }
      }
    }
    expect(paths).toBeGreaterThan(100);
  });

  test.each(speeds)("a bee at %p px/tick leaves a corner's reach after one step, so it turns only once", (v) => {
    expect(v).toBeGreaterThan(0.5);
    expect(v).toBeLessThanOrEqual(1);
  });
});
