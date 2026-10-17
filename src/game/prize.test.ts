import { describe, expect, test } from "bun:test";
import { minigames } from "./minigames.ts";

/** The advantages whose values differ between `a` and `b`. */
function changed(a: Readonly<Record<string, number>>, b: Readonly<Record<string, number>>): string[] {
  return Object.keys(a).filter((k) => a[k] !== b[k]);
}

describe("every prize, as its minigame declares it", () => {
  const all = minigames.flatMap((m) => m.prizes.map((p) => ({ m, p })));

  test("nine prizes, each with a name, a price and an effect", () => {
    expect(all.length).toBe(9);
    for (const { p } of all) {
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.price).toBeGreaterThan(0);
      expect(p.effect.length).toBeGreaterThan(0);
    }
  });

  for (const { m, p } of all) {
    test(`${p.id}: owning it changes ${m.name}'s ${p.advantage} and nothing else`, () => {
      expect(changed(m.advantages([p.id]), m.advantages([]))).toEqual([p.advantage]);
    });

    for (const other of minigames.filter((o) => o !== m)) {
      test(`${p.id}: does nothing in ${other.name}`, () => {
        expect(other.advantages([p.id])).toEqual(other.advantages([]));
      });
    }
  }

  test("owning them all changes each minigame's declared advantages together", () => {
    const ids = all.map(({ p }) => p.id);
    for (const m of minigames) {
      expect(changed(m.advantages(ids), m.advantages([])).toSorted()).toEqual(
        m.prizes.map((p) => p.advantage).toSorted(),
      );
    }
  });
});
