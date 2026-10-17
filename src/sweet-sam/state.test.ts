import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as rng from "../engine/rng.ts";
import { NO_INPUT, type Input } from "../engine/input.ts";
import { addSoundListener, type SoundEvent } from "../engine/audio.ts";
import type { SweetSamEnemySnapshot } from "../game/snapshot.ts";
import { SweetSamSoftware } from "./software.ts";
import { levelBannerTicks, levelClearTicks, respawnBlinkHiddenForElapsed } from "./state.ts";
import { levelValues } from "./levels.ts";
import { sweetSamAdvantages, type SweetSamAdvantages } from "./advantages.ts";
import { ticketsFor } from "../arcade/wallet.ts";
import { flowerDrops, flowerPoints, flowerStayMax, flowerStayMin, flowerX, flowerY } from "./flower.ts";
import { flowerPopupTicks } from "./bonusEat.ts";
import { deathRoundDelayTicks } from "./update.ts";
import type { ItemSetup, LevelSetup } from "./level.ts";

let sounds: SoundEvent[] = [];
let unsubscribe = (): void => {};
beforeEach(() => {
  rng.seed(1);
  sounds = [];
  unsubscribe = addSoundListener((e) => {
    sounds.push(e);
  });
});
afterEach(() => {
  unsubscribe();
});

function step(s: SweetSamSoftware, n = 1, i: Input = NO_INPUT): void {
  for (let k = 0; k < n; k++) s.update(i);
}

/** A fresh game advanced past READY and one PLAY tick. */
function playing(): SweetSamSoftware {
  const s = new SweetSamSoftware(0);
  step(s, 122);
  expect(s.snapshot().state).toBe("PLAY");
  sounds = [];
  return s;
}

/** A game in PLAY from `setup`, before its first PLAY tick. */
function from(setup: LevelSetup, advantages?: Readonly<SweetSamAdvantages>): SweetSamSoftware {
  const s = new SweetSamSoftware(0, advantages, setup);
  expect(s.snapshot().state).toBe("PLAY");
  sounds = [];
  return s;
}

function enemy(s: SweetSamSoftware, i: number): SweetSamEnemySnapshot {
  const e = s.snapshot().enemies[i];
  if (e === undefined) throw new Error(`no enemy ${i}`);
  return e;
}

/** Where the bear stands in a fresh round. */
const start = { x: 112, y: 212 };
/** Where the bear is after its first PLAY tick. */
const aheadOfBear = { x: start.x - 1, y: start.y };

/** Items for a setup: `eaten` honey drops gone after the first PLAY tick, the last one eaten on it at `at`. */
function eating(
  eaten: number,
  at: Readonly<{ x: number; y: number }> = aheadOfBear,
): (it: ItemSetup, idx: number) => ItemSetup | null {
  return (it, idx) => (idx === 0 ? { ...it, ...at } : idx < eaten ? null : it);
}

/** The first honey pot moved to `at`. */
function potAt(at: { x: number; y: number }): (it: ItemSetup) => ItemSetup {
  let moved = false;
  return (it) => {
    if (!it.power || moved) return it;
    moved = true;
    return { ...it, ...at };
  };
}

/** Red one tile left of the bear, heading for it: it catches the bear on the second PLAY tick. */
const redApproaching = { x: start.x - 7.5, y: start.y, home: false, dir: "RIGHT" } as const;

/**
 * The bear three steps right of the flower's spot, heading left, the
 * `eaten`th honey drop just ahead of it: it eats the drop on the first tick
 * and reaches the flower on the fourth.
 */
function nearFlower(eaten: number): LevelSetup {
  return { player: { x: flowerX + 3, y: flowerY }, items: eating(eaten, { x: flowerX + 2, y: flowerY }) };
}

/** Steps until the bear eats the flower; the score it added. */
function eatFlower(s: SweetSamSoftware): number {
  const before = s.score();
  for (let t = 0; t < 10 && s.snapshot().flowerPopup === null; t++) step(s);
  expect(s.snapshot().flowerPopup).not.toBeNull();
  return s.score() - before;
}

/** A game on `level` whose last honey drop the bear has just eaten. */
function clearedLevel(level: number): SweetSamSoftware {
  const s = from({ level, score: 1234, items: () => null });
  step(s);
  return s;
}

/** A game on level 1 whose last honey drop the bear has just eaten. */
function cleared(): SweetSamSoftware {
  return clearedLevel(1);
}

describe("respawnBlinkHiddenForElapsed", () => {
  test("hidden for 15 frames, visible for 15, repeating", () => {
    expect(respawnBlinkHiddenForElapsed(0)).toBe(true);
    expect(respawnBlinkHiddenForElapsed(14)).toBe(true);
    expect(respawnBlinkHiddenForElapsed(15)).toBe(false);
    expect(respawnBlinkHiddenForElapsed(29)).toBe(false);
    expect(respawnBlinkHiddenForElapsed(30)).toBe(true);
  });
});

