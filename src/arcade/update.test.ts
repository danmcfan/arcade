import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { addSoundListener, type SoundEvent } from "../engine/audio.ts";
import { NO_INPUT, type Input } from "../engine/input.ts";
import type { Software, SoftwareName } from "../game/software.ts";
import { checkCollision } from "./collision.ts";
import { counterRect } from "./prizeCounter.ts";
import { formatFloat0, newState, startingTokens, type State } from "./state.ts";
import { startRun, update, useTarget } from "./update.ts";
import type { Direction } from "../engine/input.ts";
import { usePrompt, usePromptBobTicks } from "./draw.ts";
import { keyHeight, keyWidth } from "../ui/text.ts";

const fakeFactory = (name: SoftwareName, highScore: number): Software =>
  ({ name, highScore }) as unknown as Software;

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
  unsubscribe = addSoundListener((e) => sounds.push(e));
});
afterEach(() => unsubscribe());

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
    const sw = fakeFactory("hive", 0);
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
    expect(s.loadedSoftware?.name).toBe("hive");
    expect(s.tokens).toBe(4);
    expect(s.loadedRun).toBe("paid");
  });

  test("with 0 tokens the minigame still starts, as free play", () => {
    const s = newState(null, fakeFactory);
    s.tokens = 0;
    run(s, 31, { up: true });
    update(s, input({ up: true, space: true }));
    expect(s.loadedSoftware?.name).toBe("hive");
    expect(s.tokens).toBe(0);
    expect(s.loadedRun).toBe("free");
  });

  test("a minigame started directly (not at a cabinet) is outside the economy", () => {
    const s = newState(fakeFactory("hive", 0), fakeFactory);
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
    run(s, 100, { down: true }); // x 128: beside the prize counter, not above it
    expect(s.player.y).toBe(108);
    run(s, 100, { up: true });
    expect(s.player.y).toBe(60);
  });
});

describe("melody and title", () => {
  /** Walk from spawn to beneath the sweet (hive) cabinet, facing up. */
  function walkToSweet(s: State): void {
    run(s, 31, { up: true }); // y 92 → 61; the player rect reaches the cabinet at y < 68
  }

  test("facing up at a cabinet starts the melody once and shows its title", () => {
    const s = newState(null, fakeFactory);
    run(s, 24, { up: true }); // y = 68: not yet at the cabinet
    expect(s.melodyPlaying).toBe(false);
    expect(sounds).toEqual([]);
    run(s, 1, { up: true }); // y = 67
    expect(s.melodyPlaying).toBe(true);
    expect(s.imageTitle).toBe("sweet");
    expect(sounds).toEqual(["play:melody"]);
    run(s, 10, { up: true });
    run(s, 10); // idle, still facing up
    expect(sounds).toEqual(["play:melody"]);
    expect(s.melodyPlaying).toBe(true);
  });

  test("turning away stops and rewinds the melody and clears the title", () => {
    const s = newState(null, fakeFactory);
    walkToSweet(s);
    sounds.length = 0;
    run(s, 1, { left: true });
    expect(s.melodyPlaying).toBe(false);
    expect(s.imageTitle).toBeNull();
    expect(sounds).toEqual(["pause:melody", "rewind:melody"]);
    run(s, 5, { left: true });
    expect(sounds).toEqual(["pause:melody", "rewind:melody"]);
  });

  test("each cabinet shows its own title", () => {
    const s = newState(null, fakeFactory);
    walkToSweet(s);
    run(s, 24, { left: true }); // x = 56, under brassMonkey
    run(s, 1, { up: true });
    expect(s.imageTitle).toBe("brassMonkey");
    run(s, 48, { right: true }); // x = 104, under firefly
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
    expect(s.loadedSoftware?.name).toBe("hive");
    expect((s.loadedSoftware as unknown as { highScore: number }).highScore).toBe(777);
    expect(s.melodyPlaying).toBe(false);
    expect(sounds).toEqual(["pause:melody", "rewind:melody"]);
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
    expect(sounds).toEqual(["play:melody", "pause:melody", "rewind:melody"]);
    expect(s.loadedSoftware?.name).toBe("hive");
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
      sounds.push("play:start");
      return { name } as Software;
    });
    run(s, 31, { up: true });
    sounds.length = 0;
    update(s, input({ up: true, space: true }));
    expect(sounds).toEqual(["pause:melody", "rewind:melody", "play:start"]);
  });
});

