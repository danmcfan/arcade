import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { sounds as soundTable } from "../engine/assets.ts";
import { addSoundListener, type SoundEvent } from "../engine/audio.ts";
import { makeSolid, type Sprite } from "../engine/image.ts";
import { MenuKeys, NO_INPUT, type Input } from "../engine/input.ts";
import { Wallet, type RunKind } from "../arcade/wallet.ts";
import { MinigameRun } from "./minigameRun.ts";
import { fakeBrassMonkeySnapshot } from "./snapshot.testutil.ts";
import type { SoftwareSnapshot } from "./snapshot.ts";
import type { Software } from "./software.ts";

class FakeSoftware implements Software {
  readonly name = "sweetSam";
  updates: Input[] = [];
  over = false;
  points = 0;
  background(): Sprite {
    return makeSolid(224, 288, "#000");
  }
  update(i: Input): void {
    this.updates.push(i);
  }
  draw(): void {}
  gameOver(): boolean {
    return this.over;
  }
  score(): number {
    return this.points;
  }
  snapshot(): SoftwareSnapshot {
    return { ...fakeBrassMonkeySnapshot, x: this.updates.length };
  }
}

function input(keys: Partial<Input> = {}): Input {
  return { ...NO_INPUT, ...keys };
}

interface Harness {
  run: MinigameRun;
  sw: FakeSoftware;
  wallet: Wallet;
  keys: MenuKeys;
  /** Feeds one tick through the keys, as the Game does; true when the run is over. */
  step: (keys?: Partial<Input>) => boolean;
  tap: (key: keyof Input) => boolean;
}

function newRun(kind: RunKind = "paid", wallet = new Wallet()): Harness {
  const sw = new FakeSoftware();
  const keys = new MenuKeys();
  const run = new MinigameRun(sw, kind, wallet, keys);
  const step = (k: Partial<Input> = {}): boolean => {
    const raw = input(k);
    const { edges } = keys.read(raw);
    return run.update(raw, keys.unmasked(raw), edges);
  };
  const tap = (key: keyof Input): boolean => step({ [key]: true }) || step();
  return { run, sw, wallet, keys, step, tap };
}

/** A paid run that ended with `points` on its first tick. */
function ended(points: number, kind: RunKind = "paid"): Harness {
  const h = newRun(kind);
  h.sw.points = points;
  h.sw.over = true;
  h.step();
  return h;
}

let heard: SoundEvent[] = [];
let unsubscribe: () => void = () => {};
beforeEach(() => {
  heard = [];
  unsubscribe = addSoundListener((e) => {
    heard.push(e);
  });
});
afterEach(() => {
  unsubscribe();
});

describe("playing", () => {
  test("a run plays its software with no menu", () => {
    const { run, sw, step } = newRun();
    expect(step({ left: true })).toBe(false);
    expect(sw.updates).toEqual([input({ left: true })]);
    expect(run.snapshot()).toEqual({
      run: "paid",
      menu: null,
      cursor: 0,
      payout: null,
      sw: { ...fakeBrassMonkeySnapshot, x: 1 },
    });
  });

  test("a direct run that ends is over at once: high score kept, no payout", () => {
    const { run, wallet, step, sw } = newRun("direct");
    sw.points = 500;
    sw.over = true;
    expect(step()).toBe(true);
    expect(run.snapshot().payout).toBeNull();
    expect([wallet.highScore, wallet.tickets, wallet.tokens]).toEqual([500, 0, 5]);
  });
});

