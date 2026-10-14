import { afterEach, describe, expect, test } from "bun:test";
import {
  imageCabinetBrassMonkey,
  imageConveyorFloor,
  imageGirderFloor,
  imageGnome,
  imageMonkey,
  imageWall,
} from "../engine/assets.ts";
import { addSoundListener, type SoundEvent } from "../engine/audio.ts";
import type { Sprite } from "../engine/image.ts";
import { NO_INPUT, type Input } from "../engine/input.ts";
import * as rng from "../engine/rng.ts";
import { stubSurface } from "../engine/fakeCanvas.testutil.ts";
import { Game } from "../game/game.ts";
import { expectDrawnOnScreen, screenPaints } from "../ui/cabinet.testutil.ts";
import { ticketsFor } from "../game/payout.ts";
import { brassMonkeySnapshot } from "../game/snapshot.testutil.ts";
import { isFixedViewport } from "../game/software.ts";
import { BrassMonkeySoftware } from "./game.ts";
import { createBrassMonkey } from "./index.ts";
import * as t from "./tuning.ts";

const held = (i: Partial<Input>): Input => ({ ...NO_INPUT, ...i });

/** A run with no hazards coming. */
function quiet(highScore = 0): BrassMonkeySoftware {
  const g = new BrassMonkeySoftware(highScore);
  g.run.gearTimer = Infinity;
  g.run.emberTimer = Infinity;
  return g;
}

interface DrawCall {
  sprite: Sprite;
  x: number;
  y: number;
}

function record(g: BrassMonkeySoftware): { calls: DrawCall[]; fills: number } {
  const calls: DrawCall[] = [];
  let fills = 0;
  g.draw(
    stubSurface({
      draw: (sprite, x, y) => {
        calls.push({ sprite, x, y });
      },
      fillRect: () => {
        fills++;
      },
    }),
    0,
  );
  return { calls, fills };
}

const unsubscribe: (() => void)[] = [];
afterEach(() => {
  for (const u of unsubscribe.splice(0)) u();
});

describe("BrassMonkeySoftware", () => {
  test("is the brassMonkey software in its cabinet", () => {
    const g = createBrassMonkey();
    expect(g.name).toBe("brassMonkey");
    expect(isFixedViewport(g) && g.fixedViewportSize()).toEqual([240, 304]);
  });

  test("score() and gameOver() are the run's", () => {
    const g = quiet();
    g.run.score = 700;
    expect([g.score(), g.gameOver()]).toEqual([700, false]);
    g.run.phase = "over";
    expect(g.gameOver()).toBe(true);
  });

  test("the high score starts from the hub's and follows the score past it", () => {
    const g = quiet(500);
    g.update(NO_INPUT);
    expect(brassMonkeySnapshot(g.snapshot()).highScore).toBe(500);
    g.run.score = 800;
    g.update(NO_INPUT);
    expect(brassMonkeySnapshot(g.snapshot()).highScore).toBe(800);
  });

  test("the background is the floor being played", () => {
    const g = quiet();
    expect(g.background()).toBe(imageGirderFloor);
    g.run.floor = 1;
    expect(g.background()).toBe(imageConveyorFloor);
  });

  test("plays the run's sounds", () => {
    const events: SoundEvent[] = [];
    unsubscribe.push(addSoundListener((e) => void events.push(e)));
    const g = quiet();
    g.update(held({ space: true }));
    expect(events).toEqual(["rewind:monkeyJump", "play:monkeyJump"]);
  });

  test("the snapshot holds the monkey, the floor, lives, score and bonus", () => {
    const g = quiet();
    g.update(held({ right: true }));
    expect(brassMonkeySnapshot(g.snapshot())).toMatchObject({
      phase: "play",
      floor: 0,
      loop: 0,
      lives: 3,
      score: 0,
      bonus: 5000,
      x: 17,
      y: 248,
      footing: "ground",
      moving: true,
      hazards: [],
      bolts: [false, false, false, false],
    });
  });
});

describe("draw", () => {
  test("only the cabinet draws outside the 224x288 screen; everything else is clipped to it", () => {
    const paints = screenPaints((screen) => {
      new BrassMonkeySoftware().draw(screen, 0);
    });
    expectDrawnOnScreen(paints, imageCabinetBrassMonkey);
  });

  test("fills the screen: a band of wall for the scores, then the floor under it, no black bands", () => {
    const g = quiet();
    const { calls, fills } = record(g);
    expect(fills).toBe(0);
    expect(calls[0]?.sprite.asset).toBe(imageCabinetBrassMonkey.asset);
    const walls = calls.filter((c) => c.sprite === imageWall);
    expect(walls.map((c) => [c.x, c.y])).toEqual([0, 32, 64, 96, 128, 160, 192].map((x) => [8 + x, 8]));
    expect(calls.find((c) => c.sprite === imageGirderFloor)).toMatchObject({ x: 8, y: 40 });
  });

  test("the Gnome raises its arms just before it sends a hazard", () => {
    const g = quiet();
    const gnome = (): number => record(g).calls.find((c) => c.sprite.asset === imageGnome.asset)?.sprite.sx ?? -1;
    expect(gnome()).toBe(0);
    g.run.gearTimer = t.throwTicks;
    expect(gnome()).toBe(32);
  });

  test("the monkey stands on its girder; jumping shows the jump frame", () => {
    const g = quiet();
    const monkey = (): DrawCall | undefined =>
      record(g).calls.find((c) => c.sprite.asset === imageMonkey.asset && c.sprite.h === 16 && c.y > 100);
    expect(monkey()).toMatchObject({ x: 8 + 16 - 8, y: 40 + 248 - 16 });
    g.update(held({ space: true }));
    expect(monkey()?.sprite.sx).toBe(3 * 16);
  });

  test("the escaped scene draws daylight", () => {
    const g = quiet();
    g.run.phase = "escape";
    g.run.phaseTicks = t.escapeTicks;
    expect(record(g).fills).toBeGreaterThan(0);
  });
});

describe("in the arcade", () => {
  test("a run played to game over opens the payout, which pays its score in tickets", () => {
    rng.seed(3);
    const game = new Game(null);
    try {
      const step = (n: number, i: Partial<Input> = {}): void => {
        for (let k = 0; k < n; k++) game.step(held(i));
      };
      // Walk to the Brass Monkey cabinet and put in a token.
      step(31, { up: true });
      step(40, { left: true });
      game.step(held({ up: true, space: true }));
      expect(game.snapshot()).toMatchObject({ software: "brassMonkey" });
      // Jump on the spot, over and over, until the last life is gone.
      for (let n = 0; n < 2000 && game.snapshot().menu !== "payout"; n++) {
        step(1, { space: true });
        step(33);
      }
      const { payout } = game.snapshot();
      expect(payout?.score).toBeGreaterThan(0);
      expect(payout?.total).toBe(ticketsFor(payout?.score ?? 0, false));
    } finally {
      game.dispose();
    }
  });
});