describe("construction", () => {
  test("enters START with the start sound, 3 lives and a full maze", () => {
    const s = new SweetSamSoftware(1230);
    expect(sounds).toEqual(["rewind:sweetStart", "play:sweetStart"]);
    const snap = s.snapshot();
    expect([snap.state, snap.lives, snap.items, snap.score, snap.highScore]).toEqual(["START", 3, 244, 0, 1230]);
    expect([snap.startTicks, snap.respawnBlinkRemaining, snap.player.hidden, snap.player.dir]).toEqual([
      120,
      120,
      true,
      "DOWN",
    ]);
    expect(snap.dials.slice(6).map((d) => d[0])).toEqual([0, 0, 1, 2, 3, 0]);
    expect(s.gameOver()).toBe(false);
    expect(s.fixedViewportSize()).toEqual([240, 304]);
    expect(s.name).toBe("sweetSam");
  });

  test("construction draws no random numbers", () => {
    rng.seed(77);
    const s = new SweetSamSoftware(0);
    expect(rng.state()).toBe(77);
    expect(s.snapshot().state).toBe("START");
  });

  test("the high score boots clamped to 0..999999", () => {
    expect(
      new SweetSamSoftware(5_000_000)
        .snapshot()
        .dials.slice(6)
        .map((d) => d[0]),
    ).toEqual([9, 9, 9, 9, 9, 9]);
    expect(
      new SweetSamSoftware(-4)
        .snapshot()
        .dials.slice(6)
        .map((d) => d[0]),
    ).toEqual([0, 0, 0, 0, 0, 0]);
  });
});

describe("START", () => {
  test("blinks the player for 120 ticks, then PLAY facing left", () => {
    const s = new SweetSamSoftware(0);
    const hidden: boolean[] = [];
    for (let t = 1; t <= 120; t++) {
      step(s);
      hidden.push(s.snapshot().player.hidden);
      expect(s.snapshot().state).toBe("START");
    }
    expect(hidden.slice(0, 15).every(Boolean)).toBe(true);
    expect(hidden.slice(15, 30).every((h) => !h)).toBe(true);
    expect([s.snapshot().startTicks, s.snapshot().respawnBlinkRemaining]).toEqual([0, 0]);
    step(s);
    const snap = s.snapshot();
    expect([snap.state, snap.player.dir, snap.player.hidden, snap.modeIndex]).toEqual(["PLAY", "LEFT", false, 0]);
  });
});

describe("PLAY modes", () => {
  test("the first PLAY tick starts scatter (420 ticks) and flags every maze bee to reverse", () => {
    const s = new SweetSamSoftware(0);
    step(s, 122);
    const snap = s.snapshot();
    expect([snap.modeIndex, snap.mode, snap.modeTicks]).toEqual([1, 0, 419]);
    expect(snap.enemies.map((e) => e.reverse)).toEqual([true, false, false, false]);
  });

  test("the first scatter flags only the red bee; home bees still leave LEFT (#226)", () => {
    const s = playing();
    expect(s.snapshot().enemies.map((e) => [e.reverse, e.leaveRight])).toEqual([
      [true, false],
      [false, false],
      [false, false],
      [false, false],
    ]);
  });

  test("a mode change sends home bees out RIGHT instead of reversing them (#226)", () => {
    const s = from({ mode: { index: 1, ticks: 0 } });
    step(s);
    const [red, teal] = [enemy(s, 0), enemy(s, 2)];
    expect([red.reverse, red.leaveRight]).toEqual([true, false]);
    expect([teal.home, teal.reverse, teal.leaveRight]).toEqual([true, false, true]);
    for (let t = 0; t < 200 && enemy(s, 1).home; t++) step(s);
    const pink = enemy(s, 1);
    expect([pink.home, pink.dir, pink.leaveRight, pink.reverse]).toEqual([false, "RIGHT", false, false]);
    step(s, 6);
    expect([enemy(s, 1).dir, enemy(s, 1).reverse]).toEqual(["RIGHT", false]);
  });

  test("bees leave the home on the same ticks as before the bob (#226)", () => {
    rng.seed(1);
    const s = new SweetSamSoftware(0);
    const out: Record<string, number> = {};
    for (let t = 1; t < 3000 && Object.keys(out).length < 3; t++) {
      step(s, 1, { ...NO_INPUT, down: true });
      for (const e of s.snapshot().enemies) if (e.kind !== "red" && !e.home && !(e.kind in out)) out[e.kind] = t;
    }
    expect(out).toEqual({ pink: 170, teal: 500, orange: 740 });
  });

  test("the scatter/chase timer holds while any bee is sleepy", () => {
    const before = 419;
    const s = from({ mode: { index: 1, ticks: before }, bees: [undefined, undefined, undefined, { blueFrames: 60 }] });
    step(s, 50);
    expect(enemy(s, 3).blue).toBeGreaterThan(0);
    expect([s.snapshot().modeTicks, s.snapshot().modeIndex]).toEqual([before, 1]);

    // Not vacuous: with no sleepy bee the same 50 ticks run the timer down.
    const awake = playing();
    expect(awake.snapshot().modeTicks).toBe(before);
    step(awake, 50);
    expect(awake.snapshot().modeTicks).toBe(before - 50);
  });

  test("after sleepy time the timer resumes from where it held and the sequence continues", () => {
    const sleepy = { blueFrames: 20 };
    const s = from({ mode: { index: 1, ticks: 5 }, bees: [sleepy, sleepy, sleepy, sleepy] });
    step(s, 20);
    let snap = s.snapshot();
    expect(snap.enemies.every((e) => e.blue === 0)).toBe(true);
    expect([snap.modeTicks, snap.modeIndex, snap.mode]).toEqual([5, 1, levelValues(1).modeSequence[0]?.mode ?? -1]);
    step(s, 2);
    expect(s.snapshot().modeTicks).toBe(3);
    step(s, 4);
    snap = s.snapshot();
    expect([snap.modeIndex, snap.mode]).toEqual([2, levelValues(1).modeSequence[1]?.mode ?? -1]);
  });
});

