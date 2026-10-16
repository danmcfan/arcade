import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { addSoundListener, type SoundEvent } from "../engine/audio.ts";
import { NO_INPUT, type Input } from "../engine/input.ts";
import { fakeSoftware } from "../game/fakeSoftware.testutil.ts";
import type { Software, SoftwareName } from "../game/software.ts";
import { counterRects, deskRect } from "./desk.ts";
import { formatFloat0, newState, type State } from "./state.ts";
import { faced, update, type HubEvent } from "./update.ts";
import { houseHighScores, noHighScores, startingTokens, Wallet } from "./wallet.ts";

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

/** The software a hub event starts, if it starts one. */
function startedBy(e: HubEvent): Software | null {
  return e !== null && "start" in e ? e.start : null;
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
    const s = newState(fakeFactory);
    expect(s.player.x).toBe(80);
    expect(s.player.y).toBe(92);
    expect(s.player.direction).toBe("DOWN");
    expect(s.player.velocity).toBe(0);
    expect(s.player.frame).toBe(0);
    expect(s.melodyPlaying).toBe(false);
    expect(s.imageTitle).toBeNull();
    expect(s.wallet.toProgress().highScores).toEqual(noHighScores);
  });
});

describe("tokens and tickets", () => {
  test("a new hub starts with 5 tokens and 0 tickets", () => {
    const s = newState(fakeFactory);
    expect([s.wallet.tokens, s.wallet.tickets]).toEqual([startingTokens, 0]);
    expect(startingTokens).toBe(5);
  });

  test("a cabinet start spends exactly 1 token and is a paid run", () => {
    const s = newState(fakeFactory);
    run(s, 31, { up: true });
    const e = update(s, input({ up: true, space: true }));
    expect(startedBy(e)?.name).toBe("sweetSam");
    expect(s.wallet.tokens).toBe(4);
    expect(e).toMatchObject({ run: "paid" });
  });

  test("with 0 tokens the minigame still starts, as free play", () => {
    const s = newState(fakeFactory);
    s.wallet = new Wallet({ highScores: noHighScores, tokens: 0, tickets: 0, arcadeWon: false, prizes: [] });
    run(s, 31, { up: true });
    const e = update(s, input({ up: true, space: true }));
    expect(startedBy(e)?.name).toBe("sweetSam");
    expect(s.wallet.tokens).toBe(0);
    expect(e).toMatchObject({ run: "free" });
  });
});

