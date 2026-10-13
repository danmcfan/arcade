import { describe, expect, test } from "bun:test";
import { conveyorFloor, floors, girderFloor, girderTop, type Floor, type Ladder } from "./floors.ts";

/** The tops of `floor`'s girders under the 8 px column at x. */
const topsAt = (floor: Floor, x: number): number[] =>
  floor.girders.filter((g) => x >= g.x0 && x < g.x1).map((g) => girderTop(g, x));

const name = (l: Ladder): string => `ladder at x ${l.x}, rows ${l.top}-${l.bottom}`;

describe("the girder floor", () => {
  test("the bottom girder is flat where the monkey walks: y 248 from x 0 to 111, then rising 1 px every 16 px", () => {
    expect([0, 56, 104].map((x) => topsAt(girderFloor, x).at(0))).toEqual([248, 248, 248]);
    expect([112, 128, 208].map((x) => topsAt(girderFloor, x).at(0))).toEqual([247, 246, 241]);
  });

  test("the Gnome's girder is at y 84 under the Gnome (x 24-55)", () => {
    for (const x of [24, 32, 40, 48]) expect(topsAt(girderFloor, x)).toContain(84);
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

describe("the conveyor floor", () => {
  test("has three conveyors, each running the other way to the one below it", () => {
    const belts = conveyorFloor.girders.filter((g) => g.belt !== undefined).map((g) => [g.y, g.belt]);
    expect(belts).toEqual([
      [208, -1],
      [168, 1],
      [128, -1],
    ]);
  });

  test("its girders and conveyors are flat", () => {
    expect(conveyorFloor.girders.every((g) => g.drop === 0)).toBe(true);
  });
});

describe.each([
  ["girder floor", girderFloor],
  ["conveyor floor", conveyorFloor],
] as const)("the %s", (_, floor) => {
  test("is 224×256", () => {
    expect([floor.width, floor.height]).toEqual([224, 256]);
  });

  test("every ladder stands on a girder: its bottom row is just above a girder's top", () => {
    for (const l of floor.ladders)
      expect({ ladder: name(l), on: topsAt(floor, l.x).includes(l.bottom + 1) }).toEqual({ ladder: name(l), on: true });
  });

  test("every ladder hangs from a girder: its top row is just under it", () => {
    for (const l of floor.ladders)
      expect({ ladder: name(l), under: topsAt(floor, l.x).includes(l.top - 8) }).toEqual({
        ladder: name(l),
        under: true,
      });
  });

  test("the exit door, the Gnome, the monkey's start and every bolt stand on a girder", () => {
    const { door, gnome, start } = floor;
    expect(topsAt(floor, door.x)).toContain(door.y);
    expect(topsAt(floor, door.x + 8)).toContain(door.y);
    expect(topsAt(floor, gnome.x + 16)).toContain(gnome.y + 32);
    expect(topsAt(floor, start.x)).toContain(start.y);
    for (const b of floor.bolts)
      expect({ bolt: b, on: topsAt(floor, b.x).includes(b.y) }).toEqual({ bolt: b, on: true });
  });
});

test("the floors are played girder floor, then conveyor floor", () => {
  expect(floors).toEqual([girderFloor, conveyorFloor]);
});
