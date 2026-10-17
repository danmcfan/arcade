import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  imageCaptive,
  imageCabinetFirefly,
  imageFirefly,
  imageFireflyBackground,
  imageFont,
  imageHit,
  imageMoth,
  imageOwl,
  imageOwlHurt,
  imageScoreLabels,
  imageShot,
  imageSpark,
} from "../engine/assets.ts";
import type { Sprite } from "../engine/image.ts";
import { NO_INPUT } from "../engine/input.ts";
import { defined } from "../engine/defined.testutil.ts";
import { FakeCanvas, canvasElement, stubSurface } from "../engine/fakeCanvas.testutil.ts";
import { setCanvasFactory } from "../engine/surface.ts";
import { expectDrawnOnScreen, screenPaints } from "../ui/cabinet.testutil.ts";
import type { Enemy } from "./entity.ts";
import { captiveColours } from "./art.ts";
import { FireflySoftware, beamY, newFireflySoftware, playerY } from "./game.ts";
import { beamWidth, hitEffectTicks, respawnTicks, stageIntroTicks } from "./rules.ts";

// The score dials draw each digit through an offscreen cell, so give it a canvas.
beforeAll(() => {
  setCanvasFactory((w, h) => canvasElement(new FakeCanvas(w, h)));
});
afterAll(() => {
  setCanvasFactory(null);
});

interface DrawCall {
  sprite: Sprite;
  x: number;
  y: number;
}

/** Firefly is a FixedViewport: drawn with buffer 0, the playfield at the cabinet insets (8, 8). */
function drawCalls(f: FireflySoftware): DrawCall[] {
  const calls: DrawCall[] = [];
  const fake = stubSurface({
    draw: (sprite, x, y) => {
      calls.push({ sprite, x, y });
    },
  });
  f.draw(fake, 0);
  return calls;
}

/** Where each score or high score dial cell lands on the screen, in draw order. */
function dialCells(f: FireflySoftware): number[][] {
  const cells: number[][] = [];
  f.draw(stubSurface({ draw: () => {}, drawSurface: (_src, x, y) => void cells.push([x, y]) }), 0);
  return cells;
}

const rect = (s: Sprite): number[] => [s.sx, s.sy, s.w, s.h];
const of = (calls: DrawCall[], asset: Sprite): DrawCall[] => calls.filter((c) => c.sprite.asset === asset.asset);

/** A software past its intro whose only enemy is `kind`, at (x, y). */
function onlyEnemy(kind: Enemy["kind"], x: number, y: number): { f: FireflySoftware; e: Enemy } {
  const f = new FireflySoftware();
  f.stageTick = stageIntroTicks + 1;
  const e = defined(f.enemies.find((en) => en.kind === kind));
  Object.assign(e, { state: "formation", x, y, dx: 0, dy: 1 });
  f.enemies = [e];
  return { f, e };
}