describe("walking", () => {
  test("moves 1 px per tick in the held direction, with Up > Down > Left > Right priority", () => {
    const s = newState(fakeFactory);
    run(s, 3, { left: true });
    expect([s.player.x, s.player.y, s.player.direction]).toEqual([77, 92, "LEFT"]);
    run(s, 2, { down: true, left: true });
    expect([s.player.x, s.player.y, s.player.direction]).toEqual([77, 94, "DOWN"]);
    run(s, 1, { up: true, down: true });
    expect([s.player.x, s.player.y, s.player.direction]).toEqual([77, 93, "UP"]);
  });

  test("releasing keeps the facing direction and resets the frame to 0", () => {
    const s = newState(fakeFactory);
    run(s, 5, { right: true });
    expect(s.player.frame).toBeCloseTo(0.5, 12);
    run(s, 1);
    expect(s.player.frame).toBe(0);
    expect(s.player.velocity).toBe(0);
    expect(s.player.direction).toBe("RIGHT");
    expect(s.player.x).toBe(85);
  });

  test("frame accumulates 0.1 per moving tick with float64 rounding, wrapping at 4", () => {
    const s = newState(fakeFactory);
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
    const s = newState(fakeFactory);
    run(s, 100, { left: true });
    expect(s.player.x).toBe(8);
    expect(s.player.frame).not.toBe(0);
    run(s, 200, { right: true });
    expect(s.player.x).toBe(152);
    run(s, 100, { down: true });
    expect(s.player.y).toBe(132);
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
    const s = newState(fakeFactory);
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
    const s = newState(fakeFactory);
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
    const s = newState(fakeFactory);
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
  test("Space facing up at a cabinet loads its software with the house high score while it is unbeaten", () => {
    const s = newState(fakeFactory);
    s.wallet = new Wallet({
      highScores: { ...noHighScores, sweetSam: 777, firefly: 99999 },
      tokens: startingTokens,
      tickets: 0,
      arcadeWon: false,
      prizes: [],
    });
    run(s, 31, { up: true });
    sounds.length = 0;
    const sw = startedBy(update(s, input({ up: true, space: true })));
    expect(sw?.name).toBe("sweetSam");
    expect(sw === null ? undefined : highScores.get(sw)).toBe(houseHighScores.sweetSam);
    expect(s.melodyPlaying).toBe(false);
    expect(sounds).toEqual(["pause:attractSweet", "rewind:attractSweet"]);
  });

  test("a beaten cabinet loads its software with the player's high score", () => {
    const s = newState(fakeFactory);
    const best = houseHighScores.sweetSam + 1;
    s.wallet = new Wallet({
      highScores: { ...noHighScores, sweetSam: best },
      tokens: 1,
      tickets: 0,
      arcadeWon: false,
      prizes: [],
    });
    run(s, 31, { up: true });
    const sw = startedBy(update(s, input({ up: true, space: true })));
    expect(sw === null ? undefined : highScores.get(sw)).toBe(best);
  });

  test("Go quirk: the title is not cleared on entry (only melodyPlaying is)", () => {
    const s = newState(fakeFactory);
    run(s, 31, { up: true });
    update(s, input({ up: true, space: true }));
    expect(s.imageTitle).toBe("sweet");
  });

  test("arriving and pressing Space on the same tick plays, pauses and rewinds", () => {
    const s = newState(fakeFactory);
    run(s, 24, { up: true });
    const sw = startedBy(update(s, input({ up: true, space: true })));
    expect(sounds).toEqual([
      "play:attractSweet",
      "rewind:screenOn",
      "play:screenOn",
      "pause:attractSweet",
      "rewind:attractSweet",
    ]);
    expect(sw?.name).toBe("sweetSam");
  });

  test("Space not facing up, or away from a cabinet, does nothing", () => {
    const s = newState(fakeFactory);
    expect(update(s, input({ space: true }))).toBeNull();
    run(s, 31, { up: true });
    expect(update(s, input({ left: true, space: true }))).toBeNull();
  });

  test("software construction sounds come after the melody stop", () => {
    const s = newState((name) => {
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
  const deskTop = deskRect.y;

  test("is solid: walking down from the start stops at its top edge", () => {
    const s = newState(fakeFactory);
    run(s, 100, { down: true });
    expect(s.player.y).toBe(deskTop - s.player.height / 2);
    expect(s.player.y).toBe(95);
  });

  test("down stops at it anywhere along it", () => {
    for (const x of [29, 48, 107, 131]) {
      const at = newState(fakeFactory);
      at.player.x = x;
      run(at, 100, { down: true });
      expect({ x, y: at.player.y }).toEqual({ x, y: 95 });
    }
  });

  test("is one rect over the whole desk: no way into the U", () => {
    expect(counterRects).toEqual([deskRect]);
  });

  test("can be walked around: down either side to the bottom edge, then into its arms", () => {
    for (const [x, toward, stopX] of [
      [16, "right", 28],
      [144, "left", 132],
    ] as const) {
      const s = newState(fakeFactory);
      s.player.x = x;
      run(s, 100, { down: true });
      expect(s.player.y).toBe(132);
      run(s, 100, { [toward]: true });
      expect({ x, stop: s.player.x }).toEqual({ x, stop: stopX });
    }
  });

  test("the room's corners are reachable", () => {
    const s = newState(fakeFactory);
    run(s, 200, { left: true });
    run(s, 200, { up: true });
    expect({ x: s.player.x, y: s.player.y }).toEqual({ x: 8, y: 60 });
    run(s, 200, { right: true });
    expect(s.player.x).toBe(152);
  });

  test("Space facing it from above opens it, anywhere along it, and starts no minigame", () => {
    for (const x of [32, 80, 107, 128]) {
      const s = newState(fakeFactory);
      s.player.x = x;
      run(s, 100, { down: true });
      expect({ x, event: update(s, input({ space: true })) }).toEqual({ x, event: { openCounter: true } });
      expect(s.wallet.tokens).toBe(startingTokens);
    }
  });

  test("Space elsewhere, or next to it but facing away, does not open it", () => {
    const s = newState(fakeFactory);
    expect(update(s, input({ space: true }))).toBeNull(); // start position, facing down: 2 px short of the desk
    run(s, 100, { down: true });
    run(s, 1, { left: true });
    expect(update(s, input({ space: true }))).toBeNull(); // touching it, facing left
    run(s, 30, { up: true });
    expect(update(s, input({ space: true }))).not.toEqual({ openCounter: true });
  });
});

describe("the faced interactable", () => {
  test("facing the desk from above is the prize counter, anywhere along it", () => {
    for (const x of [32, 80, 128]) {
      const s = newState(fakeFactory);
      s.player.x = x;
      run(s, 100, { down: true });
      expect(faced(s, false)).toBe("prizeCounter");
    }
  });

  test("nothing is named while the prize counter menu is open", () => {
    const s = newState(fakeFactory);
    run(s, 100, { down: true });
    expect(faced(s, true)).toBeNull();
  });

  test("facing away from the desk, short of it, or a cabinet is not", () => {
    const s = newState(fakeFactory);
    expect(faced(s, false)).toBeNull(); // start: facing down, 2 px short
    run(s, 100, { down: true });
    run(s, 1, { left: true });
    expect(faced(s, false)).toBeNull(); // touching it, facing left
    run(s, 40, { up: true });
    expect(faced(s, false)).toBe("sweet");
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
      const s = newState((n) => {
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
    const s = newState(fakeFactory);
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