describe("velocities", () => {
  test("normal 1.0 / 0.9375, power 1.125 / 0.625, tunnel 0.5 for bees only", () => {
    // tunnel: row 140, x < 36
    const inTunnel = { x: 20, y: 140, home: false };
    let s = from({ bees: [inTunnel] });
    step(s);
    expect([s.snapshot().player.velocity, enemy(s, 0).velocity, enemy(s, 1).velocity]).toEqual([1.0, 0.5, 0.9375]);

    s = from({ bees: [inTunnel, { blueFrames: 300 }] });
    step(s);
    expect([s.snapshot().player.velocity, enemy(s, 1).velocity]).toEqual([1.125, 0.625]);

    // the player gets no tunnel slowdown
    s = from({ bees: [inTunnel, { blueFrames: 300 }], player: { x: 20, y: 140 } });
    step(s);
    expect(s.snapshot().player.velocity).toBe(1.125);
  });
});

describe("eating", () => {
  test("at most one item per tick; pellets 10 with an alternating chomp, power 50 with a puff, shake and scared bees", () => {
    // The player moves 1px left on the first tick, to (x-1, 212): all three are in its tile.
    const x = start.x - 1;
    const pot = potAt({ x: x - 1, y: 212 });
    const s = from({ items: (it, idx) => (idx < 2 ? { ...it, x, y: 212 } : pot(it)) });
    step(s);
    expect([s.snapshot().items, s.score(), s.level.items()[0], s.level.items()[1] !== null]).toEqual([
      243,
      10,
      null,
      true,
    ]);
    step(s);
    expect([s.snapshot().items, s.score()]).toEqual([242, 20]);

    step(s);
    const snap = s.snapshot();
    expect(snap.score).toBe(70);
    expect(sounds).toEqual([
      "rewind:sweetChompHigh",
      "play:sweetChompHigh",
      "rewind:sweetChompLow",
      "play:sweetChompLow",
      "rewind:sweetSmoke",
      "play:sweetSmoke",
    ]);
    expect([snap.shake[2], snap.shake[3]]).toEqual([6, 4]);
    expect(enemy(s, 0).blue).toBe(600);
    expect(enemy(s, 0).reverse).toBe(true);
    expect([enemy(s, 1).home, enemy(s, 1).blue]).toEqual([true, 600]); // still home: sleepy too
    expect(snap.enemies.every((e) => e.blue === 600)).toBe(true);
  });

  test("a bee that leaves the home still sleepy can be eaten for points", () => {
    const eyes = { home: false, eyes: true, x: 8 * 2, y: 8 * 4 + 4 };
    const s = from({ bees: [eyes, undefined, eyes, eyes], items: potAt({ x: start.x - 1, y: start.y }) });
    step(s);
    expect([enemy(s, 1).home, enemy(s, 1).blue]).toEqual([true, 600]);
    let n = 0;
    while (enemy(s, 1).home && n++ < 300) step(s);
    expect([enemy(s, 1).home, enemy(s, 1).blue > 0]).toEqual([false, true]);
    // Steer the bear onto the bee through step(); the others are eyes, which pay nothing.
    let before = s.score();
    for (let t = 0; t < 2000 && s.snapshot().state === "PLAY"; t++) {
      before = s.score();
      const bee = enemy(s, 1);
      const p = s.snapshot().player;
      step(s, 1, { ...NO_INPUT, left: bee.x < p.x, right: bee.x > p.x, up: bee.y < p.y, down: bee.y > p.y });
    }
    expect([s.snapshot().state, s.score() - before]).toEqual(["PAUSE", 200]);
  });

  test("scared bee eaten: 200, popup, shake, particles, power sound, PAUSE", () => {
    const s = from({ bees: [{ onPlayer: true, blueFrames: 300 }] });
    step(s);
    const snap = s.snapshot();
    expect(snap.state).toBe("PAUSE");
    expect([snap.score, snap.scaredEatAwardNext, snap.pauseTicks]).toEqual([200, 1, 60]);
    expect(sounds).toEqual(["rewind:sweetBee", "play:sweetBee"]);
    // The popup ticks once on its spawn tick; the shake starts consuming rand next tick.
    expect(snap.popups).toEqual([{ x: snap.player.x, y: snap.player.y, frameIdx: 0, ticks: 44 }]);
    expect(snap.shake).toEqual([0, 0, 9, 8]);
    expect(snap.particlesActive).toBe(25);
    expect([enemy(s, 0).eyes, enemy(s, 0).blue]).toEqual([true, 0]);
  });

  test("award ladder 200 → 400 → 800 → 1600 → 1600 while some bee stays scared", () => {
    const sleepy = { onPlayer: true, blueFrames: 10_000 };
    const s = from({ bees: [sleepy, sleepy, sleepy, sleepy] });
    const awards: number[] = [];
    // Every bee is on the bear and only a honey pot re-scares one, so the fifth eat comes from a fresh game
    // whose ladder starts at the top rung, eaten through the same step().
    const eatAll = (g: SweetSamSoftware, n: number): void => {
      for (let k = 0; k < n; k++) {
        const before = g.score();
        step(g);
        expect(g.snapshot().state).toBe("PAUSE");
        awards.push(g.score() - before);
        step(g, 61); // PAUSE: 60 countdown ticks, then back to PLAY
        expect(g.snapshot().state).toBe("PLAY");
      }
    };
    eatAll(s, 4);
    expect(s.snapshot().scaredEatAwardNext).toBe(3);
    // The ladder's state after four eats, carried into a second game with a scared bee left on the bear.
    eatAll(from({ scaredEatAwardNext: 3, bees: [sleepy, { blueFrames: 10_000 }] }), 1);
    expect(awards).toEqual([200, 400, 800, 1600, 1600]);
  });

  test("a honey pot eaten while bees are sleepy restarts the award at 200", () => {
    const sleepy = { onPlayer: true, blueFrames: 10_000 };
    const s = from({
      // Red and pink on the bear; teal a tile to its left, meeting it after the pot; orange keeps the ladder alive.
      bees: [sleepy, sleepy, { ...redApproaching, x: start.x - 7.5, blueFrames: 10_000 }, { blueFrames: 10_000 }],
      items: potAt({ x: start.x - 1, y: start.y }),
    });
    const eat = (): number => {
      const before = s.score();
      step(s);
      expect(s.snapshot().state).toBe("PAUSE");
      const award = s.score() - before;
      step(s, 61);
      return award;
    };
    const awards = [eat(), eat()];
    step(s); // the pot
    expect(s.snapshot().items).toBe(243);
    awards.push(eat());
    expect(awards).toEqual([200, 400, 200]);
  });

  test("the award resets at the end of a PLAY tick when no bee is scared", () => {
    const s = from({ scaredEatAwardNext: 2, bees: [undefined, { blueFrames: 5 }] });
    step(s);
    expect(s.snapshot().scaredEatAwardNext).toBe(2);
    step(s, 3);
    expect(s.snapshot().scaredEatAwardNext).toBe(2);
    step(s); // pink wakes
    expect(s.snapshot().scaredEatAwardNext).toBe(0);
  });
});

