import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import {
  imageCabinetBrassMonkey,
  imageConveyorFloor,
  imageGirderFloor,
  imageFont,
  imageGnome,
  imageHud,
  imageMonkey,
  imageWall,
  imageWrench,
  imageWrenchSwing,
} from "../engine/assets.ts";
import { addSoundListener, type SoundEvent } from "../engine/audio.ts";
import type { Sprite } from "../engine/image.ts";
import { NO_INPUT, type Input } from "../engine/input.ts";
import * as rng from "../engine/rng.ts";
import { FakeCanvas, canvasElement, stubSurface } from "../engine/fakeCanvas.testutil.ts";
import { setCanvasFactory } from "../engine/surface.ts";
import { Game } from "../game/game.ts";
import { expectDrawnOnScreen, screenPaints } from "../ui/cabinet.testutil.ts";
import { ticketsFor } from "../arcade/wallet.ts";
import { brassMonkeySnapshot } from "../game/snapshot.testutil.ts";
import { isFixedViewport } from "../game/software.ts";
import { BrassMonkeySoftware } from "./game.ts";
import { minigame } from "../game/minigames.ts";
import * as t from "./tuning.ts";
import { bandRows, cell, charset, sheetColumns } from "../ui/glyphs.ts";

const held = (i: Partial<Input>): Input => ({ ...NO_INPUT, ...i });

/** A quiet run with the monkey on the floor's first wrench, after the tick that picks it up. */
function holding(): BrassMonkeySoftware {
  const g = quiet();
  const [spot] = g.run.currentFloor().wrenches;
  g.run.monkey.x = spot?.x ?? 0;
  g.run.monkey.y = spot?.y ?? 0;
  g.update(NO_INPUT);
  return g;
}

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

function record(g: BrassMonkeySoftware): { calls: DrawCall[]; fills: number; dials: [number, number][] } {
  const calls: DrawCall[] = [];
  const dials: [number, number][] = [];
  let fills = 0;
  g.draw(
    stubSurface({
      draw: (sprite, x, y) => {
        calls.push({ sprite, x, y });
      },
      fillRect: () => {
        fills++;
      },
      drawSurface: (_src, x, y) => {
        dials.push([x, y]);
      },
    }),
    0,
  );
  return { calls, fills, dials };
}

/** The words drawn in the font, read back from the glyphs: one per run of glyphs on a line. */
function words(g: BrassMonkeySoftware): string[] {
  const glyphs = record(g)
    .calls.filter((c) => c.sprite.asset === imageFont.asset)
    .map((c) => {
      const row = Math.trunc(c.sprite.sy / cell) % bandRows;
      return Object.assign(c, { ch: charset[row * sheetColumns + Math.trunc(c.sprite.sx / cell)] ?? "?" });
    });
  const out: string[] = [];
  let prev: (DrawCall & { ch: string }) | undefined;
  for (const c of glyphs) {
    if (prev !== undefined && c.y === prev.y && c.x - prev.x < 10) out[out.length - 1] += c.ch;
    else out.push(c.ch);
    prev = c;
  }
  return out;
}

// The dials draw each digit through a scratch canvas.
beforeAll(() => {
  setCanvasFactory((w, h) => canvasElement(new FakeCanvas(w, h)));
});
afterAll(() => {
  setCanvasFactory(null);
});

const unsubscribe: (() => void)[] = [];
afterEach(() => {
  for (const u of unsubscribe.splice(0)) u();
});