describe("firefly draw", () => {
  test("only the cabinet draws outside the 224x288 screen, so an enemy off its edge is cut off", () => {
    const { f } = onlyEnemy("owl", -12, 300);
    const paints = screenPaints((screen) => {
      f.draw(screen, 0);
    });
    expectDrawnOnScreen(paints, imageCabinetFirefly);
    expect(paints.filter((p) => p.sprite?.asset === imageOwl.asset && p.clip !== null)).toHaveLength(1);
  });

  test("the cabinet at 0,0, the night sky inside the insets, then the firefly centred on its position", () => {
    const [cabinet, sky, ...rest] = drawCalls(new FireflySoftware());
    expect(cabinet?.sprite.asset).toBe(imageCabinetFirefly.asset);
    expect(cabinet && [rect(cabinet.sprite), cabinet.x, cabinet.y]).toEqual([[0, 0, 240, 304], 0, 0]);
    expect(sky).toEqual({ sprite: imageFireflyBackground, x: 8, y: 8 });
    expect(rest[0]).toEqual({ sprite: imageFirefly, x: 112 + 8 - 8, y: 264 + 8 - 8 });
  });

  test("waiting enemies are not drawn; the cabinet outline is one image whatever the input", () => {
    const f = new FireflySoftware();
    f.update({ ...NO_INPUT, left: true });
    const calls = drawCalls(f);
    expect(rect(defined(calls[0]).sprite)).toEqual([0, 0, 240, 304]);
    expect(of(calls, imageMoth)).toEqual([]);
  });

  test("the HUD sits where Sweet Sam's does: 1UP / HIGH SCORE labels, score dials, spare lives along the bottom", () => {
    const f = new FireflySoftware();
    const calls = drawCalls(f);
    // The labels' left edge at x 26 of the screen's top row.
    expect(of(calls, imageScoreLabels).map((c) => [c.x, c.y])).toEqual([[8 + 26, 8]]);
    // A zero score and high score show their last two digits, on tile row 1 from tile columns 1 and 11.
    expect(dialCells(f)).toEqual([
      [8 + 8 * 5, 8 + 8],
      [8 + 8 * 6, 8 + 8],
      [8 + 8 * 15, 8 + 8],
      [8 + 8 * 16, 8 + 8],
    ]);
    // 2 spare fireflies at Sweet Sam's spare-lives spots, plus the one in play.
    expect(of(calls, imageFirefly).map((c) => [c.x, c.y])).toEqual([
      [112 + 8 - 8, 264 + 8 - 8],
      [8 + 16, 8 + 8 * 34 + 1],
      [8 + 32, 8 + 8 * 34 + 1],
    ]);
  });

  test("STAGE n is drawn in the pixel font only while the stage opens", () => {
    const f = new FireflySoftware();
    expect(of(drawCalls(f), imageFont).length).toBe("STAGE 1".length);
    f.stageTick = stageIntroTicks + 1;
    expect(of(drawCalls(f), imageFont)).toEqual([]);
  });

  test("an escort-kill bonus shows its points in the pixel font, centred where the Owl was shot", () => {
    const f = new FireflySoftware();
    f.stageTick = stageIntroTicks + 1;
    f.bonuses = [{ points: 1600, x: 100, y: 120, ticks: 10 }];
    const glyphs = of(drawCalls(f), imageFont);
    expect(glyphs.length).toBe(4);
    expect(glyphs.map((g) => g.y)).toEqual([8 + 116, 8 + 116, 8 + 116, 8 + 116]);
    expect(defined(glyphs[1]).x).toBeLessThan(8 + 100);
    expect(defined(glyphs[3]).x).toBeGreaterThan(8 + 100);
  });

  test("the high score the software was made with shows on the high score dials", () => {
    const f = newFireflySoftware(12340);
    // 1, 2, 3, 4, 0 in tile columns 12 to 16, after the score's 0 0.
    expect(dialCells(f).slice(2)).toEqual([12, 13, 14, 15, 16].map((col) => [8 + 8 * col, 8 + 8]));
  });

  test("once the score passes the high score, the high score dials roll to follow it", () => {
    const f = newFireflySoftware(5);
    f.stageTick = stageIntroTicks + 1;
    f.points = 12500;
    for (let i = 0; i < 60; i++) f.update(NO_INPUT);
    expect(f.dials.score.map((r) => r.settledDigit)).toEqual([0, 1, 2, 5, 0, 0]);
    expect(f.dials.high.map((r) => r.settledDigit)).toEqual([0, 1, 2, 5, 0, 0]);
  });

  test("an enemy in formation faces down: row 2 of its sheet, centred on it", () => {
    const { f } = onlyEnemy("moth", 100, 80);
    expect(of(drawCalls(f), imageMoth).map((c) => [rect(c.sprite), c.x, c.y])).toEqual([
      [[0, 32, 16, 16], 100 + 8 - 8, 80 + 8 - 8],
    ]);
  });

  test("an Owl is drawn from the hurt sheet after its first hit", () => {
    const { f, e } = onlyEnemy("owl", 100, 80);
    expect(of(drawCalls(f), imageOwl).length).toBe(1);
    e.hp = 1;
    const calls = drawCalls(f);
    expect(of(calls, imageOwl)).toEqual([]);
    expect(of(calls, imageOwlHurt).map((c) => [c.x, c.y])).toEqual([[100 + 8 - 8, 80 + 8 - 8]]);
  });

  test("a killed enemy shows the 5 frames of its hit effect, 15 ticks each", () => {
    const { f, e } = onlyEnemy("wasp", 100, 80);
    e.hp = 0;
    const frames = [hitEffectTicks, hitEffectTicks - 15, 16, 1].map((d) => {
      e.deadFrames = d;
      return of(drawCalls(f), imageHit).map((c) => [c.sprite.sx, c.x, c.y]);
    });
    expect(frames).toEqual([[[0, 92, 72]], [[32, 92, 72]], [[96, 92, 72]], [[128, 92, 72]]]);
  });

  test("sparks and enemy shots are drawn centred on their position", () => {
    const f = new FireflySoftware();
    f.sparks = [{ x: 50, y: 60 }];
    f.shots = [{ x: 70, y: 90, dx: 0, dy: 3 }];
    const calls = drawCalls(f);
    expect(of(calls, imageSpark)).toEqual([{ sprite: imageSpark, x: 50 + 8 - 4, y: 60 + 8 - 4 }]);
    expect(of(calls, imageShot)).toEqual([{ sprite: imageShot, x: 70 + 8 - 2, y: 90 + 8 - 4 }]);
  });

  test("after a lost life the firefly bursts in its place instead", () => {
    const f = new FireflySoftware();
    f.respawn = respawnTicks;
    const calls = drawCalls(f);
    expect(of(calls, imageHit).map((c) => [c.sprite.sx, c.x, c.y])).toEqual([[0, 112 + 8 - 16, 264 + 8 - 16]]);
    // Only the spare lives are left.
    expect(of(calls, imageFirefly).length).toBe(2);
  });

  test("after the last life the firefly is not drawn again", () => {
    const f = new FireflySoftware();
    f.enemies = [];
    f.lives = 0;
    f.respawn = 1;
    f.update(NO_INPUT);
    expect(f.over).toBe(true);
    expect(f.respawn).toBe(0);
    expect(of(drawCalls(f), imageFirefly)).toEqual([]);
  });

  test("a respawn with lives left draws the firefly at its start", () => {
    const f = new FireflySoftware();
    f.enemies = [];
    f.lives = 1;
    f.respawn = 1;
    f.update(NO_INPUT);
    expect(f.over).toBe(false);
    expect(of(drawCalls(f), imageFirefly)).toContainEqual({ sprite: imageFirefly, x: f.player.x, y: playerY });
  });
});

