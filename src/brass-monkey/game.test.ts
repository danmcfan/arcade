import { describe, expect, test } from "bun:test";
import { imageCabinetBrassMonkey, imageGnome, imageMonkey, imageWorkshop } from "../engine/assets.ts";
import type { Sprite } from "../engine/image.ts";
import { NO_INPUT, type Input } from "../engine/input.ts";
import type { DrawOpts } from "../engine/surface.ts";
import { defined } from "../engine/defined.testutil.ts";
import { stubSurface } from "../engine/fakeCanvas.testutil.ts";
import type { BrassMonkeySnapshot } from "../game/snapshot.ts";
import { brassMonkeySnapshot } from "../game/snapshot.testutil.ts";
import { isFixedViewport } from "../game/software.ts";
import { createBrassMonkey } from "./index.ts";

const held = (i: Partial<Input>): Input => ({ ...NO_INPUT, ...i });
const snap = (g: ReturnType<typeof createBrassMonkey>): BrassMonkeySnapshot => brassMonkeySnapshot(g.snapshot());

describe("BrassMonkeySoftware", () => {
  test("is the brassMonkey software on the workshop background, never over, scoreless", () => {
    const g = createBrassMonkey();
    expect(g.name).toBe("brassMonkey");
    expect(g.background()).toBe(imageWorkshop);
    expect(g.gameOver()).toBe(false);
    expect(g.score()).toBe(0);
  });

  test("starts idle at (16, 240) facing right", () => {
    const g = createBrassMonkey();
    g.update(NO_INPUT);
    expect(snap(g)).toEqual({ x: 16, y: 240, frame: 0, left: false, moving: false, joystick: 0 });
  });

  test("walking moves 1 px per tick and advances the frame by 0.2", () => {
    const g = createBrassMonkey();
    g.update(held({ right: true }));
    expect(snap(g)).toEqual({ x: 17, y: 240, frame: 0.2, left: false, moving: true, joystick: 4 });
    g.update(held({ left: true }));
    expect(snap(g)).toMatchObject({ x: 16, left: true, moving: true });
    expect(snap(g).frame).toBeCloseTo(0.4, 12);
  });

  test("the frame wraps to 0 once it reaches 4", () => {
    const g = createBrassMonkey();
    const frames: number[] = [];
    for (let t = 0; t < 30; t++) {
      g.update(held({ right: true }));
      frames.push(snap(g).frame);
    }
    expect(Math.max(...frames)).toBeLessThan(4);
    expect(frames.slice(15).some((f) => f === 0)).toBe(true);
  });

  test("letting go resets the frame and stops", () => {
    const g = createBrassMonkey();
    g.update(held({ right: true }));
    g.update(held({ right: true }));
    g.update(NO_INPUT);
    expect(snap(g)).toEqual({ x: 18, y: 240, frame: 0, left: false, moving: false, joystick: 0 });
  });

  test("Up or Down alone walks in the current facing (direction priority masks Left/Right)", () => {
    const g = createBrassMonkey();
    g.update(held({ left: true }));
    g.update(held({ up: true, right: true }));
    expect(snap(g)).toMatchObject({ x: 14, left: true, moving: true });
  });

  test("x is clamped to [6, 108]", () => {
    const g = createBrassMonkey();
    for (let t = 0; t < 30; t++) g.update(held({ left: true }));
    expect(snap(g).x).toBe(6);
    for (let t = 0; t < 200; t++) g.update(held({ right: true }));
    expect(snap(g).x).toBe(108);
  });
});

describe("cabinet", () => {
  test("is a FixedViewport the size of the cabinet", () => {
    const g = createBrassMonkey();
    expect(isFixedViewport(g)).toBe(true);
    if (isFixedViewport(g)) expect(g.fixedViewportSize()).toEqual([336, 428]);
  });

  test("the snapshot's joystick follows the input: neutral, up, down, left, right", () => {
    const g = createBrassMonkey();
    expect(snap(g).joystick).toBe(0);
    const frames = [
      held({}),
      held({ up: true }),
      held({ down: true }),
      held({ left: true }),
      held({ right: true }),
    ].map((i) => {
      g.update(i);
      return snap(g).joystick;
    });
    expect(frames).toEqual([0, 1, 2, 3, 4]);
  });
});