describe("collisions and death", () => {
  test("a bee anywhere in the bear's tile catches it", () => {
    // tile 14 spans x 112..119; the bear is at 112
    const s = from({ player: { x: 112 }, bees: [{ onPlayer: true, x: 112 + 3 }] });
    step(s);
    expect([s.snapshot().state, s.snapshot().lives]).toEqual(["DEATHWAIT", 2]);
  });

  test("a sleepy bee anywhere in the bear's tile is eaten", () => {
    const s = from({ player: { x: 112 }, bees: [{ onPlayer: true, x: 112 + 7, blueFrames: 50 }] });
    step(s);
    expect([s.snapshot().state, enemy(s, 0).eyes, s.snapshot().lives]).toEqual(["PAUSE", true, 3]);
  });

  test("a bee in the neighbouring tile does not catch the bear, however close", () => {
    // tile 13, 1 px from the bear in tile 14
    const s = from({ player: { x: 112, dir: "RIGHT" }, bees: [{ onPlayer: true, x: 112 - 1, dir: "LEFT" }] });
    step(s);
    expect([s.snapshot().state, s.snapshot().lives]).toEqual(["PLAY", 3]);
  });

  test("bear and bee swapping tiles in one tick pass through each other", () => {
    // a bee moves under 1 px a tick
    const s = from({ player: { x: 112 }, bees: [{ onPlayer: true, x: 112 - 0.5, dir: "RIGHT" }] });
    step(s, 1, { ...NO_INPUT, left: true });
    expect([Math.trunc(s.snapshot().player.x / 8), Math.trunc(enemy(s, 0).x / 8)]).toEqual([13, 14]);
    expect([s.snapshot().state, s.snapshot().lives]).toEqual(["PLAY", 3]);
  });

  test("a collision returns immediately: later bees skip updateBlue, nothing moves or is eaten", () => {
    const s = from({
      bees: [{ onPlayer: true }, { blueFrames: 50 }],
      items: (it, idx) => (idx === 0 ? { ...it, ...start } : it),
      scaredEatAwardNext: 2,
    });
    const pinkX = enemy(s, 1).x;
    step(s);
    const snap = s.snapshot();
    expect([snap.state, snap.lives]).toEqual(["DEATHWAIT", 2]);
    expect(sounds).toEqual(["rewind:sweetDeath", "play:sweetDeath"]);
    expect([enemy(s, 1).blue, enemy(s, 1).x]).toEqual([50, pinkX]);
    expect([snap.player.x, snap.player.y, snap.player.hidden]).toEqual([start.x, start.y, true]);
    expect(snap.items).toBe(244);
    expect(snap.scaredEatAwardNext).toBe(2);
    expect(snap.particlesActive).toBe(25);
  });

  test("DEATHWAIT holds 120 ticks, then restartRound and START", () => {
    const s = from({ bees: [{ onPlayer: true }], items: (it, idx) => (idx === 5 ? null : it), scaredEatAwardNext: 3 });
    step(s);
    s.camera.requestScreenShake(500, 1);
    const modeCurrent = s.snapshot().mode;
    step(s, 120);
    expect([s.snapshot().state, s.snapshot().pauseTicks]).toEqual(["DEATHWAIT", 0]);
    sounds = [];
    step(s);
    const snap = s.snapshot();
    expect(snap.state).toBe("START");
    expect(sounds).toEqual(["rewind:sweetStart", "play:sweetStart"]);
    expect([snap.player.x, snap.player.y, snap.player.dir, snap.modeIndex, snap.modeTicks]).toEqual([
      112,
      212,
      "DOWN",
      0,
      0,
    ]);
    expect([snap.scaredEatAwardNext, snap.popups, snap.lives, snap.items]).toEqual([0, [], 2, 243]);
    expect(snap.enemies.map((e) => [e.kind, e.x, e.y])).toEqual([
      ["red", 112, 116],
      ["pink", 112, 140],
      ["teal", 96, 140],
      ["orange", 128, 140],
    ]);
    // restartRound leaves the camera, particles and modeCurrent alone.
    expect(snap.shake[2]).toBeGreaterThan(0);
    expect(snap.mode).toBe(modeCurrent);
  });

  test("the bear's death animation plays inside the 2 s death wait, without changing it", () => {
    expect(playing().snapshot().deathFrame).toBeNull();
    const s = from({ bees: [{ onPlayer: true }] });
    const frames: (number | null)[] = [];
    let ticks = 0;
    do {
      step(s);
      frames.push(s.snapshot().deathFrame);
      ticks++;
    } while (s.snapshot().state === "DEATHWAIT");
    expect(ticks).toBe(1 + deathRoundDelayTicks + 1);
    expect(frames.at(-1)).toBeNull(); // back in START
    const shown = frames.slice(0, -1);
    expect(shown[0]).toBe(0); // dazed the tick the bee catches the bear
    expect([...new Set(shown)]).toEqual([0, 1, 2, 3]); // dazed, sinking, flat, puddle, in order
    expect(shown.lastIndexOf(3) - shown.indexOf(3)).toBeGreaterThan(20); // the puddle holds before the restart
  });

  test("the last life plays the death animation too", () => {
    const s = from({ lives: 1, bees: [{ onPlayer: true }] });
    step(s);
    expect(s.snapshot().deathFrame).toBe(0);
    step(s, deathRoundDelayTicks);
    expect([s.snapshot().state, s.snapshot().deathFrame]).toEqual(["FINALDEATHWAIT", 3]);
  });

  test("the last life: FINALDEATHWAIT for 120 ticks, then GAMEOVER for good", () => {
    const s = from({ lives: 1, bees: [{ onPlayer: true }] });
    step(s);
    const snap = s.snapshot();
    expect([snap.state, snap.lives, snap.player.hidden, snap.pauseTicks]).toEqual(["FINALDEATHWAIT", 0, true, 120]);
    expect(s.gameOver()).toBe(false);
    step(s, 120);
    expect(s.snapshot().state).toBe("FINALDEATHWAIT");
    step(s);
    expect(s.snapshot().state).toBe("GAMEOVER");
    expect(s.gameOver()).toBe(true);
    step(s, 10, { ...NO_INPUT, left: true });
    expect(s.snapshot().state).toBe("GAMEOVER");
  });
});

