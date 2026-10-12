import { describe, expect, test } from "bun:test";
import { imageGnome, imageWorkshop } from "../engine/assets.ts";
import type { Sprite } from "../engine/image.ts";
import { NO_INPUT, type Input } from "../engine/input.ts";
import type { DrawOpts, Surface } from "../engine/surface.ts";
import type { GearheadSnapshot } from "../game/snapshot.ts";
import { createGearhead } from "./index.ts";

const held = (i: Partial<Input>): Input => ({ ...NO_INPUT, ...i });
const snap = (g: ReturnType<typeof createGearhead>) => g.snapshot() as GearheadSnapshot;

describe("GearHeadSoftware", () => {
  test("is the gearhead software on the workshop background, never over, scoreless", () => {
    const g = createGearhead();
    expect(g.name).toBe("gearhead");
    expect(g.background()).toBe(imageWorkshop);
    expect(g.gameOver()).toBe(false);
    expect(g.score()).toBe(0);
  });

  test("starts idle at (16, 240) facing right", () => {
    const g = createGearhead();
    g.update(NO_INPUT);
    expect(snap(g)).toEqual({ x: 16, y: 240, frame: 0, left: false, moving: false });
  });

  test("walking moves 1 px per tick and advances the frame by 0.2", () => {
    const g = createGearhead();
    g.update(held({ right: true }));
    expect(snap(g)).toEqual({ x: 17, y: 240, frame: 0.2, left: false, moving: true });
    g.update(held({ left: true }));
    expect(snap(g)).toMatchObject({ x: 16, left: true, moving: true });
    expect(snap(g).frame).toBeCloseTo(0.4, 12);
  });

  test("the frame wraps to 0 once it reaches 4", () => {
    const g = createGearhead();
    const frames: number[] = [];
    for (let t = 0; t < 30; t++) {
      g.update(held({ right: true }));
      frames.push(snap(g).frame);
    }
    expect(Math.max(...frames)).toBeLessThan(4);
    expect(frames.slice(15).some((f) => f === 0)).toBe(true);
  });

  test("letting go resets the frame and stops", () => {
    const g = createGearhead();
    g.update(held({ right: true }));
    g.update(held({ right: true }));
    g.update(NO_INPUT);
    expect(snap(g)).toEqual({ x: 18, y: 240, frame: 0, left: false, moving: false });
  });

  test("Up or Down alone walks in the current facing (direction priority masks Left/Right)", () => {
    const g = createGearhead();
    g.update(held({ left: true }));
    g.update(held({ up: true, right: true }));
    expect(snap(g)).toMatchObject({ x: 14, left: true, moving: true });
  });

  test("x is clamped to [6, 108]", () => {
    const g = createGearhead();
    for (let t = 0; t < 30; t++) g.update(held({ left: true }));
    expect(snap(g).x).toBe(6);
    for (let t = 0; t < 200; t++) g.update(held({ right: true }));
    expect(snap(g).x).toBe(108);
  });
});

interface DrawCall {
  sprite: Sprite;
  x: number;
  y: number;
  opts: DrawOpts | undefined;
}

function drawCalls(g: ReturnType<typeof createGearhead>, buffer = 16): DrawCall[] {
  const calls: DrawCall[] = [];
  const fake: Pick<Surface, "draw"> = {
    draw: (sprite, x, y, opts) => {
      calls.push({ sprite, x, y, opts });
    },
  };
  g.draw(fake as Surface, buffer);
  return calls;
}

describe("gearhead draw", () => {
  test("background at the buffer, then the gnome centred on its position", () => {
    const g = createGearhead();
    const [bg, gnome] = drawCalls(g);
    expect(bg).toEqual({ sprite: imageWorkshop, x: 16, y: 16, opts: undefined });
    expect(gnome?.sprite).toEqual({ asset: imageGnome.asset, sx: 0, sy: 0, w: 16, h: 16 });
    expect(gnome?.x).toBe(16 + 16 - 8);
    expect(gnome?.y).toBe(240 + 16 - 8);
    expect(gnome?.opts?.flipX ?? false).toBe(false);
  });

  test("frames 0,1,2,3 map to sheet columns 0,1,0,2", () => {
    const g = createGearhead();
    const columns: number[] = [];
    let lastFrame = -1;
    for (let t = 0; t < 20; t++) {
      g.update(held({ right: true }));
      const frame = Math.trunc(snap(g).frame);
      if (frame !== lastFrame) {
        columns.push((drawCalls(g)[1]?.sprite.sx ?? -16) / 16);
        lastFrame = frame;
      }
    }
    expect(columns).toEqual([0, 1, 0, 2, 0]);
  });

  test("facing left draws flipped", () => {
    const g = createGearhead();
    g.update(held({ left: true }));
    const gnome = drawCalls(g)[1];
    expect(gnome?.opts?.flipX).toBe(true);
    expect(gnome?.x).toBe(15 + 16 - 8);
  });
});
