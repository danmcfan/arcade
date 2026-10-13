import { describe, expect, test } from "bun:test";
import { NO_INPUT, type Input } from "../engine/input.ts";
import { imageFireflyBackground } from "../engine/assets.ts";
import { addSoundListener, type SoundEvent } from "../engine/audio.ts";
import type { FireflySnapshot } from "../game/snapshot.ts";
import { isFixedViewport } from "../game/software.ts";
import { FireflySoftware, angle, collide, durationStep, frameAngle, radToDeg } from "./game.ts";
import { createFirefly } from "./index.ts";

// Verbatim port of internal/firefly/game_test.go.
describe("TestAngle", () => {
  const tests = [
    { direction: { x: 0, y: 0 }, angle: 0 },
    { direction: { x: 0, y: -1 }, angle: 0 },
    { direction: { x: 1, y: -1 }, angle: 45 },
    { direction: { x: 1, y: 0 }, angle: 90 },
    { direction: { x: 1, y: 1 }, angle: 135 },
    { direction: { x: 0, y: 1 }, angle: 180 },
    { direction: { x: -1, y: 1 }, angle: 225 },
    { direction: { x: -1, y: 0 }, angle: 270 },
    { direction: { x: -1, y: -1 }, angle: 315 },
  ];
  for (const t of tests) {
    test(`(${t.direction.x}, ${t.direction.y}) → ${t.angle}`, () => {
      expect(angle(t.direction)).toBe(t.angle);
    });
  }
});

describe("TestFrameAngle", () => {
  const tests = [
    { angle: 0, row: 0, col: 0 },
    { angle: 15, row: 0, col: 1 },
    { angle: 30, row: 0, col: 2 },
    { angle: 45, row: 0, col: 3 },
    { angle: 60, row: 0, col: 4 },
    { angle: 75, row: 0, col: 5 },
    { angle: 90, row: 1, col: 0 },
    { angle: 180, row: 2, col: 0 },
    { angle: 270, row: 3, col: 0 },
  ];
  for (const t of tests) {
    test(`${t.angle}° → row ${t.row}, col ${t.col}`, () => {
      expect(frameAngle(t.angle)).toEqual([t.row, t.col]);
    });
  }
});

describe("constants", () => {
  test("radToDeg is the exactly rounded Go constant 180/math.Pi", () => {
    expect(radToDeg).toBe(57.29577951308232);
    expect(radToDeg).toBe(180 / Math.PI);
  });

  test("durationStep is 1/(60*3)", () => {
    expect(durationStep).toBe(1 / 180);
  });
});

describe("FireflySoftware", () => {
  test("is the firefly software on the night background, never over, scoreless", () => {
    const f = createFirefly();
    expect(f.name).toBe("firefly");
    expect(f.background()).toBe(imageFireflyBackground);
    expect(f.gameOver()).toBe(false);
    expect(f.score()).toBe(0);
  });

  test("first idle tick: player parked bottom centre, two leaders spawn at p0, the rest wait at (0,0)", () => {
    const f = createFirefly();
    f.update(NO_INPUT);
    const s = f.snapshot() as FireflySnapshot;
    expect(s.player).toEqual({ x: 112, y: 264 });
    expect(s.fireDelay).toBe(0);
    expect(s.bullets).toEqual([]);
    expect(s.bugs.map((b) => b.pattern)).toEqual(["L", "L", "L", "L", "L", "R", "R", "R", "R", "R"]);

    // Delay -0 is not < 0, so bugs 0 and 5 take their first bezier step at once.
    expect(s.bugs[0]).toEqual({ pattern: "L", x: 128, y: 8, dx: 128, dy: 8, duration: 1 / 180, deadFrames: 0 });
    expect(s.bugs[5]).toEqual({ pattern: "R", x: 96, y: 8, dx: 96, dy: 8, duration: 1 / 180, deadFrames: 0 });

    // Bug k (k = 1..4) waits 12k ticks at the origin.
    for (const k of [1, 2, 3, 4]) {
      const b = s.bugs[k];
      expect(b?.x).toBe(0);
      expect(b?.y).toBe(0);
      expect(b?.dx).toBe(0);
      expect(b?.dy).toBe(0);
      expect(b?.duration).toBeCloseTo((1 - 12 * k) / 180, 12);
    }
  });
});

