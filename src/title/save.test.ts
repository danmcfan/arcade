import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { parseSave, saveVersion } from "./save.ts";

// Bumping `saveVersion` must decide what happens to the saves already out
// there: add test/fixtures/saves/v<old>.json, a save in the old format, and
// make `parseSave` upgrade it (or reject it on purpose, and say so here).
const previous = saveVersion - 1;
const fixture = new URL(`../../test/fixtures/saves/v${previous}.json`, import.meta.url).pathname;

describe("save version guard", () => {
  test(`a fixture of the previous version's save (v${previous}) exists`, () => {
    expect(existsSync(fixture)).toBe(true);
  });

  test(`a v${previous} save loads as the current version`, () => {
    const raw: unknown = JSON.parse(readFileSync(fixture, "utf8"));
    expect(raw).toMatchObject({ v: previous });
    expect(parseSave(raw)).toMatchObject({
      v: saveVersion,
      highScores: { sweetSam: 1000, firefly: 2000, brassMonkey: 3000 },
      tokens: 7,
      tickets: 42,
      prizes: ["lantern"],
      player: { x: 120, y: 96, dir: "LEFT" },
    });
  });
});
