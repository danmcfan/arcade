import { describe, expect, test } from "bun:test";
import { findMachine, newMachines } from "./machine.ts";
import { fakeSoftware } from "../game/fakeSoftware.testutil.ts";
import type { Software, SoftwareName } from "../game/software.ts";
import type { Rect } from "./collision.ts";
import type { PrizeId } from "./prizes.ts";

function recordingFactory(): {
  calls: [SoftwareName, number, readonly PrizeId[]][];
  factory: (name: SoftwareName, highScore: number, prizes: readonly PrizeId[]) => Software;
} {
  const calls: [SoftwareName, number, readonly PrizeId[]][] = [];
  const factory = (name: SoftwareName, highScore: number, prizes: readonly PrizeId[]): Software => {
    calls.push([name, highScore, prizes]);
    return fakeSoftware(name);
  };
  return { calls, factory };
}

describe("newMachines", () => {
  test("three cabinets left to right: brassMonkey, sweet (sweetSam), firefly", () => {
    const { factory } = recordingFactory();
    const ms = newMachines(factory);
    expect(ms.map((m) => [m.rect, m.title])).toEqual([
      [{ x: 48, y: 40, w: 16, h: 16 }, "brassMonkey"],
      [{ x: 72, y: 40, w: 16, h: 16 }, "sweet"],
      [{ x: 96, y: 40, w: 16, h: 16 }, "firefly"],
    ]);
  });

  test("newSoftware builds the matching software and passes the high score and owned prizes through", () => {
    const { calls, factory } = recordingFactory();
    const ms = newMachines(factory);
    expect(ms.map((m) => m.newSoftware(1234, ["honeyJar"]).name)).toEqual(["brassMonkey", "sweetSam", "firefly"]);
    expect(calls).toEqual([
      ["brassMonkey", 1234, ["honeyJar"]],
      ["sweetSam", 1234, ["honeyJar"]],
      ["firefly", 1234, ["honeyJar"]],
    ]);
  });
});

// Player rect is 16x24 centred on (x, y); y = 60 is flush with the top wall.
function playerAt(x: number, y: number): Rect {
  return { x: x - 8, y: y - 12, w: 16, h: 24 };
}

describe("findMachine", () => {
  const ms = newMachines(recordingFactory().factory);

  test("spawn point is not at a machine", () => {
    expect(findMachine(playerAt(80, 92), ms)).toBeNull();
  });

  test("standing against the top wall under each cabinet", () => {
    expect(findMachine(playerAt(56, 60), ms)?.title).toBe("brassMonkey");
    expect(findMachine(playerAt(80, 60), ms)?.title).toBe("sweet");
    expect(findMachine(playerAt(104, 60), ms)?.title).toBe("firefly");
  });

  test("one pixel below the cabinets' bottom edge (y = 56) is out of reach", () => {
    expect(findMachine(playerAt(80, 68), ms)).toBeNull();
    expect(findMachine(playerAt(80, 67), ms)?.title).toBe("sweet");
  });

  test("edges touching is not a hit; the first overlapping machine wins", () => {
    // Player x range [64, 80) only touches brassMonkey's right edge (64) → sweet only.
    expect(findMachine(playerAt(72, 60), ms)?.title).toBe("sweet");
    // Player x range [60, 76) overlaps brassMonkey [48, 64) and sweet [72, 88) → brassMonkey.
    expect(findMachine(playerAt(68, 60), ms)?.title).toBe("brassMonkey");
    // Between brassMonkey and sweet with no overlap is impossible (gap 8 < width 16);
    // left of brassMonkey: player x range [32, 48) touches only.
    expect(findMachine(playerAt(40, 60), ms)).toBeNull();
  });
});
