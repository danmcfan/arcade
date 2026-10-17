import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import {
  imageCabinetBrassMonkey,
  imageConveyorFloor,
  imageElevatorFloor,
  imageLift,
  imageSpring,
  imageGirderFloor,
  imageFont,
  imagePan,
  imageFurnace,
  imageGear,
  imageGnome,
  imageHud,
  imageMonkey,
  imageRivet,
  imageRivetFloor,
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
import { BrassMonkeySoftware, deathColumn, gnomeColumn } from "./game.ts";
import type { Hazard } from "./play.ts";
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
  g.run.startFloor(); // past the intro
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
    g.run.floor = 2;
    expect(g.background()).toBe(imageElevatorFloor);
    g.run.floor = 3;
    expect(g.background()).toBe(imageRivetFloor);
  });

  test("the rivet floor draws each rivet in its slot until it is pulled", () => {
    const g = quiet();
    g.run.floor = 3;
    g.run.startFloor();
    const rivets = (): DrawCall[] => record(g).calls.filter((c) => c.sprite.asset === imageRivet.asset);
    expect(rivets().length).toBe(8);
    expect(rivets()[0]).toMatchObject({ x: 8 + 48, y: 40 + 208 });
    g.run.rivets[0] = true;
    expect(rivets().length).toBe(7);
    expect(brassMonkeySnapshot(g.snapshot()).rivets.filter(Boolean).length).toBe(1);
  });

  test("as a floor clears the Gnome climbs up out of sight, its y in the snapshot rising", () => {
    // Loop 0's girder floor, cleared as a player does: walking into its door.
    const g = quiet();
    const { door } = g.run.currentFloor();
    if (door === undefined) throw new Error("the first floor has no door");
    expect([g.run.floor, g.run.finalClear()]).toEqual([0, false]);
    g.run.monkey.x = door.x - 4;
    g.run.monkey.y = door.y;
    const snap = (): ReturnType<typeof brassMonkeySnapshot> => brassMonkeySnapshot(g.snapshot());
    for (let n = 0; n < 16 && snap().phase === "play"; n++) g.update(held({ right: true }));
    expect(snap().phase).toBe("clear");
    const ys: number[] = [];
    while (snap().phase === "clear" && ys.length <= t.clearTicks) {
      ys.push(snap().gnomeY);
      g.update(NO_INPUT);
    }
    expect(ys).toHaveLength(t.clearTicks);
    expect(ys.every((y, n) => n === 0 || y <= (ys[n - 1] ?? 0))).toBe(true);
    expect(ys.at(-1)).toBe(-32);
  });

  test("when the loop's last floor clears, the Gnome falls to the bottom girder before the escape", () => {
    const g = quiet();
    // Stage 1 is loop 0's last floor, the rivet floor.
    g.run.jumpTo(1);
    const gnomeY = (): number => record(g).calls.find((c) => c.sprite.asset === imageGnome.asset)?.y ?? -1;
    expect(gnomeY()).toBe(40 + 56);
    g.run.phase = "clear";
    g.run.phaseTicks = t.clearTicks;
    const ys = [gnomeY()];
    for (let n = 0; n < t.clearTicks - 1; n++) {
      g.run.phaseTicks--;
      ys.push(gnomeY());
    }
    expect(ys.every((y, n) => n === 0 || y >= (ys[n - 1] ?? 0))).toBe(true);
    expect(ys.at(-1)).toBe(40 + 248 - 32);
  });

  test("on the elevator floor the snapshot holds each lift platform's left edge and top", () => {
    const g = quiet();
    g.run.floor = 2;
    g.run.startFloor();
    g.update(NO_INPUT);
    expect(brassMonkeySnapshot(g.snapshot()).lifts).toEqual([
      { x: 40, y: 253.5 },
      { x: 40, y: 203.5 },
      { x: 40, y: 153.5 },
      { x: 152, y: 136.5 },
      { x: 152, y: 196.5 },
    ]);
  });

  test("a new run starts with the Gnome's intro, stomping with a sound, then plays", () => {
    const events: SoundEvent[] = [];
    unsubscribe.push(addSoundListener((e) => void events.push(e)));
    const g = new BrassMonkeySoftware();
    expect(brassMonkeySnapshot(g.snapshot()).phase).toBe("intro");
    for (let n = 0; n < t.introTicks; n++) g.update(held({ space: true }));
    expect(events.filter((e) => e === "play:monkeyStomp")).toHaveLength(t.introStomps.length);
    expect(brassMonkeySnapshot(g.snapshot()).phase).toBe("howHigh");
    expect(events).toContain("play:monkeyHowHigh");
    expect(words(g)).toEqual(["25M", "HOW HIGH CAN YOU GET?"]);
    for (let n = 0; n < t.howHighTicks; n++) g.update(NO_INPUT);
    expect(brassMonkeySnapshot(g.snapshot()).phase).toBe("play");
  });

  test("the Gnome reaches up as it climbs and as it hops to stomp, then stands idle", () => {
    const g = new BrassMonkeySoftware();
    g.run.gearTimer = Infinity;
    g.run.emberTimer = Infinity;
    const seen = new Set<number>();
    while (g.run.phase === "intro") {
      if (g.run.introGnomeRise() > 0 || g.run.introHop() > 0) seen.add(gnomeColumn(g.run));
      else expect(gnomeColumn(g.run)).toBe(0);
      g.update(NO_INPUT);
    }
    expect(seen).toEqual(new Set([0, 2]));
    expect(gnomeColumn(g.run)).toBe(0);
  });

  test("plays the run's sounds", () => {
    const events: SoundEvent[] = [];
    unsubscribe.push(addSoundListener((e) => void events.push(e)));
    const g = quiet();
    g.update(NO_INPUT);
    events.length = 0;
    g.update(held({ space: true }));
    expect(events).toEqual(["rewind:monkeyJump", "play:monkeyJump"]);
  });

  test("the floor's music starts with play and stops when the monkey dies, the floor clears or the run is over", () => {
    for (const phase of ["dying", "clear", "over"] as const) {
      const events: SoundEvent[] = [];
      const off = addSoundListener((e) => void events.push(e));
      const g = quiet();
      g.update(NO_INPUT);
      expect(events.slice(-2)).toEqual(["rewind:monkeyGirder", "play:monkeyGirder"]);
      events.length = 0;
      g.run.phase = phase;
      g.run.phaseTicks = 100;
      g.update(NO_INPUT);
      expect(events).toEqual(["pause:monkeyGirder"]);
      off();
    }
  });

  test("each floor has its own music", () => {
    const events: SoundEvent[] = [];
    const g = quiet();
    g.update(NO_INPUT);
    unsubscribe.push(addSoundListener((e) => void events.push(e)));
    g.run.floor = 1;
    g.update(NO_INPUT);
    expect(events.slice(0, 3)).toEqual(["pause:monkeyGirder", "rewind:monkeyConveyor", "play:monkeyConveyor"]);
  });

  test("plays the wrench music in place of the floor's while the wrench is held, then the floor's again", () => {
    const events: SoundEvent[] = [];
    unsubscribe.push(addSoundListener((e) => void events.push(e)));
    const g = holding();
    expect(events).toEqual(["rewind:monkeyWrench", "play:monkeyWrench"]);
    for (let n = 0; n < t.wrenchTicks; n++) g.update(NO_INPUT);
    expect(events.slice(2)).toEqual(["pause:monkeyWrench", "rewind:monkeyGirder", "play:monkeyGirder"]);
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
        hot: false,
        wild: false,
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

  test("the snapshot holds whether the furnace is lit and which gears are hot", () => {
    const g = quiet();
    g.run.hazards = [
      {
        kind: "gear",
        x: 100,
        y: 248,
        dir: 1,
        vy: 0,
        footing: "ground",
        ladder: null,
        climbDir: 1,
        scorableIn: 0,
        hot: true,
        wild: false,
      },
    ];
    expect(brassMonkeySnapshot(g.snapshot())).toMatchObject({ furnaceLit: false, hazards: [{ hot: true }] });
    g.run.furnaceLit = true;
    expect(brassMonkeySnapshot(g.snapshot()).furnaceLit).toBe(true);
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
      x: 25,
      y: 248,
      footing: "ground",
      moving: true,
      hazards: [],
      bolts: [false, false, false, false],
    });
  });
});