describe("bonus flower", () => {
  test("appears below the bee home after the set number of honey drops, twice per level", () => {
    expect(flowerDrops).toEqual([70, 170]);
    let s = from({ items: eating(flowerDrops[0] - 1) });
    step(s);
    expect(s.snapshot().flower).toEqual({ ticks: 0, shown: 0 });
    s = from({ items: eating(flowerDrops[0]) });
    step(s);
    const first = s.snapshot().flower;
    expect(first.shown).toBe(1);
    expect(first.ticks).toBeGreaterThanOrEqual(flowerStayMin);
    expect(first.ticks).toBeLessThanOrEqual(flowerStayMax);
    expect([flowerStayMin, flowerStayMax]).toEqual([540, 600]);
    expect([flowerX, flowerY]).toEqual([112, 164]);
    s = from({ items: eating(flowerDrops[1]) });
    step(s, 2);
    expect(s.snapshot().flower.shown).toBe(2);
    expect(s.snapshot().flower.ticks).toBeGreaterThanOrEqual(flowerStayMin);
  });

  test("leaves after its time when the bear doesn't eat it", () => {
    const held = { dotMinimum: 1_000 }; // keep the bees home
    const s = from({ items: eating(flowerDrops[0]), bees: [undefined, held, held, held] });
    step(s);
    step(s, s.snapshot().flower.ticks - 1);
    expect(s.snapshot().flower.ticks).toBe(1);
    step(s);
    expect(s.snapshot().flower).toEqual({ ticks: 0, shown: 1 });
  });

  test("eaten, it scores its level's points with a popup and a sound", () => {
    const s = from(nearFlower(flowerDrops[0]));
    step(s);
    expect(s.snapshot().flower.shown).toBe(1);
    sounds = [];
    expect(eatFlower(s)).toBe(flowerPoints(1));
    const snap = s.snapshot();
    expect(snap.flower).toEqual({ ticks: 0, shown: 1 });
    expect(snap.flowerPopup).toEqual({ points: flowerPoints(1), ticks: flowerPopupTicks - 1 });
    expect(sounds).toEqual(["rewind:sweetFlower", "play:sweetFlower"]);
  });

  test("on a later level it is worth that level's points", () => {
    const s = from({ ...nearFlower(flowerDrops[0]), level: 3 });
    step(s);
    expect(eatFlower(s)).toBe(flowerPoints(3));
    expect(flowerPoints(3)).toBeGreaterThan(flowerPoints(1));
  });

  test("a level cleared after a death resets to personal counters with the new level's limits (#155)", () => {
    // The last honey drop waits where the bear starts the next round.
    const s = from({ bees: [{ onPlayer: true }], items: (it, idx) => (idx === 0 ? { ...it, x: 111, y: 212 } : null) });
    step(s, 1 + deathRoundDelayTicks + 1);
    expect(s.snapshot().release.globalDots).toBe(0);
    for (let t = 0; t < 1000 && s.snapshot().level === 1; t++) step(s);
    const snap = s.snapshot();
    expect(snap.level).toBe(2);
    expect(snap.release.globalDots).toBeNull();
    expect(snap.enemies.map((e) => e.held)).toEqual([false, false, false, false]);
    expect(snap.enemies.map((e) => e.dotMin)).toEqual([
      0,
      levelValues(2).dotMinimums.pink,
      levelValues(2).dotMinimums.teal,
      levelValues(2).dotMinimums.orange,
    ]);
  });

  test("after a lost life the bees wait on the global drop counter, keeping their personal ones (#155)", () => {
    const s = from({ items: eating(10), bees: [redApproaching] });
    step(s);
    expect(s.snapshot().items).toBe(234);
    step(s, 1 + deathRoundDelayTicks + 1);
    expect(s.snapshot().release.globalDots).toBe(0);
    expect(s.snapshot().enemies.map((e) => [e.kind, e.held, e.dotMin])).toEqual([
      ["red", false, 0],
      ["pink", true, 0],
      ["teal", true, 29],
      ["orange", true, 60],
    ]);
  });

  test("a lost life takes the flower away", () => {
    const s = from({ items: eating(flowerDrops[0]), bees: [redApproaching] });
    step(s);
    expect(s.snapshot().flower.shown).toBe(1);
    step(s, 1 + deathRoundDelayTicks + 1);
    expect(s.snapshot().state).toBe("START");
    expect(s.snapshot().flower).toEqual({ ticks: 0, shown: 1 });
  });
});

