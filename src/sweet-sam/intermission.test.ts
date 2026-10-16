import { describe, expect, test } from "bun:test";
import { intermissionAfter, intermissionPoses, type IntermissionScene } from "./intermission.ts";

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

describe("intermission scenes (#160)", () => {
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

  test("Act II: the red bee follows the bear, snags partway and stays to the end", () => {
    expect(who(5, 50)).toEqual(["bear LEFT", "redBee LEFT"]);
    const snagged = intermissionPoses(scene(5), 150);
    expect(snagged.map((p) => [p.sprite, p.x])).toEqual([
      ["bear", 0],
      ["redBee", 128],
    ]);
    expect(intermissionPoses(scene(5), 300).map((p) => [p.sprite, p.x])).toEqual([["redBee", 128]]);
  });

  test("Act III: the red bee chases the bear across, then comes back alone the other way", () => {
    expect(who(9, 50)).toEqual(["bear LEFT", "redBee LEFT"]);
    expect(who(9, 300)).toEqual(["redBee RIGHT"]);
  });
});
