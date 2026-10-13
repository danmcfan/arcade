// Draw order and coordinates, recorded through a fake Surface (bun test has no DOM).
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Sprite } from "../engine/image.ts";
import { Surface, type PremulColor } from "../engine/surface.ts";
import { SweetSamSoftware } from "./software.ts";
import { particleColorCyan } from "./particle.ts";

type Op = [string, ...unknown[]];

/** A real Surface (never backed by a canvas) that records each paint instead. */
class Recorder extends Surface {
  readonly ops: Op[] = [];
  readonly label: string;

  constructor(width: number, height: number, label: string) {
    super(null, width, height);
    this.label = label;
  }
  override clear(): void {
    this.ops.push(["clear"]);
  }
  override draw(s: Sprite, x: number, y: number): void {
    this.ops.push(["draw", s.asset.url.split("/").pop(), s.sx, s.sy, s.w, s.h, x, y]);
  }
  override drawSurface(src: Surface, x: number, y: number): void {
    this.ops.push(["drawSurface", src instanceof Recorder ? src.label : "unrecorded", x, y]);
  }
  override fillPremul(x: number, y: number, w: number, h: number, c: PremulColor): void {
    this.ops.push(["fillPremul", x, y, w, h, c]);
  }
}

const cells: Recorder[] = [];
const realOffscreen = Surface.offscreen.bind(Surface);
beforeAll(() => {
  Surface.offscreen = (w: number, h: number): Surface => {
    const r = new Recorder(w, h, `cell${cells.length}`);
    cells.push(r);
    return r;
  };
});
afterAll(() => {
  Surface.offscreen = realOffscreen;
});

function render(s: SweetSamSoftware): Op[] {
  const screen = new Recorder(336, 428, "screen");
  s.draw(screen, 0);
  return screen.ops;
}

/** Where a run of font.png glyph draws ends on the right, and its top. */
function levelCounter(ops: readonly Op[]): { right: number; y: number } {
  if (!ops.every((o) => name(o) === "draw:font.png")) throw new Error(`not glyphs: ${JSON.stringify(ops)}`);
  const last = ops.at(-1) ?? [];
  return { right: Number(last[6]) + Number(last[4]), y: Number(last[7]) };
}

/** "op:first-arg", e.g. "draw:honey-drop.png". */
function name(o: Op | undefined): string {
  return `${o?.[0]}:${String(o?.[1])}`;
}

