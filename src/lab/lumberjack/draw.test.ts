import { describe, expect, test } from "bun:test";
import type { Sprite } from "../../engine/image.ts";
import type { DrawOpts, Surface } from "../../engine/surface.ts";
import { createLumberjack } from "./index.ts";
import { Player } from "./player.ts";
import { Spritesheet } from "./sprite.ts";

describe("Spritesheet", () => {
  // Body sheets are 576x3584: 9x56 frames of 64x64.
  const body = new Spritesheet("Player/Player_Base/Player_Base_animations.png", 64, 64);

  test("counts whole frames", () => {
    expect([body.maxX, body.maxY]).toEqual([9, 56]);
  });

  test("frame (x, y) is the 64x64 cell at (64x, 64y)", () => {
    const f = body.frame(2, 34);
    expect(f && [f.sx, f.sy, f.w, f.h]).toEqual([128, 2176, 64, 64]);
  });

  test("out-of-range frames are null, as Go returns nil", () => {
    expect(body.frame(9, 0)).toBeNull();
    expect(body.frame(0, 56)).toBeNull();
    expect(body.frame(-1, 0)).toBeNull();
  });
});

interface DrawCall {
  url: string;
  sx: number;
  sy: number;
  x: number;
  y: number;
  opts: DrawOpts | undefined;
}

/** Records `draw` calls; the only Surface method the player uses. */
function recordingSurface(): { surface: Surface; calls: DrawCall[] } {
  const calls: DrawCall[] = [];
  const fake = {
    draw(s: Sprite, x: number, y: number, opts?: DrawOpts): void {
      calls.push({ url: s.asset.url, sx: s.sx, sy: s.sy, x, y, opts });
    },
  };
  // A structural fake: Player.draw only calls `draw` (debug is off).
  return { surface: fake as unknown as Surface, calls };
}

describe("Player.draw", () => {
  test("draws base, chest, legs, feet, head, hands at the sprite's top-left", () => {
    const p = new Player();
    const { surface, calls } = recordingSurface();
    p.draw(surface);
    expect(calls.map((c) => c.url.split("/").pop())).toEqual([
      "Player_Base_animations.png",
      "Lumberjack_Shirt_1_Red.png",
      "Pants_1_Blue.png",
      "Shoes_1_Brown.png",
      "Hair_1_Brown.png",
      "Hands_1_Bare.png",
    ]);
    for (const c of calls) {
      expect([c.x, c.y, c.sx, c.sy]).toEqual([224, 112, 0, 0]);
      expect(c.opts?.flipX).toBe(false);
    }
  });

  test("facing left flips every layer; acting adds the tool from row frameY-32", () => {
    const p = new Player();
    p.direction = "LEFT";
    p.acting = true;
    p.frameX = 2;
    p.frameY = 33;
    const { surface, calls } = recordingSurface();
    p.draw(surface);
    expect(calls).toHaveLength(7);
    const tool = calls[6];
    expect(tool?.url.split("/").pop()).toBe("Iron_Tools.png");
    expect([tool?.sx, tool?.sy]).toEqual([128, 64]);
    expect(calls.every((c) => c.opts?.flipX === true)).toBe(true);
  });

  test("an out-of-range frame throws (Go would panic drawing a nil image)", () => {
    const p = new Player();
    p.frameY = 56;
    expect(() => p.draw(recordingSurface().surface)).toThrow("out of range");
  });
});

describe("createLumberjack", () => {
  test("returns a fresh scene each time", () => {
    const a = createLumberjack();
    const b = createLumberjack();
    a.step({ up: true, down: false, left: false, right: false, space: false, escape: false, shiftP: false });
    expect(a.snapshot().tick).toBe(1);
    expect(b.snapshot().tick).toBe(0);
    expect(a.name).toBe("lumberjack");
  });
});