interface DrawCall {
  sprite: Sprite;
  x: number;
  y: number;
  opts: DrawOpts | undefined;
}

type Fill = [x: number, y: number, w: number, h: number, css: string];

/** Brass Monkey is a FixedViewport: drawn with buffer 0. Returns sprite draws and, separately, fills. */
function record(
  g: ReturnType<typeof createBrassMonkey>,
  buffer = 0,
): { calls: DrawCall[]; fills: Fill[]; order: string[] } {
  const calls: DrawCall[] = [];
  const fills: Fill[] = [];
  const order: string[] = [];
  const fake = stubSurface({
    draw: (sprite, x, y, opts) => {
      calls.push({ sprite, x, y, opts });
      order.push("draw");
    },
    fillRect: (x, y, w, h, css) => {
      fills.push([x, y, w, h, css]);
      order.push("fill");
    },
  });
  g.draw(fake, buffer);
  return { calls, fills, order };
}

function drawCalls(g: ReturnType<typeof createBrassMonkey>): DrawCall[] {
  return record(g).calls;
}

const rect = (s: Sprite): number[] => [s.sx, s.sy, s.w, s.h];

describe("brassMonkey draw", () => {
  test("cabinet, 16 px workshop-dark bands above and below, workshop centred in the screen, the Gnome, then the monkey", () => {
    const g = createBrassMonkey();
    const { calls, fills, order } = record(g);
    expect(order).toEqual(["draw", "fill", "fill", "draw", "draw", "draw"]);
    const [cabinet, bg, gnome, monkey] = calls;
    expect(cabinet?.sprite.asset).toBe(imageCabinetBrassMonkey.asset);
    expect(cabinet && [rect(cabinet.sprite), cabinet.x, cabinet.y]).toEqual([[0, 0, 336, 428], 0, 0]);
    expect(fills).toEqual([
      [56, 56, 224, 16, "#040c06"],
      [56, 328, 224, 16, "#040c06"],
    ]);
    expect(bg).toEqual({ sprite: imageWorkshop, x: 56, y: 72, opts: undefined });
    expect(gnome?.sprite.asset).toBe(imageGnome.asset);
    expect(monkey?.sprite).toEqual({ asset: imageMonkey.asset, sx: 0, sy: 0, w: 16, h: 16 });
    expect(monkey?.x).toBe(16 + 56 - 8);
    expect(monkey?.y).toBe(240 + 72 - 8);
    expect(monkey?.opts?.flipX ?? false).toBe(false);
  });

  test("the Gnome stands still on the top girder in its idle frame", () => {
    const g = createBrassMonkey();
    const idle = { sprite: { asset: imageGnome.asset, sx: 0, sy: 0, w: 32, h: 32 }, x: 24 + 56, y: 52 + 72 };
    for (let t = 0; t < 10; t++) {
      g.update(held({ right: true }));
      const gnome = drawCalls(g)[2];
      expect(gnome && { sprite: gnome.sprite, x: gnome.x, y: gnome.y }).toEqual(idle);
    }
  });

  test("the cabinet shows the joystick frame of the last input", () => {
    const g = createBrassMonkey();
    g.update(held({ down: true }));
    expect(rect(defined(drawCalls(g)[0]).sprite)).toEqual([2 * 336, 0, 336, 428]);
  });

  test("frames 0,1,2,3 map to sheet columns 0,1,0,2", () => {
    const g = createBrassMonkey();
    const columns: number[] = [];
    let lastFrame = -1;
    for (let t = 0; t < 20; t++) {
      g.update(held({ right: true }));
      const frame = Math.trunc(snap(g).frame);
      if (frame !== lastFrame) {
        columns.push((drawCalls(g)[3]?.sprite.sx ?? -16) / 16);
        lastFrame = frame;
      }
    }
    expect(columns).toEqual([0, 1, 0, 2, 0]);
  });

  test("facing left draws flipped", () => {
    const g = createBrassMonkey();
    g.update(held({ left: true }));
    const monkey = drawCalls(g)[3];
    expect(monkey?.opts?.flipX).toBe(true);
    expect(monkey?.x).toBe(15 + 56 - 8);
  });
});