/** A spring in the air at x 100, row y. */
const springAt100 = (y: number): Hazard => ({
  kind: "spring",
  x: 100,
  y,
  dir: 1,
  vy: 1,
  footing: "air",
  ladder: null,
  climbDir: 1,
  scorableIn: 0,
  hot: false,
  wild: false,
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

  test("the elevator floor's lift platforms are drawn where they are, and a spring stretched in flight, squashed landing", () => {
    const g = quiet();
    g.run.floor = 2;
    g.run.startFloor();
    const lifts = record(g)
      .calls.filter((c) => c.sprite.asset === imageLift.asset)
      .map((c) => [c.x, c.y]);
    expect(lifts).toEqual(g.run.lifts().map((l) => [8 + l.x0, 8 + 32 + l.y]));
    const springAt = (): { col: number; x: number; y: number }[] =>
      record(g)
        .calls.filter((c) => c.sprite.asset === imageSpring.asset)
        .map((c) => ({ col: c.sprite.sx / 12, x: c.x, y: c.y }));
    g.run.hazards = [springAt100(70)];
    expect(springAt()).toEqual([{ col: 0, x: 8 + 94, y: 40 + 58 }]);
    g.run.hazards = [springAt100(87)];
    expect(springAt()).toEqual([{ col: 1, x: 8 + 94, y: 40 + 75 }]);
  });

  test("a pan is drawn from the pan sheet, its two frames alternating as it rides", () => {
    const g = quiet();
    g.run.floor = 1;
    g.run.startFloor();
    const ridden: Hazard = {
      kind: "pan",
      x: 96,
      y: 168,
      dir: 1,
      vy: 0,
      footing: "ground",
      ladder: null,
      climbDir: 1,
      scorableIn: 0,
      hot: false,
      wild: false,
    };
    g.run.hazards = [ridden];
    const pan = (): DrawCall | undefined => record(g).calls.find((c) => c.sprite.asset === imagePan.asset);
    expect(pan()).toMatchObject({ x: 8 + 96 - 6, y: 40 + 168 - 12, sprite: { sx: 0 } });
    ridden.x = 100;
    expect(pan()?.sprite.sx).toBe(12);
  });

  test("the girder floor's furnace stands at its bottom left, cold until a hot gear lights it, then flickering", () => {
    const g = quiet();
    const furnace = (): DrawCall | undefined => record(g).calls.find((c) => c.sprite.asset === imageFurnace.asset);
    expect(furnace()).toMatchObject({ x: 8 + 0, y: 40 + 248 - 24, sprite: { sx: 0 } });
    g.run.furnaceLit = true;
    const lit = new Set<number>();
    for (let n = 0; n < 16; n++) {
      g.update(NO_INPUT);
      lit.add(furnace()?.sprite.sx ?? -1);
    }
    expect([...lit].toSorted((a, b) => a - b)).toEqual([16, 32]);
  });

  test("the conveyor floor has no furnace", () => {
    const g = quiet();
    g.run.floor = 1;
    g.run.startFloor();
    expect(record(g).calls.some((c) => c.sprite.asset === imageFurnace.asset)).toBe(false);
  });

  test("a hot gear is drawn from the gear sheet's hot frames", () => {
    const g = quiet();
    g.run.hazards = [
      {
        kind: "gear",
        x: 100,
        y: 248,
        dir: -1,
        vy: 0,
        footing: "ground",
        ladder: null,
        climbDir: 1,
        scorableIn: 0,
        hot: true,
        wild: false,
      },
    ];
    const gear = record(g).calls.find((c) => c.sprite.asset === imageGear.asset);
    expect([24, 36]).toContain(gear?.sprite.sx ?? -1);
  });

  test("the monkey stands on its girder; jumping shows the jump frame", () => {
    const g = quiet();
    const monkey = (): DrawCall | undefined =>
      record(g).calls.find((c) => c.sprite.asset === imageMonkey.asset && c.sprite.h === 16 && c.y > 100);
    expect(monkey()).toMatchObject({ x: 8 + 24 - 8, y: 40 + 248 - 16 });
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

/**
 * The heights on each "How high can you get?" screen through one loop: the
 * first floor's (shown again as a life is lost), then each floor's after a
 * clear. Arcade Donkey Kong stacks one Kong per board climbed in the level,
 * 25 m each whatever the board: 25M, then 25M 50M before level 1's rivets,
 * up to 150M on level 5's six boards.
 */
function heightsThrough(loop: number): string[][] {
  const g = quiet();
  g.run.loop = loop;
  const shown: string[][] = [];
  const end = (phase: "dying" | "clear"): void => {
    g.run.phase = phase;
    g.run.phaseTicks = 1;
    g.update(NO_INPUT);
  };
  end("dying");
  while (brassMonkeySnapshot(g.snapshot()).phase === "howHigh") {
    shown.push(words(g).filter((w) => /^\d+M$/u.test(w)));
    for (let n = 0; n < t.howHighTicks; n++) g.update(NO_INPUT);
    end("clear");
  }
  return shown;
}

describe("how high can you get?", () => {
  test("the first loop's rivet floor shows 25M and 50M, as Donkey Kong's level 1", () => {
    expect(heightsThrough(0)).toEqual([["25M"], ["25M", "50M"]]);
  });

  test("the fifth loop climbs a board at a time to 150M, as Donkey Kong's level 5", () => {
    expect(heightsThrough(4)).toEqual([
      ["25M"],
      ["25M", "50M"],
      ["25M", "50M", "75M"],
      ["25M", "50M", "75M", "100M"],
      ["25M", "50M", "75M", "100M", "125M"],
      ["25M", "50M", "75M", "100M", "125M", "150M"],
    ]);
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
    for (let n = 0; n < t.howHighTicks; n++) g.update(NO_INPUT);
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

/** The death sheet's column `elapsed` ticks into losing a life. */
const deathAt = (elapsed: number): number => deathColumn(t.dyingTicks - elapsed);

describe("the monkey's death", () => {
  test("it spins a quarter turn every 6 ticks, twice round, then lies down", () => {
    expect([0, 5, 6, 12, 18, 24, 30, 36, 42, 47].map((n) => deathAt(n))).toEqual([0, 0, 1, 2, 3, 0, 1, 2, 3, 3]);
    expect(deathAt(48)).toBeGreaterThanOrEqual(4);
  });

  test("down, its smoke puffs between two frames every 8 ticks until the life is lost", () => {
    expect([48, 55, 56, 64, 72].map((n) => deathAt(n))).toEqual([4, 4, 5, 4, 5]);
    expect(deathColumn(1)).toBeGreaterThanOrEqual(4);
  });
});

describe("jumpTo", () => {
  test("starts loop `stage` (counted from 1) on the girder floor, at that loop's bonus", () => {
    const game = new BrassMonkeySoftware();
    game.jumpTo(2);
    expect([game.run.loop, game.run.floor, game.run.phase, game.run.bonus]).toEqual([1, 0, "play", 6000]);
  });
});