describe("prize counter", () => {
  test("is solid: walking down from the start stops at its top edge", () => {
    const s = newState(null, fakeFactory);
    run(s, 100, { down: true });
    expect(s.player.y).toBe(counterRect.y - s.player.height / 2);
    expect(s.player.y).toBe(94);
  });

  test("can't be walked through from the side", () => {
    const s = newState(null, fakeFactory);
    run(s, 40, { left: true }); // x 40
    run(s, 40, { down: true }); // y 108, against the bottom wall
    run(s, 100, { right: true });
    expect(s.player.x).toBe(counterRect.x - s.player.width / 2);
    run(s, 40, { left: true });
    run(s, 100, { up: true }); // round the counter to its right-hand side
    run(s, 100, { right: true });
    run(s, 100, { down: true });
    run(s, 100, { left: true });
    expect(s.player.x).toBe(counterRect.x + counterRect.w + s.player.width / 2);
  });

  test("Space facing it from above opens it, and starts no minigame", () => {
    const s = newState(null, fakeFactory);
    run(s, 100, { down: true });
    expect(s.counterOpened).toBe(false);
    update(s, input({ space: true }));
    expect(s.counterOpened).toBe(true);
    expect(s.loadedSoftware).toBeNull();
    expect(s.tokens).toBe(startingTokens);
  });

  test("Space facing it from the side opens it", () => {
    const s = newState(null, fakeFactory);
    run(s, 40, { left: true });
    run(s, 40, { down: true });
    run(s, 100, { right: true });
    update(s, input({ space: true }));
    expect(s.counterOpened).toBe(true);
  });

  test("Space elsewhere, or next to it but facing away, does not open it", () => {
    const s = newState(null, fakeFactory);
    update(s, input({ space: true })); // start position, facing down: 2 px short of the counter
    expect(s.counterOpened).toBe(false);
    run(s, 100, { down: true });
    run(s, 1, { left: true });
    run(s, 1, { right: true });
    update(s, input({ space: true })); // touching it, facing right
    expect(s.counterOpened).toBe(false);
    run(s, 30, { up: true });
    update(s, input({ space: true }));
    expect(s.counterOpened).toBe(false);
  });
});