describe("firefly tractor beam", () => {
  test("a captured firefly does not burst; its captive is drawn red above the Owl", () => {
    const { f, e } = onlyEnemy("owl", 100, 60);
    f.respawn = respawnTicks;
    f.captured = true;
    f.captive = { owl: e, x: 100, y: 44, hostile: false };
    const calls = drawCalls(f);
    expect(of(calls, imageHit)).toEqual([]);
    expect(of(calls, imageCaptive).map((c) => [c.x, c.y])).toEqual([[100 + 8 - 8, 44 + 8 - 8]]);
    // Only the spare lives are left.
    expect(of(calls, imageFirefly).length).toBe(2);
  });

  test("the captive sprite is the firefly in reds: its greys, white, lime and yellow turn red, orange or purple", () => {
    expect(Object.keys(captiveColours).toSorted()).toEqual(["g", "l", "m", "w", "y"]);
    for (const to of Object.values(captiveColours)) expect(["r", "o", "p"]).toContain(to);
  });

  test("a beaming Owl shines its beam down to the firefly's row, beamWidth wide", () => {
    const { f, e } = onlyEnemy("owl", 100, beamY);
    e.state = "beaming";
    e.beamTicks = 100;
    const rects: number[][] = [];
    f.draw(stubSurface({ draw: () => {}, fillRect: (x, y, w, h) => void rects.push([x, y, w, h]) }), 0);
    expect(rects.length).toBeGreaterThan(0);
    expect(Math.min(...rects.map(([x]) => x ?? 0))).toBe(8 + 100 - beamWidth / 2);
    expect(Math.max(...rects.map(([x, , w]) => (x ?? 0) + (w ?? 0)))).toBe(8 + 100 + beamWidth / 2);
    expect(Math.max(...rects.map(([, y, , h]) => (y ?? 0) + (h ?? 0)))).toBe(8 + playerY + 8);
  });

  test("no beam once it is off", () => {
    const { f, e } = onlyEnemy("owl", 100, beamY);
    e.state = "beaming";
    e.beamTicks = 0;
    const rects: number[][] = [];
    f.draw(stubSurface({ draw: () => {}, fillRect: (x, y, w, h) => void rects.push([x, y, w, h]) }), 0);
    expect(rects).toEqual([]);
  });
});

describe("dual firefly", () => {
  test("draws two fireflies, 8px either side of the player's x", () => {
    const f = new FireflySoftware();
    f.enemies = [];
    f.dual = true;
    const xs = of(drawCalls(f), imageFirefly)
      .filter((c) => c.y === playerY)
      .map((c) => c.x);
    expect(xs).toEqual([f.player.x - 8, f.player.x + 8]);
  });

  test("a hostile captive, without its Owl, is still drawn red", () => {
    const f = new FireflySoftware();
    f.enemies = [];
    f.captive = { owl: null, x: 50, y: 120, hostile: true };
    expect(of(drawCalls(f), imageCaptive).map((c) => [c.x, c.y])).toEqual([[50, 120]]);
  });
});