describe("clearing a level", () => {
  test("the next PLAY tick stops everything and flashes the maze for 2 s", () => {
    const s = cleared();
    const snap = s.snapshot();
    expect([snap.state, snap.level, snap.items, snap.score, snap.lives]).toEqual(["LEVELCLEAR", 1, 0, 1234, 3]);
    expect(snap.pauseTicks).toBe(levelClearTicks);
    expect(levelClearTicks).toBe(120);
    const [px, py] = [snap.player.x, snap.player.y];
    const bees = snap.enemies.map((e) => [e.x, e.y]);
    const flashes: boolean[] = [];
    for (let t = 0; t < levelClearTicks; t++) {
      step(s, 1, { ...NO_INPUT, up: true });
      flashes.push(s.snapshot().mazeFlash);
      expect(s.snapshot().state).toBe("LEVELCLEAR");
    }
    expect([s.snapshot().player.x, s.snapshot().player.y]).toEqual([px, py]);
    expect(s.snapshot().enemies.map((e) => [e.x, e.y])).toEqual(bees);
    expect(flashes).toContain(true);
    expect(flashes).toContain(false);
  });

  test("then the next level: maze refilled, bear and bees home, LEVEL 2 before READY", () => {
    const s = cleared();
    step(s, levelClearTicks + 1);
    let snap = s.snapshot();
    expect([snap.state, snap.level, snap.items, snap.score, snap.lives]).toEqual(["START", 2, 244, 1234, 3]);
    expect([snap.player.x, snap.player.y, snap.modeIndex, snap.modeTicks]).toEqual([112, 212, 0, 0]);
    expect(snap.enemies.map((e) => [e.kind, e.x, e.y, e.dotMin])).toEqual([
      ["red", 112, 116, 0],
      ["pink", 112, 140, 0],
      ["teal", 96, 140, levelValues(2).dotMinimums.teal],
      ["orange", 128, 140, levelValues(2).dotMinimums.orange],
    ]);
    expect(snap.levelBannerTicks).toBe(levelBannerTicks);
    step(s, levelBannerTicks);
    snap = s.snapshot();
    expect([snap.state, snap.levelBannerTicks, snap.startTicks]).toEqual(["START", 0, 120]);
    step(s, 122);
    expect(s.snapshot().state).toBe("PLAY");
  });

  test("level 2's bees fly faster and its modes are level 2's", () => {
    const s = cleared();
    step(s, levelClearTicks + 1 + levelBannerTicks + 122);
    const snap = s.snapshot();
    expect(snap.state).toBe("PLAY");
    expect(snap.enemies[1]?.velocity).toBe(levelValues(2).beeVelocity);
    expect(snap.modeTicks).toBe((levelValues(2).modeSequence[0]?.ticks ?? 0) - 1);
  });

  test("each clear raises the level by 1", () => {
    const s = from({ level: 2, items: () => null });
    step(s, 2 + levelClearTicks);
    expect([s.snapshot().state, s.snapshot().level]).toEqual(["INTERMISSION", 3]);
  });
});

