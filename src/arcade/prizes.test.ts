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
  prizes,
  runningShoesPrice,
  sleepyBeesPrice,
} from "./prizes.ts";
import { defined } from "../engine/defined.testutil.ts";
import { fakeSoftware } from "../game/fakeSoftware.testutil.ts";
import { newState, blocked } from "./state.ts";

describe("prize catalogue", () => {
  test("three Sweet Sam prizes: honey jar 25, running shoes 50, sleepy bees 100 tickets", () => {
    expect(prizes.map((p) => [p.id, p.name, p.price, p.software])).toEqual([
      ["honeyJar", "HONEY JAR", 25, "hive"],
      ["runningShoes", "RUNNING SHOES", 50, "hive"],
      ["sleepyBees", "SLEEPY BEES", 100, "hive"],
    ]);
    expect([honeyJarPrice, runningShoesPrice, sleepyBeesPrice]).toEqual([25, 50, 100]);
  });

  test("each decoration is the size of its art and sits beside the Sweet Sam cabinet, clear of the cabinets and the counter", () => {
    const machines = newMachines(() => fakeSoftware());
    const sweet = defined(machines.find((m) => m.title === "sweet")).rect;
    for (const p of prizes) {
      const r = { x: p.x, y: p.y, w: p.sprite.w, h: p.sprite.h };
      // Within a cabinet's width of the Sweet Sam cabinet, nearer it than any other.
      const centre = r.x + r.w / 2;
      const dist = (m: { x: number; w: number }): number => Math.abs(m.x + m.w / 2 - centre);
      expect({ id: p.id, nearest: machines.reduce((a, b) => (dist(a.rect) <= dist(b.rect) ? a : b)).title }).toEqual({
        id: p.id,
        nearest: "sweet",
      });
      expect({ id: p.id, near: dist(sweet) <= 16 }).toEqual({ id: p.id, near: true });
      for (const m of machines) {
        if (m.title === "sweet") continue;
        expect({ id: p.id, over: m.title, hit: checkCollision(r, m.rect) }).toEqual({
          id: p.id,
          over: m.title,
          hit: false,
        });
      }
      expect({ id: p.id, counter: checkCollision(r, counterRect) }).toEqual({ id: p.id, counter: false });
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
    expect(prizeOffers({ tickets: 60, prizes: ["honeyJar"] })).toEqual(["owned", "buy", "short"]);
  });
});
