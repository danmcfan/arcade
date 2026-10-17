import { describe, expect, test } from "bun:test";
import { propColumn, tearColumn } from "./art.ts";
import {
  intermissionAfter,
  intermissionFloor,
  intermissionPoses,
  type IntermissionPose,
  type IntermissionScene,
} from "./intermission.ts";

function scene(level: number): IntermissionScene {
  const s = intermissionAfter(level);
  if (s === null) throw new Error(`no scene after level ${level}`);
  return s;
}

function who(level: number, tick: number): string[] {
  return intermissionPoses(scene(level), tick).map(
    (p) => `${p.frightened ? "blue " : ""}${p.scale === 2 ? "big " : ""}${p.sprite} ${p.facing}`,
  );
}

/** Act II's torn bee at `tick`: its frame, x and y. */
function at(tick: number): number[][] {
  return intermissionPoses(scene(5), tick)
    .filter((p) => p.sprite === "tornBee")
    .map((p) => [p.frame, p.x, p.y]);
}

/** One `sprite` in Act II at `tick`, if on screen. */
function act2(sprite: string, tick: number): IntermissionPose | undefined {
  return intermissionPoses(scene(5), tick).find((p) => p.sprite === sprite);
}

describe("intermission scenes (#160, #199)", () => {
  test("only levels 2, 5 and 9 have one", () => {
    expect([1, 2, 3, 5, 9, 10, 17].map((l) => intermissionAfter(l)?.name ?? null)).toEqual([
      null,
      "act-1",
      null,
      "act-2",
      "act-3",
      null,
      null,
    ]);
  });

  test("Act I: the red bee chases the bear left, then a big bear chases a blue bee right", () => {
    expect(who(2, 50)).toEqual(["bear LEFT", "redBee LEFT"]);
    expect(who(2, 300)).toEqual(["blue redBee RIGHT", "big bear RIGHT"]);
    const [bee, bear] = intermissionPoses(scene(2), 300);
    expect((bee?.x ?? 0) > (bear?.x ?? 0)).toBe(true); // the bee runs ahead
  });

  test("Act II: the red bee follows the bear and snags on the nail; its wing stretches and tears (#199)", () => {
    expect(who(5, 50)).toEqual(["nail LEFT", "bear LEFT", "redBee LEFT"]);
    expect([95, 105, 120].map((t) => at(t)[0]?.[0])).toEqual([
      tearColumn.stretch,
      tearColumn.stretch + 1,
      tearColumn.stretch + 2,
    ]);
    // Torn, the bee drops to the floor and turns to look back at its wing.
    expect(at(147)).toEqual([[tearColumn.torn, 117, intermissionFloor]]);
    expect(who(5, 250)).toEqual(["nail LEFT", "tornBee RIGHT", "wing LEFT"]);
  });

  test("Act II: the torn wing flutters from the nail down to the floor and stays", () => {
    expect(act2("wing", 130)).toBeUndefined();
    expect(act2("wing", 131)?.y).toBeLessThan(0);
    expect([act2("wing", 140)?.frame, act2("wing", 146)?.frame]).toEqual([propColumn.wing + 1, propColumn.wing]);
    expect(act2("wing", 300)).toMatchObject({ y: intermissionFloor, frame: propColumn.wing });
  });

  test("Act III: the patched bee chases the bear, then crawls back dragging its wing, kicking up dust", () => {
    expect(who(9, 50)).toEqual(["bear LEFT", "tornBee LEFT"]);
    const chase = intermissionPoses(scene(9), 50).find((p) => p.sprite === "tornBee");
    expect(chase?.y).toBe(0);
    expect([tearColumn.patched, tearColumn.patched + 1]).toContain(chase?.frame ?? -1);
    const home = intermissionPoses(scene(9), 300);
    const bee = home.find((p) => p.sprite === "tornBee");
    const wing = home.find((p) => p.sprite === "wing");
    expect(bee).toMatchObject({ facing: "RIGHT", y: intermissionFloor });
    expect([tearColumn.crawl, tearColumn.crawl + 1]).toContain(bee?.frame ?? -1);
    expect((wing?.x ?? 0) < (bee?.x ?? 0)).toBe(true); // dragged behind
    expect(home.some((p) => p.sprite === "dust")).toBe(true);
    expect(scene(9).ticks).toBe(580);
  });

  test("a dust puff rises through its three frames, then is gone", () => {
    expect([147, 153, 159].map((t) => act2("dust", t)?.frame)).toEqual([
      propColumn.dust,
      propColumn.dust + 1,
      propColumn.dust + 2,
    ]);
    expect(act2("dust", 170)).toBeUndefined();
  });
});
