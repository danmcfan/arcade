import { beforeEach, describe, expect, test } from "bun:test";
import * as rng from "../engine/rng.ts";
import { NO_INPUT, type Input } from "../engine/input.ts";
import { SweetSamSoftware } from "./software.ts";
import type { ItemSetup, LevelSetup } from "./level.ts";

// Corner (6, 5) allows all four directions; its centre, and its honey drop, are at (52, 68).
const crossX = 52;
const crossY = 68;

beforeEach(() => {
  rng.seed(1);
});

const up: Input = { ...NO_INPUT, up: true };

const held = { home: true, dotMinimum: 1000 };

/** A game in PLAY with the bear heading LEFT at (x, crossY) and the bees held at home. */
function playingAt(x: number, setup: LevelSetup = {}): SweetSamSoftware {
  const s = new SweetSamSoftware(0, undefined, { bees: [held, held, held, held], player: { x, y: crossY }, ...setup });
  expect(s.snapshot().state).toBe("PLAY");
  return s;
}

function junctionItem(s: SweetSamSoftware): number {
  const idx = s.level.items().findIndex((it) => it !== null && it.x === crossX && it.y === crossY);
  if (idx < 0) throw new Error("no item on the junction");
  return idx;
}

/** Turns the item on the junction into a honey pot. */
const potOnJunction = (it: ItemSetup): ItemSetup => (it.x === crossX && it.y === crossY ? { ...it, power: true } : it);

/** Holds UP round the junction until the bear is out of its tile; the points scored the tick item `idx` went. */
function cornerUp(s: SweetSamSoftware, idx: number): number {
  let scored = 0;
  for (let k = 0; k < 12; k++) {
    const before = s.score();
    const present = s.level.items()[idx] !== null;
    s.update(up);
    if (present && s.level.items()[idx] === null) scored = s.score() - before;
  }
  expect(s.level.player().direction).toBe("UP");
  expect(s.level.player().y).toBeLessThan(crossY - 4);
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
    expect(s.level.items()[idx]).toBeNull();
  });

  test.each([
    ["4 px before", crossX + 4],
    ["3 px after", crossX - 3],
  ])("a honey pot, pre-turning %s the centre, scores 50 and makes the bees sleepy", (_, x) => {
    const s = playingAt(x, { items: potOnJunction });
    const idx = junctionItem(s);
    expect(cornerUp(s, idx)).toBe(50);
    expect(s.level.items()[idx]).toBeNull();
    expect(s.level.enemies().every((e) => e.blueFrames > 0)).toBe(true);
  });
});

/** The bear heading LEFT one step short of the drop at (crossX - 8, crossY), red free in the maze. */
function beforeDrop(setup: LevelSetup = {}): { s: SweetSamSoftware; idx: number } {
  const s = playingAt(crossX - 8 + 1, { bees: [{ home: false, dotMinimum: 1000 }, held, held, held], ...setup });
  const idx = s.level.items().findIndex((it) => it !== null && it.x === crossX - 8 && it.y === crossY);
  if (idx < 0) throw new Error("no drop left of the junction");
  return { s, idx };
}

function bee(s: SweetSamSoftware): { x: number; y: number } {
  const red = s.level.enemies()[0];
  if (!red) throw new Error("no bee");
  return { x: red.x, y: red.y };
}

/** Where the bear is after 30 ticks heading LEFT from the junction, and how many drops it ate. */
function run(cleared: boolean): { x: number; eaten: number } {
  const s = playingAt(crossX - 1, {
    items: (it) => (cleared && it.y === crossY && it.x <= crossX ? null : it),
  });
  const left = (): number => s.snapshot().items;
  const before = left();
  for (let k = 0; k < 30; k++) s.update(NO_INPUT);
  return { x: s.level.player().x, eaten: before - left() };
}

describe("the bear pauses after it eats (Dossier, Speed)", () => {
  test("a honey drop holds the bear for one tick while the bees move", () => {
    const { s, idx } = beforeDrop();
    let x = s.level.player().x;
    s.update(NO_INPUT);
    expect(s.level.items()[idx]).toBeNull();
    expect(s.level.player().x).toBe(x - 1);
    x = s.level.player().x;
    const beeAt = bee(s);
    s.update(NO_INPUT);
    expect(s.level.player().x).toBe(x);
    expect(bee(s)).not.toEqual(beeAt);
    s.update(NO_INPUT);
    expect(s.level.player().x).toBe(x - 1);
  });

  test("a honey pot holds the bear for three ticks", () => {
    const { s, idx } = beforeDrop({
      items: (it) => (it.x === crossX - 8 && it.y === crossY ? { ...it, power: true } : it),
    });
    s.update(NO_INPUT);
    expect(s.level.items()[idx]).toBeNull();
    const x = s.level.player().x;
    for (let k = 0; k < 3; k++) {
      s.update(NO_INPUT);
      expect(s.level.player().x).toBe(x);
    }
    s.update(NO_INPUT);
    expect(s.level.player().x).toBeLessThan(x);
  });

  test("over a run of N drops the bear covers N fewer steps than over the same run already eaten", () => {
    const full = run(false);
    const empty = run(true);
    expect(full.eaten).toBeGreaterThan(1);
    expect(empty.eaten).toBe(0);
    expect(full.x - empty.x).toBe(full.eaten);
  });
});
