import { describe, expect, test } from "bun:test";
import { NO_INPUT, type Input } from "../../engine/input.ts";
import { newGame, type Lumberjack } from "./game.ts";

function hold(g: Lumberjack, ticks: number, input: Partial<Input>): void {
  for (let i = 0; i < ticks; i++) {
    g.step({ ...NO_INPUT, ...input });
  }
}

/** Walk from the start (256,144) to (128,104): just below tree 0, facing up, not colliding. */
function walkBelowTree0(g: Lumberjack): void {
  hold(g, 64, { left: true });
  hold(g, 20, { up: true });
}

describe("lumberjack scene", () => {
  test("is 512x288 and named lumberjack", () => {
    const g = newGame();
    expect(g.name).toBe("lumberjack");
    expect(g.layout()).toEqual([512, 288]);
  });

  test("an idle tick leaves the player at the centre facing down", () => {
    const g = newGame();
    hold(g, 1, {});
    const s = g.snapshot();
    expect(s.tick).toBe(1);
    expect(s.player).toEqual({
      x: 256,
      y: 144,
      dir: "DOWN",
      frameX: 0,
      frameY: 0,
      frameCounter: 1,
      moving: false,
      acting: false,
    });
    expect(s.trees.map((t) => [t.x, t.y, t.health])).toEqual([
      [128, 72, 100],
      [384, 72, 100],
    ]);
  });

  test("diagonal movement is 1.5 px per tick and faces the last applied direction", () => {
    const g = newGame();
    hold(g, 1, { up: true, right: true });
    const p = g.snapshot().player;
    expect([p.x, p.y]).toEqual([257.5, 142.5]);
    expect(p.dir).toBe("RIGHT");
    expect(p.frameY).toBe(4); // side row 1, +3 moving
  });

  test("Up+Down held together cancel but the player still counts as moving, facing down", () => {
    const g = newGame();
    hold(g, 3, { up: true, down: true });
    const p = g.snapshot().player;
    expect([p.x, p.y]).toEqual([256, 144]);
    expect(p.moving).toBe(true);
    expect(p.dir).toBe("DOWN");
    expect(p.frameY).toBe(3);
  });

  test("Up+Down+Left moves left at the diagonal speed", () => {
    const g = newGame();
    hold(g, 1, { up: true, down: true, left: true });
    const p = g.snapshot().player;
    expect([p.x, p.y]).toEqual([254.5, 144]);
    expect(p.dir).toBe("LEFT");
  });

  test("space while moving does not act", () => {
    const g = newGame();
    hold(g, 1, { left: true, space: true });
    expect(g.snapshot().player.acting).toBe(false);
  });

  test("walking into a tree trunk is pushed back out along Y", () => {
    const g = newGame();
    walkBelowTree0(g);
    expect(g.snapshot().player.y).toBe(104);
    hold(g, 10, { up: true });
    expect(g.snapshot().player.y).toBe(97);
  });

  test("a chop does 10 damage on each frameX == 2 tick: 80 per swing", () => {
    const g = newGame();
    walkBelowTree0(g);

    hold(g, 15, { space: true });
    let s = g.snapshot();
    expect(s.player.acting).toBe(true);
    expect(s.player.frameX).toBe(1);
    expect(s.player.frameY).toBe(34); // up row 2, +32 acting
    expect(s.trees[0]?.health).toBe(100);

    hold(g, 1, { space: true });
    s = g.snapshot();
    expect(s.player.frameX).toBe(2);
    expect(s.trees[0]?.health).toBe(90);
    expect(s.trees[0]?.shaking).toBe(true);
    expect(s.trees[0]?.shakeRight).toBe(true);

    hold(g, 7, { space: true });
    expect(g.snapshot().trees[0]?.health).toBe(20);

    hold(g, 1, { space: true });
    s = g.snapshot();
    expect(s.player.frameX).toBe(3);
    expect(s.trees[0]?.health).toBe(20);
    expect(s.trees[1]?.health).toBe(100);
  });

  test("health keeps dropping past 0 on the next swing", () => {
    const g = newGame();
    walkBelowTree0(g);
    hold(g, 71, { space: true });
    expect(g.snapshot().trees[0]?.health).toBe(-60);
  });

  test("releasing space restarts the swing from frame 0", () => {
    const g = newGame();
    walkBelowTree0(g);
    hold(g, 12, { space: true });
    hold(g, 1, {});
    hold(g, 1, { space: true });
    const p = g.snapshot().player;
    expect(p.frameX).toBe(0);
    expect(p.frameCounter).toBe(1);
  });

  test("below a tree it is not behind; walking up past its side puts it behind and transparent", () => {
    const g = newGame();
    hold(g, 72, { left: true }); // x 112: beside the trunk, within 20 px of the tree centre
    let t = g.snapshot().trees[0];
    expect(t?.behind).toBe(false); // y 144 is not above 72+16
    expect(t?.transparent).toBe(false);

    hold(g, 32, { up: true }); // y 80: above 88, below 40
    const s = g.snapshot();
    expect([s.player.x, s.player.y]).toEqual([112, 80]);
    t = s.trees[0];
    expect(t?.behind).toBe(true);
    expect(t?.transparent).toBe(true);
    // The far tree is "behind" too (above is all that counts) but not transparent.
    expect(s.trees[1]?.behind).toBe(true);
    expect(s.trees[1]?.transparent).toBe(false);
  });
});