/** The states a cleared level passes through on its way to the next START. */
function statesAfterClear(s: SweetSamSoftware, i: Input = NO_INPUT): string[] {
  const seen: string[] = [];
  for (let t = 0; t < 5000 && s.snapshot().state !== "START"; t++) {
    step(s, 1, i);
    const state = s.snapshot().state;
    if (seen.at(-1) !== state) seen.push(state);
  }
  return seen;
}

describe("intermissions (#160)", () => {
  test.each([2, 5, 9])("clearing level %i plays an intermission before the next level", (level) => {
    const s = clearedLevel(level);
    expect(statesAfterClear(s)).toEqual(["LEVELCLEAR", "INTERMISSION", "START"]);
    expect(s.snapshot().level).toBe(level + 1);
  });

  test.each([1, 3, 4, 6, 7, 8, 10, 13])("clearing level %i goes straight to the next level", (level) => {
    expect(statesAfterClear(clearedLevel(level))).toEqual(["LEVELCLEAR", "START"]);
  });

  test("the action key skips the scene straight to the next level's START", () => {
    const s = clearedLevel(2);
    step(s, levelClearTicks + 1);
    expect(s.snapshot().state).toBe("INTERMISSION");
    step(s, 30);
    step(s, 1, { ...NO_INPUT, space: true });
    const snap = s.snapshot();
    expect([snap.state, snap.level, snap.items, snap.levelBannerTicks]).toEqual(["START", 3, 244, levelBannerTicks]);
  });

  test("the scene plays the intermission music", () => {
    const s = clearedLevel(5);
    step(s, levelClearTicks);
    sounds = [];
    step(s);
    expect(s.snapshot().state).toBe("INTERMISSION");
    expect(sounds).toEqual(["rewind:sweetStart", "play:sweetStart"]);
  });
});

describe("game over pays out", () => {
  test("a run that clears level 1 and loses every life on level 2 ends with gameOver() and its score in tickets", () => {
    // One honey drop left, ahead of the bear: eating it clears level 1.
    const s = from({ score: 1234, items: eating(244) });
    expect(s.snapshot().items).toBe(1);
    step(s, 2);
    expect(s.snapshot().items).toBe(0);
    expect(s.snapshot().state).toBe("LEVELCLEAR");
    step(s, levelClearTicks + 1 + levelBannerTicks + 122);
    expect([s.snapshot().state, s.snapshot().level]).toEqual(["PLAY", 2]);
    for (let t = 0; t < 20_000 && !s.gameOver(); t++) step(s);
    expect([s.snapshot().lives, s.score(), s.snapshot().state, s.snapshot().level]).toEqual([0, 1314, "GAMEOVER", 2]); // 1234 + the last drop + drops eaten on level 2
    expect(ticketsFor(s.score())).toBe(12);
  });
});

describe("input", () => {
  test("off a corner the player may only reverse along its axis", () => {
    const s = playing(); // facing LEFT between corners
    step(s, 1, { ...NO_INPUT, up: true });
    expect(s.snapshot().player.dir).toBe("LEFT");
    step(s, 1, { ...NO_INPUT, right: true });
    expect(s.snapshot().player.dir).toBe("RIGHT");
  });

  test("at a corner a perpendicular turn snaps the player onto it", () => {
    const s = from({ player: { x: 124.4 } }); // corner (15, 23) at (124, 212) allows UP, LEFT, RIGHT
    step(s, 1, { ...NO_INPUT, up: true });
    const p = s.snapshot().player;
    expect([p.dir, p.x, p.y]).toEqual(["UP", 124, 211]);
  });
});

describe("rolling dials", () => {
  test("score digits spin for 18 ticks, high score dials follow max(score, highScore)", () => {
    const s = from({ score: 10 });
    step(s);
    let snap = s.snapshot();
    expect(snap.dials[4]).toEqual([0, true, 0, 1, 1 / 18]);
    expect(snap.dials[10]).toEqual([0, true, 0, 1, 1 / 18]);
    step(s, 17);
    snap = s.snapshot();
    expect(snap.dials[4]).toEqual([1, false, 0, 1, 1]);
  });
});

