import { describe, expect, test } from "bun:test";
import {
  conveyorFloor,
  elevatorFloor,
  floors,
  floorsFor,
  girderFloor,
  girderTop,
  liftTops,
  rivetFloor,
  type Floor,
  type Ladder,
  type Shaft,
} from "./floors.ts";

/** The tops of `floor`'s girders under the 8 px column at x. */
const topsAt = (floor: Floor, x: number): number[] =>
  floor.girders.filter((g) => x >= g.x0 && x < g.x1).map((g) => girderTop(g, x));
/** Whether a platform in `shaft`, moving 0.5 px a tick, comes level with a girder at y. */
const level = (shaft: Shaft, y: number): boolean =>
  y >= shaft.top && y <= shaft.bottom && Number.isInteger((y - shaft.top) * 2);

const name = (l: Ladder): string => `ladder at x ${l.x}, rows ${l.top}-${l.bottom}`;

describe("the girder floor", () => {
  test("the bottom girder is flat where the monkey walks: y 248 from x 0 to 111, then rising 1 px every 16 px", () => {
    expect([0, 56, 104].map((x) => topsAt(girderFloor, x).at(0))).toEqual([248, 248, 248]);
    expect([112, 128, 208].map((x) => topsAt(girderFloor, x).at(0))).toEqual([247, 246, 241]);
  });

  test("the Gnome's girder is at y 84 under the Gnome (x 24-55)", () => {
    for (const x of [24, 32, 40, 48]) expect(topsAt(girderFloor, x)).toContain(84);
  });

  test("the furnace stands on the bottom girder at its left end, clear of the monkey's start", () => {
    const { furnace, start } = girderFloor;
    expect(furnace).toEqual({ x: 8, y: 248 });
    expect(start.x - (furnace?.x ?? 0)).toBeGreaterThanOrEqual(16);
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

describe("the rivet floor", () => {
  test("has 8 rivet slots, two on each of its four upper girders, and no exit door", () => {
    expect(rivetFloor.rivets?.length).toBe(8);
    expect(new Set(rivetFloor.rivets?.map((r) => r.y))).toEqual(new Set([208, 168, 128, 88]));
    expect(rivetFloor.door).toBeUndefined();
  });

  test("its girders are flat and every rivet slot stands on one", () => {
    expect(rivetFloor.girders.every((g) => g.drop === 0 && g.belt === undefined)).toBe(true);
    for (const r of rivetFloor.rivets ?? []) expect(topsAt(rivetFloor, r.x)).toContain(r.y);
  });

  test("no ladder meets a rivet slot", () => {
    for (const r of rivetFloor.rivets ?? [])
      for (const l of rivetFloor.ladders) expect(Math.abs(l.x + 4 - r.x)).toBeGreaterThan(8);
  });
});

describe.each([
  ["girder floor", girderFloor],
  ["conveyor floor", conveyorFloor],
  ["elevator floor", elevatorFloor],
  ["rivet floor", rivetFloor],
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
    if (door !== undefined) {
      expect(topsAt(floor, door.x)).toContain(door.y);
      expect(topsAt(floor, door.x + 8)).toContain(door.y);
    }
    expect(topsAt(floor, gnome.x + 16)).toContain(gnome.y + 32);
    expect(topsAt(floor, start.x)).toContain(start.y);
    for (const b of floor.bolts)
      expect({ bolt: b, on: topsAt(floor, b.x).includes(b.y) }).toEqual({ bolt: b, on: true });
  });
});

describe("the elevator floor", () => {
  const [up, down] = elevatorFloor.lifts ?? [];

  test("has an up shaft on the left and a down shaft on the right, between fixed girders", () => {
    expect([up?.dir, down?.dir]).toEqual([-1, 1]);
    expect((up?.x ?? 0) < (down?.x ?? 0)).toBe(true);
  });

  test("a platform passes level with each girder beside its shaft, so the monkey can step on and off", () => {
    if (up === undefined || down === undefined) throw new Error("no lifts");
    expect([248, 192].every((y) => level(up, y))).toBe(true);
    expect([152, 232].every((y) => level(down, y))).toBe(true);
  });

  test("its platforms are spaced evenly and move with the travel, coming back at the far end", () => {
    if (up === undefined || down === undefined) throw new Error("no lifts");
    expect(liftTops(up, 0)).toEqual([254, 204, 154]);
    expect(liftTops(up, 10)).toEqual([244, 194, 144]);
    expect(liftTops(up, 60)).toEqual([194, 144, 244]);
    expect(liftTops(down, 0)).toEqual([136, 196]);
    expect(liftTops(down, 70)).toEqual([206, 146]);
  });

  test("its springs drop between the Gnome's girder and the ledge right of it", () => {
    const drop = elevatorFloor.springs?.dropX ?? 0;
    expect(topsAt(elevatorFloor, drop)).not.toContain(88);
    expect(topsAt(elevatorFloor, drop - 16)).toContain(88);
    expect(topsAt(elevatorFloor, drop + 8)).toContain(88);
  });
});

test("only the girder floor has a furnace", () => {
  expect([conveyorFloor, elevatorFloor, rivetFloor].map((f) => f.furnace)).toEqual([undefined, undefined, undefined]);
});

test("only the conveyor floor carries pans", () => {
  expect([girderFloor.pans, conveyorFloor.pans, elevatorFloor.pans]).toEqual([undefined, true, undefined]);
});

test("the floors are played girder floor, conveyor floor, elevator floor, then rivet floor, as Donkey Kong's 25m, 50m, 75m and 100m", () => {
  expect(floors).toEqual([girderFloor, conveyorFloor, elevatorFloor, rivetFloor]);
});

/** Each floor as Donkey Kong's board height, in metres. */
const m = (loop: number): number[] => floorsFor(loop).map((f) => [25, 50, 75, 100][floors.indexOf(f)] ?? 0);

describe("each loop's floor plan", () => {
  test("follows Donkey Kong's board order: 25-100, 25-75-100, 25-50-75-100, 25-50-25-75-100, then 25-50-25-75-25-100", () => {
    expect([0, 1, 2, 3, 4].map((l) => m(l).join("-"))).toEqual([
      "25-100",
      "25-75-100",
      "25-50-75-100",
      "25-50-25-75-100",
      "25-50-25-75-25-100",
    ]);
  });

  test("every loop from the fifth plays the fifth's plan", () => {
    expect(floorsFor(10)).toEqual(floorsFor(4));
  });
});