describe("BrassMonkeySoftware", () => {
  test("is the brassMonkey software in its cabinet", () => {
    const g = minigame("brassMonkey").create({ highScore: 0, prizes: [] });
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

  test("plays the wrench music while the wrench is held, and stops it when it runs out", () => {
    const events: SoundEvent[] = [];
    unsubscribe.push(addSoundListener((e) => void events.push(e)));
    const g = holding();
    expect(events).toEqual(["rewind:monkeyWrench", "play:monkeyWrench"]);
    for (let n = 0; n < t.wrenchTicks; n++) g.update(NO_INPUT);
    expect(events.slice(2)).toEqual(["pause:monkeyWrench"]);
  });

  test("stops the wrench music when the monkey loses a life holding it", () => {
    const events: SoundEvent[] = [];
    const g = holding();
    unsubscribe.push(addSoundListener((e) => void events.push(e)));
    g.run.hazards = [
      {
        kind: "gear",
        x: g.run.monkey.x - 6,
        y: g.run.monkey.y,
        dir: 1,
        vy: 0,
        footing: "ground",
        ladder: null,
        climbDir: 1,
        scorableIn: 0,
      },
    ];
    g.update(NO_INPUT);
    expect(events).toContain("pause:monkeyWrench");
  });

  test("the snapshot holds the wrench's ticks, the wrenches picked up and the smashes showing", () => {
    const g = holding();
    expect(brassMonkeySnapshot(g.snapshot())).toMatchObject({
      wrench: t.wrenchTicks,
      wrenches: [true, false],
      smashes: [],
    });
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

  test("a wrench stands on the floor until it is picked up, then the monkey swings it up and down", () => {
    const g = quiet();
    const [spot] = g.run.currentFloor().wrenches;
    const at = (sprite: Sprite): DrawCall[] => record(g).calls.filter((c) => c.sprite.asset === sprite.asset);
    expect(at(imageWrench).map((c) => [c.x, c.y])).toContainEqual([8 + (spot?.x ?? 0) - 4, 40 + (spot?.y ?? 0) - 14]);
    g.run.monkey.x = spot?.x ?? 0;
    g.run.monkey.y = spot?.y ?? 0;
    g.update(NO_INPUT);
    const swings = new Set<string>();
    for (let n = 0; n < 16; n++) {
      g.update(NO_INPUT);
      swings.add(`${at(imageWrench).length}/${at(imageWrenchSwing).length}`);
    }
    expect([...swings].toSorted()).toEqual(["1/1", "2/0"]);
  });

  test("the wrench flashes in its last ticks", () => {
    const g = holding();
    g.run.monkey.wrench = t.wrenchFlashTicks;
    const drawn = new Set<number>();
    for (let n = 0; n < 16; n++) {
      g.update(NO_INPUT);
      drawn.add(
        record(g).calls.filter((c) => c.sprite.asset === imageWrench.asset || c.sprite.asset === imageWrenchSwing.asset)
          .length,
      );
    }
    expect(drawn.has(1)).toBe(true);
    expect(drawn.size).toBeGreaterThan(1);
  });

  test("a smash shows its points where the hazard was", () => {
    const g = holding();
    g.run.smashes = [{ x: 100, y: 200, points: 800, ticks: 10 }];
    expect(words(g)).toContain("800");
  });

  test("the escaped scene draws daylight", () => {
    const g = quiet();
    g.run.phase = "escape";
    g.run.phaseTicks = t.escapeTicks;
    expect(record(g).fills).toBeGreaterThan(0);
  });
});

/** Where hud.png's band `band` is drawn: [x, y, width]. */
const label = (g: BrassMonkeySoftware, band: number): number[][] =>
  record(g)
    .calls.filter((c) => c.sprite.asset === imageHud.asset && c.sprite.sy === band * 8)
    .map((c) => [c.x, c.y, c.sprite.w]);

describe("the HUD, in Sweet Sam's style", () => {
  test("1UP and HIGH SCORE stand where Sweet Sam's maze has them, BONUS at the right", () => {
    const g = quiet();
    expect(label(g, 0)).toEqual([[8 + 26, 8, 126]]);
    expect(label(g, 1)).toEqual([[8 + 168, 8, 40]]);
  });

  test("score, high score and bonus are dials on Sweet Sam's second row: 00, 00 and 5000", () => {
    const { dials } = record(quiet());
    const row = dials.filter(([, y]) => y === 16).map(([x]) => x);
    expect(row).toEqual([48, 56, 128, 136, 184, 192, 200, 208]);
  });

  test("the high score's dial shows the hub's high score from the start", () => {
    const { dials } = record(quiet(1234));
    expect(dials.filter(([x, y]) => y === 16 && x >= 88 && x < 136 + 8).map(([x]) => x)).toEqual([112, 120, 128, 136]);
  });

  test("the score's dial rolls to the new score", () => {
    const g = quiet();
    g.run.score = 100;
    g.update(NO_INPUT);
    const { dials } = record(g);
    expect(dials.filter(([x, y]) => y === 16 && x < 64).map(([x]) => x)).toEqual([40, 48, 56]);
  });

  test("spare lives are monkey icons in Sweet Sam's spacing, under the score", () => {
    const g = quiet();
    const lives = (): number[][] =>
      record(g)
        .calls.filter((c) => c.sprite.asset === imageMonkey.asset && c.y === 8 + 16)
        .map((c) => [c.x, c.sprite.sx]);
    expect(lives()).toEqual([
      [24, 0],
      [40, 0],
    ]);
    g.run.lives = 1;
    expect(lives()).toEqual([]);
  });

  test("LOOP and its number sit at the right of the band, under the bonus", () => {
    const g = quiet();
    expect(label(g, 2)).toEqual([[8 + 168, 8 + 20, 32]]);
    expect(record(g).dials.filter(([, y]) => y === 28)).toEqual([[208, 28]]);
  });

  test("the HUD is drawn in the band, not as text", () => {
    expect(words(quiet())).toEqual([]);
  });
});

describe("the loop", () => {
  test("the escaped scene shows the lap coming next", () => {
    const g = quiet();
    g.run.phase = "escape";
    g.run.phaseTicks = t.escapeTicks;
    expect(words(g)).toContain("ESCAPED!");
    expect(words(g)).toContain("LOOP 2");
  });

  test("a new lap opens with its number in the middle of the floor, then it goes", () => {
    const g = quiet();
    g.run.phase = "escape";
    g.run.phaseTicks = 1;
    g.update(NO_INPUT);
    expect(g.run.loop).toBe(1);
    expect(words(g)).toEqual(["LOOP 2"]);
    for (let n = 0; n < t.lapBannerTicks; n++) g.update(NO_INPUT);
    expect(words(g)).toEqual([]);
  });

  test("the first lap opens without a banner", () => {
    expect(words(quiet())).toEqual([]);
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
      expect(payout?.total).toBe(ticketsFor(payout?.score ?? 0));
    } finally {
      game.dispose();
    }
  });
});

describe("jumpTo", () => {
  test("starts loop `stage` (counted from 1) on the girder floor, at that loop's bonus", () => {
    const game = new BrassMonkeySoftware();
    game.jumpTo(2);
    expect([game.run.loop, game.run.floor, game.run.phase, game.run.bonus]).toEqual([1, 0, "play", 6000]);
  });
});
