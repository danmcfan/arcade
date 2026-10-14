import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { addSoundListener, type SoundEvent } from "../engine/audio.ts";
import { NO_INPUT, type Input } from "../engine/input.ts";
import { fakeSoftware } from "../game/fakeSoftware.testutil.ts";
import type { Software, SoftwareName } from "../game/software.ts";
import { counterRects, deskParts } from "./desk.ts";
import { formatFloat0, newState, startingTokens, type State } from "./state.ts";
import { startRun, update } from "./update.ts";

/** The high score each fake was constructed with. */
const highScores = new WeakMap<Software, number>();
function fakeFactory(name: SoftwareName, highScore: number): Software {
  const sw = fakeSoftware(name);
  highScores.set(sw, highScore);
  return sw;
}

function input(keys: Partial<Input> = {}): Input {
  return { ...NO_INPUT, ...keys };
}

function run(s: State, ticks: number, keys: Partial<Input> = {}): void {
  for (let t = 0; t < ticks; t++) update(s, input(keys));
}

let sounds: SoundEvent[] = [];
let unsubscribe: () => void = () => {};
beforeEach(() => {
  sounds = [];
  unsubscribe = addSoundListener((e) => {
    sounds.push(e);
  });
});
afterEach(() => {
  unsubscribe();
});

describe("newState", () => {
  test("player spawns at (80, 92) facing down, idle, frame 0; no title, no melody", () => {
    const s = newState(null, fakeFactory);
    expect(s.player.x).toBe(80);
    expect(s.player.y).toBe(92);
    expect(s.player.direction).toBe("DOWN");
    expect(s.player.velocity).toBe(0);
    expect(s.player.frame).toBe(0);
    expect(s.melodyPlaying).toBe(false);
    expect(s.imageTitle).toBeNull();
    expect(s.loadedSoftware).toBeNull();
    expect(s.highScore).toBe(0);
  });

  test("the initial software is handed over as loadedSoftware", () => {
    const sw = fakeFactory("sweetSam", 0);
    expect(newState(sw, fakeFactory).loadedSoftware).toBe(sw);
  });
});

describe("tokens and tickets", () => {
  test("a new hub starts with 5 tokens and 0 tickets", () => {
    const s = newState(null, fakeFactory);
    expect([s.tokens, s.tickets]).toEqual([startingTokens, 0]);
    expect(startingTokens).toBe(5);
  });

  test("a cabinet start spends exactly 1 token and is a paid run", () => {
    const s = newState(null, fakeFactory);
    run(s, 31, { up: true });
    update(s, input({ up: true, space: true }));
    expect(s.loadedSoftware?.name).toBe("sweetSam");
    expect(s.tokens).toBe(4);
    expect(s.loadedRun).toBe("paid");
  });

  test("with 0 tokens the minigame still starts, as free play", () => {
    const s = newState(null, fakeFactory);
    s.tokens = 0;
    run(s, 31, { up: true });
    update(s, input({ up: true, space: true }));
    expect(s.loadedSoftware?.name).toBe("sweetSam");
    expect(s.tokens).toBe(0);
    expect(s.loadedRun).toBe("free");
  });

  test("a minigame started directly (not at a cabinet) is outside the economy", () => {
    const s = newState(fakeFactory("sweetSam", 0), fakeFactory);
    expect(s.loadedRun).toBe("direct");
    expect(s.tokens).toBe(5);
    expect(newState(null, fakeFactory).loadedRun).toBeNull();
  });

  test("startRun picks the kind of run and spends the token", () => {
    const s = newState(null, fakeFactory);
    s.tokens = 1;
    expect(startRun(s)).toBe("paid");
    expect(s.tokens).toBe(0);
    expect(startRun(s)).toBe("free");
    expect(s.tokens).toBe(0);
  });
});

