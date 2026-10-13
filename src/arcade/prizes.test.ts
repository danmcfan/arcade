import { describe, expect, test } from "bun:test";
import { checkCollision, newWalls } from "./collision.ts";
import { newMachines } from "./machine.ts";
import { counterRect } from "./prizeCounter.ts";
import {
  buyPrize,
  honeyJarPrice,
  inCatalogueOrder,
  isPrizeId,
  prizeOffer,
  prizeOffers,
  oilCanPrice,
  pocketWatchPrice,
  prize,
  prizes,
  runningShoesPrice,
  springBootsPrice,
  sleepyBeesPrice,
} from "./prizes.ts";
import type { SoftwareName } from "../game/software.ts";
import type { ArcadeTitle } from "../game/snapshot.ts";
import { defined } from "../engine/defined.testutil.ts";
import { fakeSoftware } from "../game/fakeSoftware.testutil.ts";
import { newState, blocked } from "./state.ts";

describe("prize catalogue", () => {
  test("three Sweet Sam prizes and three Brass Monkey prizes, 25, 50 and 100 tickets each", () => {
    expect(prizes.map((p) => [p.id, p.name, p.price, p.software])).toEqual([
      ["honeyJar", "HONEY JAR", 25, "sweetSam"],
      ["runningShoes", "RUNNING SHOES", 50, "sweetSam"],
      ["sleepyBees", "SLEEPY BEES", 100, "sweetSam"],
      ["oilCan", "OIL CAN", 25, "brassMonkey"],
      ["springBoots", "SPRING BOOTS", 50, "brassMonkey"],
      ["pocketWatch", "POCKET WATCH", 100, "brassMonkey"],
    ]);
    expect([honeyJarPrice, runningShoesPrice, sleepyBeesPrice]).toEqual([25, 50, 100]);
    expect([oilCanPrice, springBootsPrice, pocketWatchPrice]).toEqual([25, 50, 100]);
  });

  const cabinetOf: Readonly<Record<SoftwareName, ArcadeTitle>> = {
    sweetSam: "sweet",
    brassMonkey: "brassMonkey",
    firefly: "firefly",
  };

  test("each decoration is the size of its art and sits beside its minigame's cabinet, clear of the cabinets and the counter", () => {
    const machines = newMachines(() => fakeSoftware());
    for (const p of prizes) {
      const own = cabinetOf[p.software];
      const cabinet = defined(machines.find((m) => m.title === own)).rect;
      const r = { x: p.x, y: p.y, w: p.sprite.w, h: p.sprite.h };
      // Within a cabinet's width of the Sweet Sam cabinet, nearer it than any other.
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
      expect({ id: p.id, counter: checkCollision(r, counterRect) }).toEqual({ id: p.id, counter: false });
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
    const s = newState(null, () => fakeSoftware());
    s.prizes = prizes.map((p) => p.id);
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

  test("owned prizes are kept once each, in catalogue order", () => {
    expect(inCatalogueOrder(["sleepyBees", "honeyJar", "sleepyBees"])).toEqual(["honeyJar", "sleepyBees"]);
  });
});

describe("buyPrize", () => {
  test("buys the Brass Monkey prizes the same way", () => {
    expect(buyPrize({ tickets: 30, prizes: [] }, "oilCan")).toEqual({ tickets: 5, prizes: ["oilCan"] });
    expect(buyPrize({ tickets: 175, prizes: ["oilCan", "honeyJar"] }, "pocketWatch")).toEqual({
      tickets: 75,
      prizes: ["honeyJar", "oilCan", "pocketWatch"],
    });
    expect(buyPrize({ tickets: 49, prizes: [] }, "springBoots")).toBeNull();
    expect(buyPrize({ tickets: 100, prizes: ["springBoots"] }, "springBoots")).toBeNull();
  });

  test("takes the prize's price once and adds it to the owned prizes", () => {
    expect(buyPrize({ tickets: 25, prizes: [] }, "honeyJar")).toEqual({ tickets: 0, prizes: ["honeyJar"] });
    expect(buyPrize({ tickets: 130, prizes: ["sleepyBees"] }, "runningShoes")).toEqual({
      tickets: 80,
      prizes: ["runningShoes", "sleepyBees"],
    });
    expect(buyPrize({ tickets: 100, prizes: [] }, "sleepyBees")).toEqual({ tickets: 0, prizes: ["sleepyBees"] });
  });

  test("an owned prize can't be bought again", () => {
    const after = defined(buyPrize({ tickets: 60, prizes: [] }, "honeyJar"));
    expect(after).toEqual({ tickets: 35, prizes: ["honeyJar"] });
    expect(buyPrize(after, "honeyJar")).toBeNull();
    expect(prizeOffer(after, "honeyJar")).toBe("owned");
  });

  test("an unaffordable prize can't be bought", () => {
    expect(buyPrize({ tickets: 24, prizes: [] }, "honeyJar")).toBeNull();
    expect(buyPrize({ tickets: 49, prizes: ["honeyJar"] }, "runningShoes")).toBeNull();
    expect(buyPrize({ tickets: 99, prizes: [] }, "sleepyBees")).toBeNull();
    expect(prizeOffer({ tickets: 99, prizes: [] }, "sleepyBees")).toBe("short");
  });

  test("prizeOffers lists every prize's offer in catalogue order", () => {
    expect(prizeOffers({ tickets: 60, prizes: ["honeyJar", "springBoots"] })).toEqual([
      "owned",
      "buy",
      "short",
      "buy",
      "owned",
      "short",
    ]);
  });
});
