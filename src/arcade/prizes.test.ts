import { describe, expect, test } from "bun:test";
import { checkCollision, newWalls } from "./collision.ts";
import { newMachines } from "./machine.ts";
import { counterRects } from "./desk.ts";
import {
  honeyJarPrice,
  isPrizeId,
  oilCanPrice,
  pocketWatchPrice,
  prize,
  prizes,
  runningShoesPrice,
  springBootsPrice,
  sleepyBeesPrice,
  lanternPrice,
  glowStickPrice,
  wingsPrice,
} from "./prizes.ts";
import { minigame } from "../game/minigames.ts";
import { defined } from "../engine/defined.testutil.ts";
import { fakeSoftware } from "../game/fakeSoftware.testutil.ts";
import { newState, blocked } from "./state.ts";
import { noHighScores, Wallet } from "./wallet.ts";

describe("prize catalogue", () => {
  test("three prizes each for Sweet Sam, Firefly and Brass Monkey, 25, 50 and 100 tickets each", () => {
    expect(prizes.map((p) => [p.id, p.name, p.price, p.software])).toEqual([
      ["honeyJar", "HONEY JAR", 25, "sweetSam"],
      ["runningShoes", "RUNNING SHOES", 50, "sweetSam"],
      ["sleepyBees", "SLEEPY BEES", 100, "sweetSam"],
      ["lantern", "LANTERN", 25, "firefly"],
      ["glowStick", "GLOW STICK", 50, "firefly"],
      ["wings", "WINGS", 100, "firefly"],
      ["oilCan", "OIL CAN", 25, "brassMonkey"],
      ["springBoots", "SPRING BOOTS", 50, "brassMonkey"],
      ["pocketWatch", "POCKET WATCH", 100, "brassMonkey"],
    ]);
    expect([honeyJarPrice, runningShoesPrice, sleepyBeesPrice]).toEqual([25, 50, 100]);
    expect([lanternPrice, glowStickPrice, wingsPrice]).toEqual([25, 50, 100]);
    expect([oilCanPrice, springBootsPrice, pocketWatchPrice]).toEqual([25, 50, 100]);
  });

  test("each decoration is the size of its art and sits beside its minigame's cabinet, clear of the cabinets and the counter", () => {
    const machines = newMachines(() => fakeSoftware());
    for (const p of prizes) {
      const own = minigame(p.software).title;
      const cabinet = defined(machines.find((m) => m.title === own)).rect;
      const r = { x: p.x, y: p.y, w: p.sprite.w, h: p.sprite.h };
      // Within a cabinet's width of its own minigame's cabinet, nearer it than any other.
      const centre = r.x + r.w / 2;
      const dist = (m: { x: number; w: number }): number => Math.abs(m.x + m.w / 2 - centre);
      expect({ id: p.id, nearest: machines.reduce((a, b) => (dist(a.rect) <= dist(b.rect) ? a : b)).title }).toEqual({
        id: p.id,
        nearest: own,
      });
      expect({ id: p.id, near: dist(cabinet) <= 16 }).toEqual({ id: p.id, near: true });
      for (const m of machines) {
        if (m.title === own) continue;
        expect({ id: p.id, over: m.title, hit: checkCollision(r, m.rect) }).toEqual({
          id: p.id,
          over: m.title,
          hit: false,
        });
      }
      expect({ id: p.id, desk: counterRects.some((c) => checkCollision(r, c)) }).toEqual({ id: p.id, desk: false });
    }
  });

  test("decorations don't overlap each other or their own cabinet's art", () => {
    const rects = prizes.map((p) => ({ id: p.id, x: p.x, y: p.y, w: p.sprite.w, h: p.sprite.h }));
    for (const [i, a] of rects.entries()) {
      for (const b of rects.slice(i + 1)) {
        expect({ a: a.id, b: b.id, hit: checkCollision(a, b) }).toEqual({ a: a.id, b: b.id, hit: false });
      }
    }
    // The Brass Monkey cabinet's art is x 48..63, y 40..63: its prizes hang on the wall around it.
    const brassCabinet = { x: 48, y: 40, w: 16, h: 24 };
    for (const r of rects.filter((x) => prize(x.id).software === "brassMonkey")) {
      expect({ id: r.id, hit: checkCollision(r, brassCabinet) }).toEqual({ id: r.id, hit: false });
    }
  });

  test("decorations do not block movement: owning every prize changes nothing that is solid", () => {
    const s = newState(() => fakeSoftware());
    s.wallet = new Wallet({ highScores: noHighScores, tokens: 0, tickets: 0, prizes: prizes.map((p) => p.id) });
    for (const p of prizes) {
      const r = { x: p.x, y: p.y, w: p.sprite.w, h: p.sprite.h };
      // Whatever blocks a decoration's rect is the wall it is drawn on, nothing more.
      expect(blocked(s, r)).toBe(newWalls().some((w) => checkCollision(r, w)));
    }
  });

  test("isPrizeId knows the catalogue", () => {
    expect(prizes.every((p) => isPrizeId(p.id))).toBe(true);
    expect(isPrizeId("goldenTrophy")).toBe(false);
    expect(isPrizeId(1)).toBe(false);
  });
});