describe("walking", () => {
  test("moves 1 px per tick in the held direction, with Up > Down > Left > Right priority", () => {
    const s = newState(null, fakeFactory);
    run(s, 3, { left: true });
    expect([s.player.x, s.player.y, s.player.direction]).toEqual([77, 92, "LEFT"]);
    run(s, 2, { down: true, left: true });
    expect([s.player.x, s.player.y, s.player.direction]).toEqual([77, 94, "DOWN"]);
    run(s, 1, { up: true, down: true });
    expect([s.player.x, s.player.y, s.player.direction]).toEqual([77, 93, "UP"]);
  });

  test("releasing keeps the facing direction and resets the frame to 0", () => {
    const s = newState(null, fakeFactory);
    run(s, 5, { right: true });
    expect(s.player.frame).toBeCloseTo(0.5, 12);
    run(s, 1);
    expect(s.player.frame).toBe(0);
    expect(s.player.velocity).toBe(0);
    expect(s.player.direction).toBe("RIGHT");
    expect(s.player.x).toBe(85);
  });

  test("frame accumulates 0.1 per moving tick with float64 rounding, wrapping at 4", () => {
    const s = newState(null, fakeFactory);
    let want = 0;
    for (let t = 0; t < 45; t++) {
      // Alternate left/right so the walk never hits a wall.
      update(s, input(t % 2 === 0 ? { left: true } : { right: true }));
      want = (want + 0.1) % 4;
      expect(s.player.frame).toBe(want);
    }
    expect(s.player.frame).toBeLessThan(1);
  });

  test("walls stop the player but the walk animation keeps running", () => {
    const s = newState(null, fakeFactory);
    run(s, 100, { left: true });
    expect(s.player.x).toBe(32);
    expect(s.player.frame).not.toBe(0);
    run(s, 100, { right: true });
    expect(s.player.x).toBe(128);
    run(s, 100, { down: true }); // x 128: the prize desk spans the floor, so it stops the player too
    expect(s.player.y).toBe(94);
    run(s, 100, { up: true });
    expect(s.player.y).toBe(60);
  });
});

/** Walk from spawn to beneath the Sweet Sam cabinet, facing up. */
function walkToSweet(s: State): void {
  run(s, 31, { up: true }); // y 92 → 61; the player rect reaches the cabinet at y < 68
}

describe("melody and title", () => {
  test("facing up at a cabinet starts the melody once and shows its title", () => {
    const s = newState(null, fakeFactory);
    run(s, 24, { up: true }); // y = 68: not yet at the cabinet
    expect(s.melodyPlaying).toBe(false);
    expect(sounds).toEqual([]);
    run(s, 1, { up: true }); // y = 67
    expect(s.melodyPlaying).toBe(true);
    expect(s.imageTitle).toBe("sweet");
    expect(sounds).toEqual(["play:attractSweet", "rewind:screenOn", "play:screenOn"]);
    run(s, 10, { up: true });
    run(s, 10); // idle, still facing up
    expect(sounds).toEqual(["play:attractSweet", "rewind:screenOn", "play:screenOn"]);
    expect(s.melodyPlaying).toBe(true);
  });

  test("turning away stops and rewinds the melody and clears the title", () => {
    const s = newState(null, fakeFactory);
    walkToSweet(s);
    sounds.length = 0;
    run(s, 1, { left: true });
    expect(s.melodyPlaying).toBe(false);
    expect(s.imageTitle).toBeNull();
    expect(sounds).toEqual(["pause:attractSweet", "rewind:attractSweet"]);
    run(s, 5, { left: true });
    expect(sounds).toEqual(["pause:attractSweet", "rewind:attractSweet"]);
  });

  test("each cabinet shows its own title", () => {
    const s = newState(null, fakeFactory);
    walkToSweet(s);
    run(s, 40, { left: true }); // x = 40, under brassMonkey
    run(s, 1, { up: true });
    expect(s.imageTitle).toBe("brassMonkey");
    run(s, 80, { right: true }); // x = 120, under firefly
    run(s, 1, { up: true });
    expect(s.imageTitle).toBe("firefly");
  });
});

describe("entering a machine", () => {
  test("Space facing up at a cabinet loads its software with the high score", () => {
    const s = newState(null, fakeFactory);
    s.highScore = 777;
    run(s, 31, { up: true });
    sounds.length = 0;
    update(s, input({ up: true, space: true }));
    expect(s.loadedSoftware?.name).toBe("sweetSam");
    expect(s.loadedSoftware === null ? undefined : highScores.get(s.loadedSoftware)).toBe(777);
    expect(s.melodyPlaying).toBe(false);
    expect(sounds).toEqual(["pause:attractSweet", "rewind:attractSweet"]);
  });

  test("Go quirk: the title is not cleared on entry (only melodyPlaying is)", () => {
    const s = newState(null, fakeFactory);
    run(s, 31, { up: true });
    update(s, input({ up: true, space: true }));
    expect(s.imageTitle).toBe("sweet");
  });

  test("arriving and pressing Space on the same tick plays, pauses and rewinds", () => {
    const s = newState(null, fakeFactory);
    run(s, 24, { up: true });
    update(s, input({ up: true, space: true }));
    expect(sounds).toEqual([
      "play:attractSweet",
      "rewind:screenOn",
      "play:screenOn",
      "pause:attractSweet",
      "rewind:attractSweet",
    ]);
    expect(s.loadedSoftware?.name).toBe("sweetSam");
  });

  test("Space not facing up, or away from a cabinet, does nothing", () => {
    const s = newState(null, fakeFactory);
    update(s, input({ space: true }));
    expect(s.loadedSoftware).toBeNull();
    run(s, 31, { up: true });
    update(s, input({ left: true, space: true }));
    expect(s.loadedSoftware).toBeNull();
  });

  test("software construction sounds come after the melody stop", () => {
    const s = newState(null, (name) => {
      sounds.push("play:sweetStart");
      return fakeSoftware(name);
    });
    run(s, 31, { up: true });
    sounds.length = 0;
    update(s, input({ up: true, space: true }));
    expect(sounds).toEqual(["pause:attractSweet", "rewind:attractSweet", "play:sweetStart"]);
  });
});

