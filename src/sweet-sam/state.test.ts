import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as rng from "../engine/rng.ts";
import { NO_INPUT, type Input } from "../engine/input.ts";
import { addSoundListener, type SoundEvent } from "../engine/audio.ts";
import { SweetSamSoftware } from "./software.ts";
import { respawnBlinkHiddenForElapsed } from "./state.ts";
import type { Entity } from "./entity.ts";

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

function enemy(s: SweetSamSoftware, i: number): Entity {
  const e = s.enemies[i];
  if (e === undefined) throw new Error(`no enemy ${i}`);
  return e;
}

/** Put a bee on the player, away from corners, so it collides this tick. */
function onPlayer(s: SweetSamSoftware, e: Entity): void {
  e.x = s.player.x;
  e.y = s.player.y;
  e.home = false;
  e.dotMinimum = 0;
  e.reverseDirection = false;
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
    expect(sounds).toEqual(["rewind:start", "play:start"]);
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
    expect(s.fixedViewportSize()).toEqual([336, 428]);
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
      hidden.push(s.player.hidden);
      expect(s.snapshot().state).toBe("START");
    }
    expect(hidden.slice(0, 15).every(Boolean)).toBe(true);
    expect(hidden.slice(15, 30).every((h) => !h)).toBe(true);
    expect([s.startTicks, s.startState.respawnBlinkRemaining]).toEqual([0, 0]);
    step(s);
    const snap = s.snapshot();
    expect([snap.state, snap.player.dir, snap.player.hidden, snap.modeIndex]).toEqual(["PLAY", "LEFT", false, 0]);
  });
});

describe("PLAY modes", () => {
  test("the first PLAY tick starts scatter (420 ticks) and flags every bee to reverse", () => {
    const s = new SweetSamSoftware(0);
    step(s, 122);
    const snap = s.snapshot();
    expect([snap.modeIndex, snap.mode, snap.modeTicks]).toEqual([1, 0, 419]);
    expect(snap.enemies.every((e) => e.reverse)).toBe(true);
  });
});

describe("velocities", () => {
  test("normal 1.0 / 0.9375, power 1.125 / 0.625, tunnel 0.5 for bees only", () => {
    const s = playing();
    const red = enemy(s, 0);
    const pink = enemy(s, 1);
    red.x = 20; // tunnel: row 140, x < 36
    red.y = 140;
    red.home = false;
    step(s);
    expect([s.player.velocity, red.velocity, pink.velocity]).toEqual([1.0, 0.5, 0.9375]);

    pink.blueFrames = 300;
    step(s);
    expect([s.player.velocity, pink.velocity]).toEqual([1.125, 0.625]);

    s.player.y = 140; // the player gets no tunnel slowdown
    s.player.x = 20;
    step(s);
    expect(s.player.velocity).toBe(1.125);
  });
});

describe("eating", () => {
  test("at most one item per tick; pellets 10, power 50 with shake and scared bees", () => {
    const s = playing();
    // The player moves 1px left this tick, to (x-1, 212).
    const x = s.player.x - 1;
    const a = s.items[0];
    const b = s.items[1];
    if (!a || !b) throw new Error("items");
    a.x = x;
    a.y = 212;
    b.x = x;
    b.y = 212;
    step(s);
    expect([s.snapshot().items, s.scoreValue, s.items[0], s.items[1] === b]).toEqual([243, 10, null, true]);
    b.x = s.player.x - 1;
    step(s);
    expect([s.snapshot().items, s.scoreValue]).toEqual([242, 20]);

    const power = s.items.find((i) => i?.powerPellet === true);
    if (!power) throw new Error("power");
    power.x = s.player.x - 1;
    power.y = 212;
    const pink = enemy(s, 1); // still home: not scared
    step(s);
    expect(s.scoreValue).toBe(70);
    expect(sounds).toEqual([]); // a power pellet plays no sound
    expect([s.camera.shakeTicksRemaining, s.camera.shakeIntensity]).toEqual([6, 4]);
    expect(enemy(s, 0).blueFrames).toBe(600);
    expect(enemy(s, 0).reverseDirection).toBe(true);
    expect(pink.blueFrames).toBe(0);
  });

  test("scared bee eaten: 200, popup, shake, particles, power sound, PAUSE", () => {
    const s = playing();
    const red = enemy(s, 0);
    onPlayer(s, red);
    red.blueFrames = 300;
    step(s);
    const snap = s.snapshot();
    expect(snap.state).toBe("PAUSE");
    expect([snap.score, snap.scaredEatAwardNext, snap.pauseTicks]).toEqual([200, 1, 60]);
    expect(sounds).toEqual(["rewind:power", "play:power"]);
    // The popup ticks once on its spawn tick; the shake starts consuming rand next tick.
    expect(snap.popups).toEqual([{ x: s.player.x, y: s.player.y, frameIdx: 0, ticks: 44 }]);
    expect(snap.shake).toEqual([0, 0, 9, 8]);
    expect(snap.particlesActive).toBe(25);
    expect([red.x, red.y, red.home, red.blueFrames]).toEqual([112, 140, true, 0]);
  });

  test("award ladder 200 → 400 → 800 → 1600 → 1600 while some bee stays scared", () => {
    const s = playing();
    const pink = enemy(s, 1);
    pink.blueFrames = 10_000; // keeps the ladder alive (blue but home)
    const awards: number[] = [];
    for (let k = 0; k < 5; k++) {
      const red = enemy(s, 0);
      onPlayer(s, red);
      red.blueFrames = 300;
      const before = s.scoreValue;
      step(s);
      expect(s.snapshot().state).toBe("PAUSE");
      awards.push(s.scoreValue - before);
      step(s, 61); // PAUSE: 60 countdown ticks, then back to PLAY
      expect(s.snapshot().state).toBe("PLAY");
    }
    expect(awards).toEqual([200, 400, 800, 1600, 1600]);
    expect(s.scaredEatAwardNext).toBe(3);
  });

  test("the award resets at the end of a PLAY tick when no bee is scared", () => {
    const s = playing();
    s.scaredEatAwardNext = 2;
    enemy(s, 1).blueFrames = 5;
    step(s);
    expect(s.scaredEatAwardNext).toBe(2);
    for (const e of s.enemies) e.blueFrames = 0;
    step(s);
    expect(s.scaredEatAwardNext).toBe(0);
  });
});

