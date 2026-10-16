import { describe, expect, test } from "bun:test";
import {
  imageCabinetFirefly,
  imageFirefly,
  imageFireflyBackground,
  imageFont,
  imageHit,
  imageMoth,
  imageOwl,
  imageOwlHurt,
  imageShot,
  imageSpark,
} from "../engine/assets.ts";
import type { Sprite } from "../engine/image.ts";
import { NO_INPUT } from "../engine/input.ts";
import { defined } from "../engine/defined.testutil.ts";
import { stubSurface } from "../engine/fakeCanvas.testutil.ts";
import { expectDrawnOnScreen, screenPaints } from "../ui/cabinet.testutil.ts";
import type { Enemy } from "./entity.ts";
import { drawTextCentered } from "../ui/text.ts";
import { FireflySoftware, newFireflySoftware, playerY } from "./game.ts";
import { hitEffectTicks, respawnTicks, stageIntroTicks } from "./rules.ts";

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

const rect = (s: Sprite): number[] => [s.sx, s.sy, s.w, s.h];
const of = (calls: DrawCall[], asset: Sprite): DrawCall[] => calls.filter((c) => c.sprite.asset === asset.asset);

/** The font calls `drawTextCentered` makes for `text` centred along the top row. */
function topRowCentered(text: string): DrawCall[] {
  const calls: DrawCall[] = [];
  drawTextCentered(stubSurface({ draw: (sprite, x, y) => void calls.push({ sprite, x, y }) }), text, 8 + 112, 8 + 4);
  return calls;
}

/** Whether every call in `want` is among `calls`. */
function includesAll(calls: DrawCall[], want: DrawCall[]): boolean {
  return want.every((w) =>
    calls.some((c) => c.x === w.x && c.y === w.y && rect(c.sprite).join() === rect(w.sprite).join()),
  );
}

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

  test("the score, spare lives and STAGE n are drawn while the stage opens", () => {
    const f = new FireflySoftware();
    const calls = drawCalls(f);
    expect(of(calls, imageFont).length).toBeGreaterThan(6); // "0" and "STAGE 1"
    // 2 spare fireflies along the top right, plus the one in play.
    expect(of(calls, imageFirefly).map((c) => [c.x, c.y])).toEqual([
      [112 + 8 - 8, 264 + 8 - 8],
      [8 + 224 - 18, 10],
      [8 + 224 - 36, 10],
    ]);
    f.stageTick = stageIntroTicks + 1;
    expect(of(drawCalls(f), imageFont).length).toBe(2); // the score "0" and the high score "0"
  });

  test("the high score the software was made with shows centred along the top row", () => {
    const f = newFireflySoftware(12340);
    f.stageTick = stageIntroTicks + 1;
    expect(includesAll(of(drawCalls(f), imageFont), topRowCentered("12340"))).toBe(true);
  });

  test("once the score passes the high score, the high score shown follows it", () => {
    const f = newFireflySoftware(12340);
    f.stageTick = stageIntroTicks + 1;
    f.points = 12500;
    const font = of(drawCalls(f), imageFont);
    expect(includesAll(font, topRowCentered("12500"))).toBe(true);
    expect(includesAll(font, topRowCentered("12340"))).toBe(false);
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
