import { describe, expect, test } from "bun:test";
import { imageArcade } from "../engine/assets.ts";
import { sweetie16 } from "../ui/sweetie16.ts";
import { cakeRect, confetti, confettiTicks, trophyRect } from "./arcadeWin.ts";
import { deskRect, employeeSpot } from "./desk.ts";
import type { Rect } from "./collision.ts";

function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

describe("the cake and the trophy", () => {
  test("stand on the prize desk's back run, either side of the employee, clear of each other", () => {
    const employee = { x: employeeSpot.x, y: employeeSpot.y, w: 16, h: 24 };
    for (const r of [cakeRect, trophyRect]) {
      expect(r.x).toBeGreaterThanOrEqual(deskRect.x);
      expect(r.x + r.w).toBeLessThanOrEqual(deskRect.x + deskRect.w);
      expect(r.y + r.h).toBeGreaterThan(deskRect.y); // on the desk, not floating above it
      expect(r.y + r.h).toBeLessThan(employee.y + 4);
      expect(overlaps(r, employee)).toBe(false);
    }
    expect(overlaps(cakeRect, trophyRect)).toBe(false);
  });
});

describe("confetti", () => {
  test("falls over the hub in palette colours, then is gone", () => {
    expect(confetti(0).length).toBeGreaterThan(0);
    for (let age = 0; age < confettiTicks; age += 7) {
      for (const p of confetti(age)) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThan(imageArcade.w);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThan(imageArcade.h);
        expect(sweetie16).toContain(p.colour);
      }
    }
    expect(confetti(confettiTicks)).toEqual([]);
    expect(confetti(confettiTicks + 500)).toEqual([]);
  });

  test("covers the room, and each piece only moves down", () => {
    const mid = confetti(Math.trunc(confettiTicks / 2));
    expect(mid.length).toBeGreaterThan(20);
    expect(Math.min(...mid.map((p) => p.x))).toBeLessThan(imageArcade.w / 4);
    expect(Math.max(...mid.map((p) => p.x))).toBeGreaterThan((imageArcade.w * 3) / 4);
    const later = confetti(Math.trunc(confettiTicks / 2) + 4);
    for (const p of mid) {
      const q = later.find((l) => l.id === p.id);
      if (q !== undefined) expect(q.y).toBeGreaterThanOrEqual(p.y);
    }
  });

  test("is the same every time", () => {
    expect(confetti(100)).toEqual(confetti(100));
  });
});