describe("collisions and death", () => {
  test("a collision returns immediately: later bees skip updateBlue, nothing moves or is eaten", () => {
    const s = playing();
    const red = enemy(s, 0);
    onPlayer(s, red);
    const pink = enemy(s, 1);
    pink.blueFrames = 50;
    const [px, py, pinkX] = [s.player.x, s.player.y, pink.x];
    const item = s.items[0];
    if (!item) throw new Error("item");
    item.x = px;
    item.y = py;
    s.scaredEatAwardNext = 2;
    step(s);
    const snap = s.snapshot();
    expect([snap.state, snap.lives]).toEqual(["DEATHWAIT", 2]);
    expect(sounds).toEqual(["rewind:death", "play:death"]);
    expect([pink.blueFrames, pink.x]).toEqual([50, pinkX]);
    expect([s.player.x, s.player.y, s.player.hidden]).toEqual([px, py, true]);
    expect(snap.items).toBe(244);
    expect(snap.scaredEatAwardNext).toBe(2);
    expect(snap.particlesActive).toBe(25);
  });

  test("DEATHWAIT holds 120 ticks, then restartRound and START", () => {
    const s = playing();
    onPlayer(s, enemy(s, 0));
    step(s);
    s.items[5] = null;
    s.bonusEatPopups.push({ x: 1, y: 2, frameIdx: 0, ticksRemain: 999 });
    s.camera.requestScreenShake(500, 1);
    s.scaredEatAwardNext = 3;
    const modeCurrent = s.modeCurrent;
    step(s, 120);
    expect([s.snapshot().state, s.pauseTicks]).toEqual(["DEATHWAIT", 0]);
    sounds = [];
    step(s);
    const snap = s.snapshot();
    expect(snap.state).toBe("START");
    expect(sounds).toEqual(["rewind:start", "play:start"]);
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
    expect(s.camera.shakeTicksRemaining).toBeGreaterThan(0);
    expect(s.modeCurrent).toBe(modeCurrent);
  });

  test("the last life: FINALDEATHWAIT for 120 ticks, then GAMEOVER for good", () => {
    const s = playing();
    s.lives = 1;
    onPlayer(s, enemy(s, 0));
    step(s);
    expect([s.snapshot().state, s.lives, s.player.hidden, s.pauseTicks]).toEqual(["FINALDEATHWAIT", 0, true, 120]);
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

describe("winning", () => {
  test("when every item is gone the next PLAY tick refills the maze and restarts the round", () => {
    const s = playing();
    s.scoreValue = 1234;
    s.items = s.items.map(() => null);
    step(s);
    const snap = s.snapshot();
    expect([snap.state, snap.items, snap.score, snap.lives]).toEqual(["START", 244, 1234, 3]);
    expect(sounds).toEqual(["rewind:start", "play:start"]);
    // The mode bookkeeping ran before the win check, then restartRound zeroed it.
    expect([snap.modeIndex, snap.modeTicks]).toEqual([0, 0]);
  });
});

describe("input", () => {
  test("off a corner the player may only reverse along its axis", () => {
    const s = playing(); // facing LEFT between corners
    step(s, 1, { ...NO_INPUT, up: true });
    expect(s.player.direction).toBe("LEFT");
    step(s, 1, { ...NO_INPUT, right: true });
    expect(s.player.direction).toBe("RIGHT");
  });

  test("at a corner a perpendicular turn snaps the player onto it", () => {
    const s = playing();
    s.player.x = 124.4; // corner (15, 23) at (124, 212) allows UP, LEFT, RIGHT
    step(s, 1, { ...NO_INPUT, up: true });
    expect([s.player.direction, s.player.x, s.player.y]).toEqual(["UP", 124, 211]);
  });

  test("the joystick frame follows input priority every tick", () => {
    const s = new SweetSamSoftware(0);
    step(s, 1, { ...NO_INPUT, down: true, left: true });
    expect(s.snapshot().joystick).toBe(2);
  });
});

describe("rolling dials", () => {
  test("score digits spin for 18 ticks, high score dials follow max(score, highScore)", () => {
    const s = playing();
    s.scoreValue = 10;
    step(s);
    let snap = s.snapshot();
    expect(snap.dials[4]).toEqual([0, true, 0, 1, 1 / 18]);
    expect(snap.dials[10]).toEqual([0, true, 0, 1, 1 / 18]);
    step(s, 17);
    snap = s.snapshot();
    expect(snap.dials[4]).toEqual([1, false, 0, 1, 1]);
  });
});
