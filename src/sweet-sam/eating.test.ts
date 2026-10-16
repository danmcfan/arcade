import { beforeEach, describe, expect, test } from "bun:test";
import * as rng from "../engine/rng.ts";
import { NO_INPUT, type Input } from "../engine/input.ts";
import { SweetSamSoftware } from "./software.ts";

// Corner (6, 5) allows all four directions; its centre, and its honey drop, are at (52, 68).
const crossX = 52;
const crossY = 68;

beforeEach(() => {
  rng.seed(1);
});

const up: Input = { ...NO_INPUT, up: true };

/** A game in PLAY with the bear heading LEFT at (x, crossY) and the bees held at home. */
function playingAt(x: number): SweetSamSoftware {
  const s = new SweetSamSoftware(0);
  for (let k = 0; k < 122; k++) s.update(NO_INPUT);
  expect(s.snapshot().state).toBe("PLAY");
  for (const e of s.enemies) {
    e.home = true;
    e.dotMinimum = 1000;
  }
  s.player.x = x;
  s.player.y = crossY;
  s.player.direction = "LEFT";
  return s;
}

function junctionItem(s: SweetSamSoftware): number {
  const idx = s.items.findIndex((it) => it !== null && it.x === crossX && it.y === crossY);
  if (idx < 0) throw new Error("no item on the junction");
  return idx;
}

/** Holds UP round the junction until the bear is out of its tile; the points scored the tick item `idx` went. */
function cornerUp(s: SweetSamSoftware, idx: number): number {
  let scored = 0;
  for (let k = 0; k < 12; k++) {
    const before = s.scoreValue;
    const present = s.items[idx] !== null;
    s.update(up);
    if (present && s.items[idx] === null) scored = s.scoreValue - before;
  }
  expect(s.player.direction).toBe("UP");
  expect(s.player.y).toBeLessThan(crossY - 4);
  return scored;
}

describe("the bear eats the item on a junction it corners round", () => {
  test.each([
    ["4 px before", crossX + 4],
    ["3 px after", crossX - 3],
  ])("a honey drop, pre-turning %s the centre, scores 10", (_, x) => {
    const s = playingAt(x);
    const idx = junctionItem(s);
    expect(cornerUp(s, idx)).toBe(10);
    expect(s.items[idx]).toBeNull();
  });

  test.each([
    ["4 px before", crossX + 4],
    ["3 px after", crossX - 3],
  ])("a honey pot, pre-turning %s the centre, scores 50 and makes the bees sleepy", (_, x) => {
    const s = playingAt(x);
    const idx = junctionItem(s);
    const pot = s.items[idx];
    if (!pot) throw new Error("no pot");
    pot.powerPellet = true;
    expect(cornerUp(s, idx)).toBe(50);
    expect(s.items[idx]).toBeNull();
    expect(s.enemies.every((e) => e.blueFrames > 0)).toBe(true);
  });
});

/** The bear heading LEFT one step short of the drop at (crossX - 8, crossY), a bee free in the maze. */
function beforeDrop(): { s: SweetSamSoftware; idx: number } {
  const s = playingAt(crossX - 8 + 1);
  const idx = s.items.findIndex((it) => it !== null && it.x === crossX - 8 && it.y === crossY);
  if (idx < 0) throw new Error("no drop left of the junction");
  return { s, idx };
}

function freeBee(s: SweetSamSoftware): { x: number; y: number } {
  const bee = s.enemies[0];
  if (!bee) throw new Error("no bee");
  bee.home = false;
  return bee;
}

/** Where the bear is after 30 ticks heading LEFT from the junction, and how many drops it ate. */
function run(cleared: boolean): { x: number; eaten: number } {
  const s = playingAt(crossX - 1);
  if (cleared) s.items = s.items.map((it) => (it !== null && it.y === crossY && it.x <= crossX ? null : it));
  const left = (): number => s.items.filter((it) => it !== null).length;
  const before = left();
  for (let k = 0; k < 30; k++) s.update(NO_INPUT);
  return { x: s.player.x, eaten: before - left() };
}

describe("the bear pauses after it eats (Dossier, Speed)", () => {
  test("a honey drop holds the bear for one tick while the bees move", () => {
    const { s, idx } = beforeDrop();
    const bee = freeBee(s);
    let x = s.player.x;
    s.update(NO_INPUT);
    expect(s.items[idx]).toBeNull();
    expect(s.player.x).toBe(x - 1);
    x = s.player.x;
    const beeAt = { x: bee.x, y: bee.y };
    s.update(NO_INPUT);
    expect(s.player.x).toBe(x);
    expect({ x: bee.x, y: bee.y }).not.toEqual(beeAt);
    s.update(NO_INPUT);
    expect(s.player.x).toBe(x - 1);
  });

  test("a honey pot holds the bear for three ticks", () => {
    const { s, idx } = beforeDrop();
    const pot = s.items[idx];
    if (!pot) throw new Error("no pot");
    pot.powerPellet = true;
    s.update(NO_INPUT);
    expect(s.items[idx]).toBeNull();
    const x = s.player.x;
    for (let k = 0; k < 3; k++) {
      s.update(NO_INPUT);
      expect(s.player.x).toBe(x);
    }
    s.update(NO_INPUT);
    expect(s.player.x).toBeLessThan(x);
  });

  test("over a run of N drops the bear covers N fewer steps than over the same run already eaten", () => {
    const full = run(false);
    const empty = run(true);
    expect(full.eaten).toBeGreaterThan(1);
    expect(empty.eaten).toBe(0);
    expect(full.x - empty.x).toBe(full.eaten);
  });
});