describe("prize desk", () => {
  const deskTop = Math.min(...deskParts.map((p) => p.y));

  test("is solid: walking down from the start stops at its top edge", () => {
    const s = newState(null, fakeFactory);
    run(s, 100, { down: true });
    expect(s.player.y).toBe(deskTop - s.player.height / 2);
    expect(s.player.y).toBe(94);
  });

  test("spans the floor: down stops at it from the left wall to the right wall, the flap included", () => {
    for (const x of [32, 48, 107, 128]) {
      const at = newState(null, fakeFactory);
      at.player.x = x;
      run(at, 100, { down: true });
      expect({ x, y: at.player.y }).toEqual({ x, y: 94 });
    }
  });

  test("its rects run from its top to the bottom wall, and the flap's gap is narrower than the player", () => {
    for (const r of counterRects) expect(r.y + r.h).toBe(120);
    const s = newState(null, fakeFactory);
    const gaps = counterRects
      .filter((r) => r.y === deskTop)
      .toSorted((a, b) => a.x - b.x)
      .flatMap((r, i, rs) => {
        const next = rs[i + 1];
        return next === undefined ? [] : [next.x - (r.x + r.w)];
      })
      .filter((g) => g > 0);
    expect(gaps.every((g) => g < s.player.width)).toBe(true);
  });

  test("Space facing it from above opens it, anywhere along it, and starts no minigame", () => {
    for (const x of [32, 80, 107, 128]) {
      const s = newState(null, fakeFactory);
      s.player.x = x;
      run(s, 100, { down: true });
      expect(s.counterOpened).toBe(false);
      update(s, input({ space: true }));
      expect({ x, opened: s.counterOpened }).toEqual({ x, opened: true });
      expect(s.loadedSoftware).toBeNull();
      expect(s.tokens).toBe(startingTokens);
    }
  });

  test("Space elsewhere, or next to it but facing away, does not open it", () => {
    const s = newState(null, fakeFactory);
    update(s, input({ space: true })); // start position, facing down: 2 px short of the desk
    expect(s.counterOpened).toBe(false);
    run(s, 100, { down: true });
    run(s, 1, { left: true });
    update(s, input({ space: true })); // touching it, facing left
    expect(s.counterOpened).toBe(false);
    run(s, 30, { up: true });
    update(s, input({ space: true }));
    expect(s.counterOpened).toBe(false);
  });
});

describe("cabinets 40 px apart", () => {
  test("walking up to each cabinet and pressing Space starts its minigame", () => {
    const cases: [number, SoftwareName][] = [
      [40, "brassMonkey"],
      [80, "sweetSam"],
      [120, "firefly"],
    ];
    for (const [x, name] of cases) {
      const started: SoftwareName[] = [];
      const s = newState(null, (n) => {
        started.push(n);
        return fakeSoftware(n);
      });
      s.player.x = x;
      run(s, 40, { up: true });
      update(s, input({ up: true, space: true }));
      expect({ x, started }).toEqual({ x, started: [name] });
    }
  });
});

describe("debugInfo", () => {
  test("player position with %.0f formatting", () => {
    const s = newState(null, fakeFactory);
    expect(s.debugInfo()).toEqual(["Player: (80,92)"]);
    run(s, 3, { left: true });
    expect(s.debugInfo()).toEqual(["Player: (77,92)"]);
  });
});

describe("formatFloat0 (Go %.0f)", () => {
  test("rounds to nearest with ties to even, keeps the sign of zero", () => {
    const cases: [number, string][] = [
      [80, "80"],
      [0.4, "0"],
      [0.5, "0"],
      [1.5, "2"],
      [2.5, "2"],
      [2.6, "3"],
      [-0.4, "-0"],
      [-2.5, "-2"],
      [-3.5, "-4"],
    ];
    expect(cases.map(([v]) => formatFloat0(v))).toEqual(cases.map(([, s]) => s));
  });
});