describe("minigame pause menu", () => {
  test("Esc opens it: no update that tick, the minigame sounds pause", () => {
    const { run, sw, step } = newRun();
    step();
    heard = [];
    expect(step({ escape: true, left: true })).toBe(false);
    expect(sw.updates).toHaveLength(1);
    expect(run.snapshot()).toMatchObject({ menu: "paused", cursor: 0 });
    expect(heard.slice(0, 2)).toEqual(["rewind:select", "play:select"]);
    expect(heard.slice(2).every((e) => e.startsWith("pause:"))).toBe(true);
  });

  test("held Esc does not close it, and the minigame stands still", () => {
    const { run, sw, step } = newRun();
    for (let t = 0; t < 30; t++) step({ escape: true });
    for (let t = 0; t < 30; t++) step({ left: true });
    expect(run.menu).toBe("paused");
    expect(sw.updates).toHaveLength(0);
  });

  test("Up and Down move the cursor with the move blip, wrapping", () => {
    const { run, tap } = newRun();
    tap("escape");
    heard = [];
    tap("down");
    expect(heard).toEqual(["rewind:move", "play:move"]);
    expect(run.cursor).toBe(1);
    tap("down");
    tap("down");
    expect(run.cursor).toBe(0);
    tap("up");
    expect(run.cursor).toBe(2);
  });

  test("Space on Resume carries on; the held Space is hidden until released", () => {
    const { run, sw, step, tap } = newRun();
    tap("escape");
    step({ space: true });
    expect(run.menu).toBeNull();
    expect(sw.updates).toHaveLength(0);
    step({ space: true, left: true });
    expect(sw.updates).toEqual([input({ left: true })]);
    step();
    step({ space: true });
    expect(sw.updates[2]).toEqual(input({ space: true }));
  });

  test("a second Esc resumes too", () => {
    const { run, tap } = newRun();
    tap("escape");
    tap("escape");
    expect(run.menu).toBeNull();
  });

  test("Resume restarts only the minigame sounds that were playing", () => {
    const { tap } = newRun();
    const fakeElement = { paused: false };
    if (!standsInForAudio(fakeElement)) throw new Error("fake element lacks paused");
    soundTable.sweetBee.element = fakeElement;
    try {
      tap("escape");
      heard = [];
      tap("escape");
      expect(heard).toEqual(["rewind:select", "play:select", "play:sweetBee"]);
    } finally {
      soundTable.sweetBee.element = null;
    }
  });

  test("Controls shows the controls, keeping the cursor; Esc backs out to the menu, Space does not", () => {
    const { run, tap } = newRun();
    tap("escape");
    tap("down");
    tap("space");
    expect([run.menu, run.cursor]).toEqual(["controls", 1]);
    tap("escape");
    expect([run.menu, run.cursor]).toEqual(["paused", 1]);
    tap("space");
    expect(run.menu).toBe("controls");
    tap("space");
    expect(run.menu).toBe("controls");
    tap("escape");
    expect(run.menu).toBe("paused");
  });

  test("Quit game ends the run: no tickets, no high score, and the held Space is hidden", () => {
    const { wallet, sw, step, tap, keys } = newRun();
    sw.points = 900;
    tap("escape");
    tap("down");
    tap("down");
    expect(step({ space: true })).toBe(true);
    expect([wallet.tickets, wallet.highScore]).toEqual([0, 0]);
    expect(keys.unmasked(input({ space: true })).space).toBe(false);
  });
});

describe("payout", () => {
  test("a paid run ending with 1420 opens the payout and settles 14 tickets at once", () => {
    const { run, wallet, sw, step } = ended(1420);
    expect(run.snapshot()).toMatchObject({
      run: "paid",
      menu: "payout",
      payout: { score: 1420, tickets: 0, total: 14, freePlay: false, counting: true },
    });
    expect([wallet.highScore, wallet.tickets]).toEqual([1420, 14]);
    heard = [];
    for (let t = 0; t < 14 * 20 + 40; t++) expect(step()).toBe(false);
    expect(heard.filter((e) => e === "play:ticket")).toHaveLength(14);
    expect(run.snapshot().payout).toEqual({ score: 0, tickets: 14, total: 14, freePlay: false, counting: false });
    expect(sw.updates).toHaveLength(1); // never updated after the game over
  });

  test("Space skips to the totals, Space again ends the run and hides the held Space", () => {
    const { run, tap, step, keys } = ended(1420);
    tap("space");
    expect(run.snapshot().payout).toMatchObject({ score: 0, tickets: 14, counting: false });
    expect(step({ space: true, up: true })).toBe(true);
    expect(keys.unmasked(input({ space: true })).space).toBe(false);
  });

  test("free play shows the score, adds no tickets, and one Space ends it", () => {
    const { run, wallet, tap } = ended(1420, "free");
    expect(run.snapshot()).toMatchObject({
      run: "free",
      payout: { score: 1420, tickets: 0, total: 0, freePlay: true, counting: false },
    });
    expect(wallet.tickets).toBe(0);
    expect(tap("space")).toBe(true);
  });

  test("Esc does nothing in the payout", () => {
    const { run, tap } = ended(1420);
    tap("escape");
    expect(run.menu).toBe("payout");
  });
});

/** Lets a bare `{ paused }` stand in for the DOM audio element; Sound only reads `paused` here. */
function standsInForAudio(x: object): x is HTMLAudioElement {
  return "paused" in x;
}