describe("SweetSamSoftware.draw", () => {
  test("fresh game: cabinet, maze (labels baked in), score dials, lives, READY, food, bees (player hidden)", () => {
    const s = new SweetSamSoftware(0);
    const ops = render(s);
    expect(ops[0]).toEqual(["draw", "cabinet.png", 0, 0, 336, 428, 0, 0]);
    expect(ops[1]).toEqual(["draw", "maze.png", 0, 0, 224, 288, 56, 56]);
    const rest = ops.slice(2);
    // Only the last two digits of a zero score draw; one 8×8 scratch cell is reused.
    expect(rest.slice(0, 4)).toEqual([
      ["drawSurface", "cell0", 96, 64],
      ["drawSurface", "cell0", 104, 64],
      ["drawSurface", "cell0", 176, 64],
      ["drawSurface", "cell0", 184, 64],
    ]);
    expect(cells.length).toBe(1);
    expect(cells[0]?.ops.slice(-2)).toEqual([["clear"], ["draw", "digits.png", 0, 0, 8, 8, 0, 0]]);
    // lives - 1 bear icons: the bear's first frame
    expect(rest.slice(4, 6)).toEqual([
      ["draw", "bear.png", 0, 0, 16, 16, 72, 329],
      ["draw", "bear.png", 0, 0, 16, 16, 88, 329],
    ]);
    // The level counter: "L1" in the pixel font, right-aligned at x 208, level with the lives.
    expect(levelCounter(rest.slice(6, 8))).toEqual({ right: 208 + 56, y: 277 + 56 });
    // READY! glyphs ride a sine wave, 2·sin(tick·0.14 + i·1.05), here at tick 0
    // (not rounded here: the Surface snaps).
    const ready = rest.slice(8, 14);
    expect(ready.map((o) => [o[1], o[2], o[6]])).toEqual([0, 8, 16, 24, 32, 40].map((x) => ["ready.png", x, 144 + x]));
    expect(ready.map((o) => o[7])).toEqual([0, 1, 2, 3, 4, 5].map((i) => 217 + 2 * Math.sin(i * 1.05)));
    const food = rest.slice(14, 14 + 244);
    expect(food.filter((o) => name(o) === "draw:honey-drop.png").length).toBe(240);
    expect(food.filter((o) => name(o) === "draw:honey-pot.png").length).toBe(4);
    expect(food[0]).toEqual(["draw", "honey-drop.png", 0, 0, 8, 12, 64, 86]);
    expect(food[243]).toEqual(["draw", "honey-pot.png", 0, 0, 8, 12, 264, 262]);
    // One sheet per bee in bees.png (red, pink, teal, orange, 96 px apart), each facing its way.
    // red bee: RIGHT row 0, at (112-8+56, 116-8+56)
    expect(rest.slice(14 + 244)).toEqual([
      ["draw", "bees.png", 0, 0, 16, 16, 160, 164],
      ["draw", "bees.png", 0, 96 + 16, 16, 16, 160, 188],
      ["draw", "bees.png", 0, 192, 16, 16, 144, 188],
      ["draw", "bees.png", 0, 288 + 16, 16, 16, 176, 188],
    ]);
  });

  test("shake offsets the playfield, not the cabinet; sleepy/waking rows; popups; particles", () => {
    const s = new SweetSamSoftware(0);
    s.startTicks = 0;
    s.player.hidden = false;
    s.player.frame = 2.7;
    s.player.direction = "LEFT";
    s.camera.shakeOffsetX = 1.25;
    s.camera.shakeOffsetY = -0.5;
    s.items = s.items.map(() => null);
    s.lives = 1;
    s.pelletAnimTick = 47; // frame (47/15)%4 = 3 (no items to show it here)
    const red = s.enemies[0];
    const pink = s.enemies[1];
    if (!red || !pink) throw new Error("bees");
    red.blueFrames = 10;
    red.direction = "UP";
    pink.blueFrames = 10;
    pink.flash = true;
    s.bonusEatPopups.push({ x: 100, y: 120, frameIdx: 2, ticksRemain: 10 });
    s.particles.spawnBurst(50, 60, particleColorCyan, 1);
    const p = s.particles.pool[0];
    if (!p) throw new Error("particle");
    p.lifeTicks = 7;
    p.maxLifeTicks = 40;

    const ops = render(s);
    expect(ops[0]).toEqual(["draw", "cabinet.png", 0, 0, 336, 428, 0, 0]);
    expect(ops[1]).toEqual(["draw", "maze.png", 0, 0, 224, 288, 57.25, 55.5]);
    const rest = ops.slice(2);
    // score/high dials are rounded with goRound before drawing
    expect(rest.slice(0, 4).map((o) => [o[2], o[3]])).toEqual([
      [97, 64],
      [105, 64],
      [177, 64],
      [185, 64],
    ]);
    expect(rest.slice(4, 6).map((o) => name(o))).toEqual(["draw:font.png", "draw:font.png"]);
    // player: LEFT row 2, frame trunc(2.7) = 2
    expect(rest[6]).toEqual(["draw", "bear.png", 32, 32, 16, 16, 112 - 8 + 57.25, 212 - 8 + 55.5]);
    // red sleepy + UP: row 1+2 = 3; pink waking + LEFT: row 1+2+2 = 5, in pink's sheet (96 down)
    expect(rest[7]?.slice(1, 6)).toEqual(["bees.png", 0, 48, 16, 16]);
    expect(rest[8]?.slice(1, 6)).toEqual(["bees.png", 0, 96 + 80, 16, 16]);
    // popup: frame 2 of points.png, centred, one tile above the bee
    expect(rest[11]).toEqual(["draw", "points.png", 32, 0, 16, 16, 100 + 57.25 - 8, 120 + 55.5 - 8 - 16]);
    // particle: premultiplied fill, a = trunc(7/40*255) = trunc(44.625) = 44
    expect(rest[12]).toEqual([
      "fillPremul",
      p.x - 1.5 + 57.25,
      p.y - 1.5 + 55.5,
      3,
      3,
      { r: 0x73, g: 0xef, b: 0xf7, a: 44 },
    ]);
    expect(rest.length).toBe(13);
  });

  test("the bonus flower stands below the bee home; its points show in the pixel font when eaten", () => {
    const s = new SweetSamSoftware(0);
    s.flowerTicks = 100;
    let ops = render(s);
    expect(ops.filter((o) => name(o) === "draw:flower.png")).toEqual([
      ["draw", "flower.png", 0, 0, 16, 16, 112 - 8 + 56, 164 - 8 + 56],
    ]);
    s.flowerTicks = 0;
    s.flowerPopup = { points: 300, ticks: 50 };
    ops = render(s);
    expect(ops.filter((o) => name(o) === "draw:flower.png")).toEqual([]);
    // "300" after everything but the particles: three glyphs centred on the flower.
    const popup = ops.slice(-3);
    expect(popup.map((o) => name(o))).toEqual(["draw:font.png", "draw:font.png", "draw:font.png"]);
    const left = Number(popup[0]?.[6]);
    const right = Number(popup[2]?.[6]) + Number(popup[2]?.[4]);
    expect(Math.abs(left + right - 2 * (112 + 56))).toBeLessThanOrEqual(1);
  });

  test("the level counter follows the level", () => {
    const s = new SweetSamSoftware(0);
    s.level = 12;
    const ops = render(s).slice(6);
    expect(levelCounter(ops.slice(2, 5))).toEqual({ right: 208 + 56, y: 277 + 56 });
  });

  test("LEVEL n shows in place of READY, then READY", () => {
    const s = new SweetSamSoftware(0);
    s.level = 2;
    s.levelBannerTicks = 10;
    let ops = render(s);
    expect(ops.filter((o) => name(o) === "draw:ready.png")).toEqual([]);
    expect(ops.filter((o) => name(o) === "draw:font.png").length).toBe(2 + 7); // "L2", "LEVEL 2" without the space
    s.levelBannerTicks = 0;
    ops = render(s);
    expect(ops.filter((o) => name(o) === "draw:ready.png").length).toBe(6);
  });

  test("clearing a level: the maze flashes and the bees leave", () => {
    const s = new SweetSamSoftware(0);
    s.stateMachine.changeState("LEVELCLEAR");
    const mazes: string[] = [];
    for (let t = 0; t < 30; t++) {
      const ops = render(s);
      mazes.push(String(ops[1]?.[1]));
      expect(ops.filter((o) => name(o) === "draw:bees.png")).toEqual([]);
      s.update({ up: false, down: false, left: false, right: false, space: false, escape: false, shiftP: false });
    }
    expect(mazes.slice(0, 12).every((m) => m === "maze.png")).toBe(true);
    expect(mazes.slice(12, 24).every((m) => m === "maze-flash.png")).toBe(true);
    expect(mazes[24]).toBe("maze.png");
  });

  test("a lost life: the bear's death frames from bear.png's last row, where it was caught", () => {
    const s = new SweetSamSoftware(0);
    s.stateMachine.changeState("DEATHWAIT");
    s.player.hidden = true;
    const bear = (): Op[] => render(s).filter((o) => name(o) === "draw:bear.png" && o[3] === 64);
    expect(bear()).toEqual([["draw", "bear.png", 0, 64, 16, 16, 112 - 8 + 56, 212 - 8 + 56]]);
    s.pauseTicks = 0;
    expect(bear()).toEqual([["draw", "bear.png", 48, 64, 16, 16, 112 - 8 + 56, 212 - 8 + 56]]);
  });

  test("rolling digit: old glyph scrolls up, new glyph rises from below inside the cell", () => {
    const s = new SweetSamSoftware(0);
    s.scoreValue = 10;
    const reel = s.scoreDial[4];
    reel.syncTarget(1);
    reel.stepFrame(); // t = 1/18
    render(s);
    const cellOps = cells.at(-1)?.ops ?? [];
    const p = reel.scroll01();
    // score: column 4 (spinning 0→1), column 5 ("0")
    expect(cellOps.slice(0, 3)).toEqual([
      ["clear"],
      ["draw", "digits.png", 0, 0, 8, 8, 0, -p * 8],
      ["draw", "digits.png", 8, 0, 8, 8, 0, (1 - p) * 8],
    ]);
  });
});