describe("the extra life at 10,000 points (#154)", () => {
  test("a honey drop that takes the score from 9,990 to 10,000 adds one life and its sound", () => {
    const s = from({ score: 9_990, items: eating(1) });
    step(s);
    expect([s.score(), s.snapshot().lives]).toEqual([10_000, 4]);
    expect(sounds).toContain("play:ticket");
  });

  test("passing 20,000 adds no second life", () => {
    // A run past 10,000 has had its extra life: 3 + 1.
    const s = from({ score: 19_990, lives: 4, items: eating(1) });
    step(s);
    expect([s.score(), s.snapshot().lives]).toEqual([20_000, 4]);
  });

  test("a run started with the honey jar still gets the extra life", () => {
    const jar = sweetSamAdvantages(["honeyJar"]);
    const fresh = new SweetSamSoftware(0, jar);
    step(fresh, 122);
    expect(fresh.snapshot().lives).toBe(4);
    const s = from({ score: 9_990, items: eating(1) }, jar);
    step(s);
    expect(s.snapshot().lives).toBe(5);
  });

  test("a sleepy bee award that crosses 10,000 also grants the life", () => {
    const s = from({ score: 9_900, bees: [{ onPlayer: true, blueFrames: 300 }] });
    step(s);
    expect([s.score(), s.snapshot().lives]).toEqual([10_100, 4]);
    expect(sounds).toContain("play:ticket");
  });

  test("a flower that crosses 10,000 also grants the life", () => {
    const s = from({ score: 9_950, flowerTicks: 100, player: { x: flowerX + 1, y: flowerY } });
    step(s);
    expect([s.score(), s.snapshot().lives]).toEqual([10_000 + flowerPoints(1) - 50, 4]);
  });
});

/** Leaves `left` honey drops in the maze, none of them near the bear, and `also` those it keeps besides. */
function dropsLeft(left: number, also: (it: ItemSetup) => boolean = () => false): (it: ItemSetup) => ItemSetup | null {
  let kept = 0;
  return (it) => (also(it) || (Math.abs(it.y - start.y) > 16 && kept++ < left) ? it : null);
}

/** Red's and pink's speeds on the first tick with `left` honey drops left. */
function speeds(left: number): number[] {
  const s = from({ items: dropsLeft(left) });
  expect(s.snapshot().items).toBe(left);
  step(s);
  return [enemy(s, 0).velocity, enemy(s, 1).velocity];
}

describe("Cruise Elroy (#156)", () => {
  test("on level 1 red speeds up at 20 drops left, then again at 10; the others don't", () => {
    expect(speeds(21)).toEqual([0.9375, 0.9375]);
    expect(speeds(20)).toEqual([0.96875, 0.9375]);
    expect(speeds(10)).toEqual([1, 0.9375]);
  });

  test("a sleepy red bee flies at the sleepy speed, not Elroy's", () => {
    const s = from({ items: dropsLeft(10), bees: [{ blueFrames: 300 }] });
    step(s);
    expect(enemy(s, 0).velocity).toBe(0.625);
  });

  test("after a lost life Elroy stays off until orange has left the home", () => {
    // 31 drops on the global counter: the drop at (100, 212), ahead of the bear, frees orange.
    const s = from({ globalDots: 31, items: dropsLeft(9, (it) => it.x === 100 && it.y === start.y) });
    step(s);
    expect(enemy(s, 3).home).toBe(true);
    expect(s.snapshot().release.elroySuspended).toBe(true);
    expect(enemy(s, 0).velocity).toBe(0.9375);
    for (let t = 0; t < 20 && s.snapshot().items === 10; t++) step(s);
    expect(s.snapshot().release.elroySuspended).toBe(false);
    step(s);
    expect(enemy(s, 0).velocity).toBe(1);
  });

  test("a red bee in the home or flying home ignores Elroy's speed", () => {
    const s = from({ items: dropsLeft(10), bees: [{ home: true }] });
    step(s);
    expect(enemy(s, 0).velocity).toBe(levelValues(1).beeVelocity);
  });
});

/** A game whose red bee the bear has just eaten. */
function redEaten(): SweetSamSoftware {
  const s = from({ bees: [{ onPlayer: true, blueFrames: 300 }] });
  step(s);
  expect(s.snapshot().state).toBe("PAUSE");
  return s;
}

describe("an eaten bee becomes eyes (#153)", () => {
  test("the tick after, the bee is eyes where it was eaten", () => {
    const s = redEaten();
    const red = enemy(s, 0);
    const p = s.snapshot().player;
    expect([red.x, red.y, red.home]).toEqual([p.x, p.y, false]);
    expect(red.eyes).toBe(true);
    expect(red.blue).toBe(0);
  });

  test("touching the eyes neither kills the bear nor scores", () => {
    const s = from({ bees: [{ onPlayer: true, eyes: true }] });
    step(s);
    expect([s.snapshot().state, s.snapshot().lives, s.score()]).toEqual(["PLAY", 3, 0]);
  });

  test("from the far corner the eyes reach the home within 240 ticks, then the bee revives and leaves", () => {
    // The bottom-right corner, heading down into it.
    const s = from({ bees: [{ x: 8 * 26 + 4, y: 8 * (29 + 3) + 4 - 4, dir: "DOWN", home: false, eyes: true }] });
    let ticks = 0;
    while (enemy(s, 0).eyes && ticks < 240) {
      step(s);
      ticks++;
    }
    const red = enemy(s, 0);
    expect([red.eyes, red.home, red.x, red.y]).toEqual([false, true, 112, 140]);
    step(s, 60);
    expect(enemy(s, 0).home).toBe(false);
  });

  test("a second honey pot leaves the eyes awake", () => {
    const s = from({ bees: [{ home: false, eyes: true }], items: potAt({ x: start.x - 1, y: start.y }) });
    step(s);
    const red = enemy(s, 0);
    expect([red.eyes, red.blue, red.reverse]).toEqual([true, 0, false]);
    expect(enemy(s, 1).blue).toBeGreaterThan(0);
  });
});
