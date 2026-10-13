import { describe, expect, test } from "bun:test";
import { girderFloor, girderTop, type Ladder } from "./floors.ts";

/** The tops of the girders under the 8 px column at x. */
const topsAt = (x: number): number[] =>
  girderFloor.girders.filter((g) => x >= g.x0 && x < g.x1).map((g) => girderTop(g, x));

const name = (l: Ladder): string => `ladder at x ${l.x}, rows ${l.top}-${l.bottom}`;

describe("the girder floor", () => {
  test("the bottom girder is flat where the monkey walks: y 248 from x 0 to 111, then rising 1 px every 16 px", () => {
    expect([0, 56, 104].map((x) => topsAt(x).at(0))).toEqual([248, 248, 248]);
    expect([112, 128, 208].map((x) => topsAt(x).at(0))).toEqual([247, 246, 241]);
  });

  test("the Gnome's girder is at y 84 under the Gnome (x 24-55), and the exit door stands on the top platform", () => {
    for (const x of [24, 32, 40, 48]) expect(topsAt(x)).toContain(84);
    expect(topsAt(girderFloor.door.x)).toContain(girderFloor.door.y);
    expect(topsAt(girderFloor.door.x + 8)).toContain(girderFloor.door.y);
  });

  test("every ladder stands on a girder: its bottom row is just above a girder's top", () => {
    for (const l of girderFloor.ladders)
      expect({ ladder: name(l), on: topsAt(l.x).includes(l.bottom + 1) }).toEqual({ ladder: name(l), on: true });
  });

  test("every ladder but the two tall ones behind the Gnome hangs from a girder: its top row is just under it", () => {
    const tall = girderFloor.ladders.filter((l) => l.top === 32).map((l) => l.x);
    expect(tall).toEqual([64, 80]);
    for (const l of girderFloor.ladders.filter((ladder) => ladder.top !== 32))
      expect({ ladder: name(l), under: topsAt(l.x).includes(l.top - 8) }).toEqual({ ladder: name(l), under: true });
  });

  test("a broken ladder's gap is inside it", () => {
    const broken = girderFloor.ladders.filter((l) => l.gap !== undefined);
    expect(broken.map((l) => l.x)).toEqual([64, 80, 88, 168]);
    for (const l of broken) {
      const [from = 0, to = 0] = l.gap ?? [];
      expect(from > l.top && to < l.bottom && from <= to).toBe(true);
    }
  });
});