describe("cabinet", () => {
  test("is a FixedViewport the size of the cabinet", () => {
    const f = createFirefly();
    expect(isFixedViewport(f)).toBe(true);
    if (isFixedViewport(f)) expect(f.fixedViewportSize()).toEqual([336, 428]);
  });

  test("the snapshot's joystick follows the input: neutral, up, down, left, right", () => {
    const f = createFirefly();
    expect((f.snapshot() as FireflySnapshot).joystick).toBe(0);
    const frames = [
      held({}),
      held({ up: true }),
      held({ down: true }),
      held({ left: true }),
      held({ right: true }),
    ].map((i) => {
      f.update(i);
      return (f.snapshot() as FireflySnapshot).joystick;
    });
    expect(frames).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("collide", () => {
  test("hits only when both axes are strictly closer than one tile (8)", () => {
    expect(collide({ x: 0, y: 0 }, { x: 0, y: 0 })).toBe(true);
    expect(collide({ x: 7.9, y: -7.9 }, { x: 0, y: 0 })).toBe(true);
    expect(collide({ x: 8, y: 0 }, { x: 0, y: 0 })).toBe(false);
    expect(collide({ x: 0, y: -8 }, { x: 0, y: 0 })).toBe(false);
    expect(collide({ x: 3, y: 9 }, { x: 0, y: 0 })).toBe(false);
  });
});

const held = (i: Partial<Input>): Input => ({ ...NO_INPUT, ...i });

function snap(f: FireflySoftware): FireflySnapshot {
  return f.snapshot();
}

function recordSounds(): { events: SoundEvent[]; stop: () => void } {
  const events: SoundEvent[] = [];
  const stop = addSoundListener((e) => events.push(e));
  return { events, stop };
}

/** Park every bug in a long explosion so none can collide or move. */
function freezeBugs(f: FireflySoftware): void {
  for (const b of f.bugs) b.deadFrames = 10_000;
}

describe("firing", () => {
  test("a held Space fires on the first tick, from 4 left of and 8 above the ship, then moves 5 up", () => {
    const f = new FireflySoftware();
    freezeBugs(f);
    const rec = recordSounds();
    f.update(held({ space: true }));
    rec.stop();
    expect(snap(f).bullets).toEqual([{ x: 108, y: 251 }]);
    expect(rec.events).toEqual(["rewind:laser", "play:laser"]);
  });

  test("fireDelay is set to 20 and decremented the same tick, so the fire period is 20 ticks", () => {
    const f = new FireflySoftware();
    freezeBugs(f);
    const delays: number[] = [];
    const counts: number[] = [];
    for (let t = 1; t <= 41; t++) {
      f.update(held({ space: true }));
      delays.push(snap(f).fireDelay);
      counts.push(snap(f).bullets.length);
    }
    expect(delays.slice(0, 3)).toEqual([19, 18, 17]);
    expect(delays[19]).toBe(0); // tick 20
    expect(delays[20]).toBe(19); // tick 21 fires again
    expect(counts[19]).toBe(1);
    expect(counts[20]).toBe(2);
    expect(counts[40]).toBe(3);
  });

  test("releasing Space still counts the delay down", () => {
    const f = new FireflySoftware();
    freezeBugs(f);
    f.update(held({ space: true }));
    f.update(NO_INPUT);
    expect(snap(f).fireDelay).toBe(18);
  });
});

describe("ship movement", () => {
  test("Left/Right move 2 px per tick", () => {
    const f = new FireflySoftware();
    f.update(held({ left: true }));
    expect(snap(f).player).toEqual({ x: 110, y: 264 });
    f.update(held({ right: true }));
    f.update(held({ right: true }));
    expect(snap(f).player).toEqual({ x: 114, y: 264 });
  });

  test("direction priority: Up or Down masks Left/Right; Left beats Right", () => {
    const f = new FireflySoftware();
    f.update(held({ up: true, left: true }));
    f.update(held({ down: true, right: true }));
    expect(snap(f).player.x).toBe(112);
    f.update(held({ left: true, right: true }));
    expect(snap(f).player.x).toBe(110);
  });

  test("clamped to x in [8, 217]", () => {
    const f = new FireflySoftware();
    for (let t = 0; t < 100; t++) f.update(held({ left: true }));
    expect(snap(f).player.x).toBe(8);
    for (let t = 0; t < 120; t++) f.update(held({ right: true }));
    expect(snap(f).player.x).toBe(217);
  });
});

describe("bullet lifecycle", () => {
  test("a bullet flies until y <= 0 and is removed that tick", () => {
    const f = new FireflySoftware();
    freezeBugs(f);
    f.update(held({ space: true })); // y 251 after tick 1: y = 256 - 5t
    for (let t = 2; t <= 51; t++) f.update(NO_INPUT);
    expect(snap(f).bullets).toEqual([{ x: 108, y: 1 }]);
    f.update(NO_INPUT); // y would be -4
    expect(snap(f).bullets).toEqual([]);
  });

  test("a bullet that just left the top still hits a bug in the same tick", () => {
    const f = new FireflySoftware();
    // Bullet spawns at (0, 5) and moves to (0, 0): flagged dead, yet it hits
    // bug 0, which has not moved from the origin yet.
    f.player.position = { x: 4, y: 13 };
    const rec = recordSounds();
    f.update(held({ space: true }));
    rec.stop();
    const s = snap(f);
    expect(s.bullets).toEqual([]);
    expect(s.bugs[0]).toMatchObject({ x: 0, y: 0, deadFrames: 74 });
    expect(rec.events).toEqual(["rewind:laser", "play:laser", "rewind:boom", "play:boom"]);
  });

  test("bugs not yet spawned sit at (0,0) and can be shot there", () => {
    const f = new FireflySoftware();
    f.update(NO_INPUT); // bugs 0 and 5 leave; bug 1 waits at the origin
    const waiting = snap(f).bugs[1]?.duration ?? 0;
    expect(waiting).toBeLessThan(0);
    f.player.position = { x: 4, y: 13 };
    f.update(held({ space: true }));
    const bug1 = snap(f).bugs[1];
    expect(bug1).toMatchObject({ x: 0, y: 0, deadFrames: 74, duration: waiting });
  });

  test("one bullet kills at most one bug (the first in slice order)", () => {
    const f = new FireflySoftware();
    f.player.position = { x: 4, y: 13 };
    f.update(held({ space: true }));
    const dead = snap(f).bugs.filter((b) => b.deadFrames > 0);
    expect(dead.length).toBe(1);
  });
});

describe("explosions and waves", () => {
  test("a hit bug explodes for 75 ticks, frozen in place, then is removed", () => {
    const f = new FireflySoftware();
    f.player.position = { x: 4, y: 13 };
    f.update(held({ space: true }));
    expect(snap(f).bugs.length).toBe(10);
    for (let t = 2; t <= 74; t++) f.update(NO_INPUT);
    expect(snap(f).bugs[0]).toMatchObject({ pattern: "L", x: 0, y: 0, deadFrames: 1 });
    f.update(NO_INPUT); // tick 75: deadFrames hits 0, bug removed
    const s = snap(f);
    expect(s.bugs.length).toBe(9);
    expect(s.bugs[0]?.deadFrames).toBe(0);
  });

  test("bugs fly the bezier for 180 ticks, then climb 2.5 px per tick and leave off the top", () => {
    const f = new FireflySoftware();
    for (let t = 1; t <= 181; t++) f.update(NO_INPUT);
    // Bug 0: bezier at durations 0..180/180 on ticks 1..181, ending at p3.
    const at181 = snap(f).bugs[0];
    expect(at181?.x).toBeCloseTo(112, 9);
    expect(at181?.y).toBeCloseTo(96, 9);
    f.update(NO_INPUT);
    const at182 = snap(f).bugs[0];
    expect(at182?.dx).toBe(0);
    expect(at182?.dy).toBe(-2.5);
    expect(at182?.y).toBeCloseTo(93.5, 9);
  });

  test("when every bug is gone, one snapshot shows no bugs, then the next tick respawns the wave", () => {
    const f = new FireflySoftware();
    let emptyTick = 0;
    for (let t = 1; t <= 400 && emptyTick === 0; t++) {
      f.update(NO_INPUT);
      if (snap(f).bugs.length === 0) emptyTick = t;
    }
    expect(emptyTick).toBeGreaterThan(0);
    f.update(NO_INPUT);
    const s = snap(f);
    expect(s.bugs.length).toBe(10);
    expect(s.bugs[0]).toMatchObject({ x: 128, y: 8, duration: 1 / 180 });
  });
});