describe("use prompt", () => {
  /** A hub with the player placed at (x, y), facing `dir`. */
  function at(x: number, y: number, dir: Direction): State {
    const s = newState(null, fakeFactory);
    Object.assign(s.player, { x, y, direction: dir });
    return s;
  }
  const directions: Direction[] = ["UP", "DOWN", "LEFT", "RIGHT"];
  /** Below each cabinet, as close as the top wall allows (the player rect overlaps the cabinet's). */
  const cabinets = [
    { title: "brassMonkey", x: 56 },
    { title: "sweet", x: 80 },
    { title: "firefly", x: 104 },
  ] as const;

  test("shows facing up while touching each cabinet, above that cabinet", () => {
    for (const c of cabinets) {
      for (const y of [60, 67]) {
        const s = at(c.x, y, "UP");
        const target = useTarget(s);
        expect(target !== null && target !== "counter" ? target.title : target).toBe(c.title);
        const m = s.machines.find((m) => m.title === c.title)!;
        expect(usePrompt(s, 0)).toEqual({
          x: m.rect.x + Math.trunc((m.rect.w - keyWidth("SPACE")) / 2),
          y: m.rect.y - keyHeight - 2,
        });
      }
    }
  });

  test("does not show at a cabinet facing any other way, or one pixel out of reach", () => {
    for (const c of cabinets) {
      for (const dir of directions.filter((d) => d !== "UP")) expect(usePrompt(at(c.x, 60, dir), 0)).toBeNull();
      expect(usePrompt(at(c.x, 68, "UP"), 0)).toBeNull();
    }
  });

  test("from either side of the prize counter, above the counter", () => {
    const r = counterRect;
    const want = { x: r.x + Math.trunc((r.w - keyWidth("SPACE")) / 2), y: r.y - keyHeight - 2 };
    for (const [x, y, dir] of [
      [52, 108, "RIGHT"],
      [108, 108, "LEFT"],
    ] as const) {
      const s = at(x, y, dir);
      expect(useTarget(s)).toBe("counter");
      expect(usePrompt(s, 0)).toEqual(want);
    }
  });

  test("standing on top of the prize counter, above the player's head and centred on them", () => {
    for (const x of [80, 53, 107]) {
      const s = at(x, 94, "DOWN");
      expect(useTarget(s)).toBe("counter");
      // The player's rect is 16 x 24 centred on (x, 94): its top is y 82.
      expect(usePrompt(s, 0)).toEqual({ x: x - keyWidth("SPACE") / 2, y: 82 - keyHeight - 2 });
    }
  });

  test("never covers the prize counter or the player", () => {
    const capRect = (p: { x: number; y: number }) => ({ x: p.x, y: p.y, w: keyWidth("SPACE"), h: keyHeight });
    for (const [x, y, dir] of [
      [80, 94, "DOWN"],
      [53, 94, "DOWN"],
      [107, 94, "DOWN"],
      [52, 108, "RIGHT"],
      [108, 108, "LEFT"],
    ] as const) {
      const s = at(x, y, dir);
      const cap = capRect(usePrompt(s, 0)!);
      const player = { x: x - 8, y: y - 12, w: 16, h: 24 };
      expect(checkCollision(cap, counterRect)).toBe(false);
      expect(checkCollision(cap, player)).toBe(false);
    }
  });

  test("above the player's head, it stays over the floor (24..136) when the player is near a side wall", () => {
    for (const [counterX, playerX, want] of [
      [24, 30, 24],
      [96, 130, 136 - keyWidth("SPACE")],
    ] as const) {
      const s = at(playerX, 94, "DOWN");
      s.counter = { ...counterRect, x: counterX };
      expect(useTarget(s)).toBe("counter");
      expect(usePrompt(s, 0)!.x).toBe(want);
    }
  });

  test("does not show next to the counter facing away, or one pixel short of it", () => {
    for (const [x, y, dir] of [
      [80, 94, "UP"],
      [80, 94, "LEFT"],
      [52, 108, "LEFT"],
      [52, 108, "DOWN"],
      [108, 108, "RIGHT"],
      [80, 93, "DOWN"],
      [51, 108, "RIGHT"],
      [109, 108, "LEFT"],
      [52, 94, "DOWN"],
    ] as const) {
      expect(usePrompt(at(x, y, dir), 0)).toBeNull();
    }
  });

  test("does not show at the start position", () => {
    expect(usePrompt(newState(null, fakeFactory), 0)).toBeNull();
  });

  test("bobs up 1 px for every other stretch of usePromptBobTicks ticks", () => {
    const s = at(80, 60, "UP");
    const y = (tick: number) => usePrompt(s, tick)!.y;
    expect([y(0), y(usePromptBobTicks - 1), y(usePromptBobTicks), y(2 * usePromptBobTicks - 1), y(2 * usePromptBobTicks)]).toEqual([
      y(0),
      y(0),
      y(0) - 1,
      y(0) - 1,
      y(0),
    ]);
  });

  test("everywhere on the floor, it shows exactly where Space would use something", () => {
    let shown = 0;
    for (let y = 60; y <= 108; y++) {
      for (let x = 32; x <= 128; x++) {
        for (const dir of directions) {
          const s = at(x, y, dir);
          if (s.player.y + 12 > counterRect.y && s.player.x + 8 > counterRect.x && s.player.x - 8 < counterRect.x + counterRect.w) continue; // inside the counter
          const prompt = usePrompt(s, 0) !== null;
          update(s, input({ space: true }));
          const used = s.loadedSoftware !== null || s.counterOpened;
          if (prompt !== used) throw new Error(`prompt ${prompt} but Space ${used ? "uses" : "does nothing"} at (${x}, ${y}) facing ${dir}`);
          if (prompt) shown++;
        }
      }
    }
    expect(shown).toBeGreaterThan(0);
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
