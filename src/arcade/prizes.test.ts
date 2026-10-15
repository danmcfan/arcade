import { describe, expect, test } from "bun:test";
import { checkCollision, newWalls } from "./collision.ts";
import { newMachines } from "./machine.ts";
import { counterRects } from "./desk.ts";
import {
  honeyJarPrice,
  isPrizeId,
  oilCanPrice,
  pocketWatchPrice,
  prizeBox,
  prizes,
  runningShoesPrice,
  springBootsPrice,
  sleepyBeesPrice,
  lanternPrice,
  glowStickPrice,
  wingsPrice,
} from "./prizes.ts";
import type { SoftwareName } from "../game/software.ts";
import type { ArcadeTitle } from "../game/snapshot.ts";
import { defined } from "../engine/defined.testutil.ts";
import { fakeSoftware } from "../game/fakeSoftware.testutil.ts";
import { newState, blocked } from "./state.ts";
import { noHighScores, Wallet } from "./wallet.ts";
import { floorRect } from "../ui/hubArt.ts";
import { tickerRect } from "../ui/tickerArt.ts";

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

  const cabinetOf: Readonly<Record<SoftwareName, ArcadeTitle>> = {
    sweetSam: "sweet",
    brassMonkey: "brassMonkey",
    firefly: "firefly",
  };

  test("every decoration fills one 16x16 box", () => {
    for (const p of prizes) {
      expect({ id: p.id, w: p.sprite.w, h: p.sprite.h }).toEqual({ id: p.id, w: prizeBox, h: prizeBox });
    }
  });

  test("each cabinet's prizes hang left of it, above it and right of it, the sides in an arch or a rainbow", () => {
    const cabinets = newMachines(() => fakeSoftware());
    const placed = (title: ArcadeTitle): { id: string; dx: number; dy: number }[] => {
      const c = defined(cabinets.find((m) => m.title === title)).rect;
      return prizes
        .filter((p) => cabinetOf[p.software] === title)
        .map((p) => ({ id: p.id, dx: p.x - c.x, dy: p.y - c.y }));
    };
    // The sides are 4 px clear of the cabinet, the box above 2 px clear of its top.
    // An arch drops its sides level with the cabinet's top; a rainbow keeps them 2 px below the box above.
    expect(placed("brassMonkey")).toEqual([
      { id: "oilCan", dx: -20, dy: 0 },
      { id: "springBoots", dx: 0, dy: -18 },
      { id: "pocketWatch", dx: 20, dy: 0 },
    ]);
    expect(placed("sweet")).toEqual([
      { id: "honeyJar", dx: -20, dy: -16 },
      { id: "runningShoes", dx: 20, dy: -16 },
      { id: "sleepyBees", dx: 0, dy: -18 },
    ]);
    expect(placed("firefly")).toEqual([
      { id: "lantern", dx: 20, dy: 0 },
      { id: "glowStick", dx: -20, dy: 0 },
      { id: "wings", dx: 0, dy: -18 },
    ]);
  });

  test("decorations hang on the wall, clear of each other, every cabinet's art and the counter", () => {
    const rects = prizes.map((p) => ({ id: p.id, x: p.x, y: p.y, w: p.sprite.w, h: p.sprite.h }));
    for (const [i, a] of rects.entries()) {
      for (const b of rects.slice(i + 1)) {
        expect({ a: a.id, b: b.id, hit: checkCollision(a, b) }).toEqual({ a: a.id, b: b.id, hit: false });
      }
    }
    // A cabinet's art is 16x24 from its rect's top-left.
    const arts = newMachines(() => fakeSoftware()).map((m) => ({
      title: m.title,
      x: m.rect.x,
      y: m.rect.y,
      w: 16,
      h: 24,
    }));
    for (const r of rects) {
      for (const a of arts) {
        expect({ id: r.id, over: a.title, hit: checkCollision(r, a) }).toEqual({ id: r.id, over: a.title, hit: false });
      }
      expect({ id: r.id, desk: counterRects.some((c) => checkCollision(r, c)) }).toEqual({ id: r.id, desk: false });
      // Below the scoreboard's marquee and above the floor.
      expect({ id: r.id, top: r.y > tickerRect.y + tickerRect.h, bottom: r.y + r.h <= floorRect.y }).toEqual({
        id: r.id,
        top: true,
        bottom: true,
      });
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
