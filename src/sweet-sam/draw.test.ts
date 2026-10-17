// Draw order and coordinates, recorded through a fake Surface (bun test has no DOM).
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Sprite } from "../engine/image.ts";
import { Surface, type PremulColor } from "../engine/surface.ts";
import { imageCabinet } from "../engine/assets.ts";
import { expectDrawnOnScreen, screenPaints } from "../ui/cabinet.testutil.ts";
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
  override fillRect(x: number, y: number, w: number, h: number, css: string): void {
    this.ops.push(["fillRect", x, y, w, h, css]);
  }
  /** The clip is checked with `screenDraws`; here it only runs the draws. */
  override clipped(_x: number, _y: number, _w: number, _h: number, draw: () => void): void {
    draw();
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
  const screen = new Recorder(240, 304, "screen");
  s.draw(screen, 0);
  return screen.ops;
}

/** The flower draws at the bonus flower's spot below the bee home (the level counter's are lower). */
function atFlower(ops: readonly Op[]): Op[] {
  return ops.filter((o) => name(o) === "draw:flower.png" && o[7] === 164 - 8 + 8);
}

/** The flower.png frame each flower draw takes (0 for level 1), left to right. */
function flowerFrames(ops: readonly Op[]): number[] {
  return ops.filter((o) => name(o) === "draw:flower.png").map((o) => Number(o[2]) / 16);
}

/** "op:first-arg", e.g. "draw:honey-drop.png". */
function name(o: Op | undefined): string {
  return `${o?.[0]}:${String(o?.[1])}`;
}

describe("SweetSamSoftware.draw", () => {
  test("fresh game: cabinet, maze (labels baked in), score dials, lives, READY, food, bees (player hidden)", () => {
    const s = new SweetSamSoftware(0);
    const ops = render(s);
    expect(ops[0]).toEqual(["draw", "cabinet.png", 0, 0, 240, 304, 0, 0]);
    expect(ops[1]).toEqual(["draw", "maze.png", 0, 0, 224, 288, 8, 8]);
    const rest = ops.slice(2);
    // Only the last two digits of a zero score draw; one 8×8 scratch cell is reused.
    expect(rest.slice(0, 4)).toEqual([
      ["drawSurface", "cell0", 48, 16],
      ["drawSurface", "cell0", 56, 16],
      ["drawSurface", "cell0", 128, 16],
      ["drawSurface", "cell0", 136, 16],
    ]);
    expect(cells.length).toBe(1);
    expect(cells[0]?.ops.slice(-2)).toEqual([["clear"], ["draw", "digits.png", 0, 0, 8, 8, 0, 0]]);
    // lives - 1 bear icons: the bear's first frame
    expect(rest.slice(4, 6)).toEqual([
      ["draw", "bear.png", 0, 0, 16, 16, 24, 281],
      ["draw", "bear.png", 0, 0, 16, 16, 40, 281],
    ]);
    // The level counter: level 1's flower, right-aligned at x 208, its bottom row the screen's (288 tall).
    expect(rest[6]).toEqual(["draw", "flower.png", 0, 0, 16, 16, 208 - 16 + 8, 288 - 16 + 8]);
    // READY! glyphs ride a sine wave, 2·sin(tick·0.14 + i·1.05), here at tick 0
    // (not rounded here: the Surface snaps).
    const ready = rest.slice(7, 13);
    expect(ready.map((o) => [o[1], o[2], o[6]])).toEqual([0, 8, 16, 24, 32, 40].map((x) => ["ready.png", x, 96 + x]));
    expect(ready.map((o) => o[7])).toEqual([0, 1, 2, 3, 4, 5].map((i) => 169 + 2 * Math.sin(i * 1.05)));
    const food = rest.slice(13, 13 + 244);
    expect(food.filter((o) => name(o) === "draw:honey-drop.png").length).toBe(240);
    expect(food.filter((o) => name(o) === "draw:honey-pot.png").length).toBe(4);
    expect(food[0]).toEqual(["draw", "honey-drop.png", 0, 0, 8, 12, 16, 38]);
    expect(food[243]).toEqual(["draw", "honey-pot.png", 0, 0, 8, 12, 216, 214]);
    // One sheet per bee in bees.png (red, pink, teal, orange, 96 px apart), each facing its way.
    // red bee: RIGHT row 0, at (112-8+8, 116-8+8)
    expect(rest.slice(13 + 244)).toEqual([
      ["draw", "bees.png", 0, 0, 16, 16, 112, 116],
      ["draw", "bees.png", 0, 96 + 16, 16, 16, 112, 140],
      ["draw", "bees.png", 0, 192, 16, 16, 96, 140],
      ["draw", "bees.png", 0, 288 + 16, 16, 16, 128, 140],
    ]);
  });

  test("a sleepy bee in the home is drawn in its sleepy rows", () => {
    const s = new SweetSamSoftware(0);
    const teal = s.enemies[2];
    if (teal?.home !== true) throw new Error("teal bee in the home");
    teal.blueFrames = 10;
    // teal RIGHT: row 0, +2 asleep; teal's sheet starts 192 down bees.png
    expect(
      render(s)
        .filter((o) => name(o) === "draw:bees.png")[2]
        ?.slice(1, 6),
    ).toEqual(["bees.png", 0, 192 + 32, 16, 16]);
  });

  test("an eaten bee is drawn as its eyes sprite, the frame facing its way, centred on it", () => {
    const s = new SweetSamSoftware(0);
    const red = s.enemies[0];
    if (red === undefined) throw new Error("red bee");
    red.eyes = true;
    red.x = 100;
    red.y = 116;
    const eyeDraws = (direction: typeof red.direction): Op[] => {
      red.direction = direction;
      const ops = render(s);
      expect(ops.filter((o) => name(o) === "draw:bees.png")).toHaveLength(3);
      return ops.filter((o) => name(o) === "draw:bee-eyes.png");
    };
    // Centre (108, 124) on screen, so the 16×16 frame's corner is (100, 116); frames go RIGHT, LEFT, UP, DOWN.
    expect(eyeDraws("LEFT")).toEqual([["draw", "bee-eyes.png", 16, 0, 16, 16, 100, 116]]);
    expect(eyeDraws("DOWN")).toEqual([["draw", "bee-eyes.png", 48, 0, 16, 16, 100, 116]]);
    // Before it has a direction it looks right, the first frame.
    expect(eyeDraws("")).toEqual([["draw", "bee-eyes.png", 0, 0, 16, 16, 100, 116]]);
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
    expect(ops[0]).toEqual(["draw", "cabinet.png", 0, 0, 240, 304, 0, 0]);
    expect(ops[1]).toEqual(["draw", "maze.png", 0, 0, 224, 288, 9.25, 7.5]);
    const rest = ops.slice(2);
    // score/high dials are rounded with goRound before drawing
    expect(rest.slice(0, 4).map((o) => [o[2], o[3]])).toEqual([
      [49, 16],
      [57, 16],
      [129, 16],
      [137, 16],
    ]);
    expect(name(rest[4])).toBe("draw:flower.png");
    // player: LEFT row 2, frame trunc(2.7) = 2
    expect(rest[5]).toEqual(["draw", "bear.png", 32, 32, 16, 16, 112 - 8 + 9.25, 212 - 8 + 7.5]);
    // red sleepy + UP: row 1+2 = 3; pink waking + LEFT: row 1+2+2 = 5, in pink's sheet (96 down)
    expect(rest[6]?.slice(1, 6)).toEqual(["bees.png", 0, 48, 16, 16]);
    expect(rest[7]?.slice(1, 6)).toEqual(["bees.png", 0, 96 + 80, 16, 16]);
    // popup: frame 2 of points.png, centred, one tile above the bee
    expect(rest[10]).toEqual(["draw", "points.png", 32, 0, 16, 16, 100 + 9.25 - 8, 120 + 7.5 - 8 - 16]);
    // particle: premultiplied fill, a = trunc(7/40*255) = trunc(44.625) = 44
    expect(rest[11]).toEqual([
      "fillPremul",
      p.x - 1.5 + 9.25,
      p.y - 1.5 + 7.5,
      3,
      3,
      { r: 0x73, g: 0xef, b: 0xf7, a: 44 },
    ]);
    expect(rest.length).toBe(12);
  });

  test("the bonus flower stands below the bee home; its points show in the pixel font when eaten", () => {
    const s = new SweetSamSoftware(0);
    s.flowerTicks = 100;
    let ops = render(s);
    expect(atFlower(ops)).toEqual([["draw", "flower.png", 0, 0, 16, 16, 112 - 8 + 8, 164 - 8 + 8]]);
    s.flowerTicks = 0;
    s.flowerPopup = { points: 300, ticks: 50 };
    ops = render(s);
    expect(atFlower(ops)).toEqual([]);
    // "300" after everything but the particles: three glyphs centred on the flower.
    const popup = ops.slice(-3);
    expect(popup.map((o) => name(o))).toEqual(["draw:font.png", "draw:font.png", "draw:font.png"]);
    const left = Number(popup[0]?.[6]);
    const right = Number(popup[2]?.[6]) + Number(popup[2]?.[4]);
    expect(Math.abs(left + right - 2 * (112 + 8))).toBeLessThanOrEqual(1);
  });

  test("each level shows its flower kind (Pac-Man's fruit table); the last holds from level 13 on", () => {
    const s = new SweetSamSoftware(0);
    s.flowerTicks = 100;
    for (const [level, frame] of [
      [1, 0],
      [2, 1],
      [4, 2],
      [5, 3],
      [8, 4],
      [9, 5],
      [12, 6],
      [13, 7],
      [40, 7],
    ] as const) {
      s.level = level;
      expect(flowerFrames(render(s)).at(-1)).toBe(frame);
    }
  });

  test("the level counter is a row of the last seven levels' flowers, ending at x 208", () => {
    const s = new SweetSamSoftware(0);
    s.level = 3;
    let ops = render(s).filter((o) => name(o) === "draw:flower.png");
    expect(flowerFrames(ops)).toEqual([0, 1, 2]);
    expect(ops.map((o) => o[6])).toEqual([160 + 8, 176 + 8, 192 + 8]);
    s.level = 12;
    ops = render(s).filter((o) => name(o) === "draw:flower.png");
    expect(flowerFrames(ops)).toEqual([3, 4, 4, 5, 5, 6, 6]);
    expect(ops.at(-1)?.[6]).toBe(192 + 8);
  });

  test("LEVEL n shows in place of READY, then READY", () => {
    const s = new SweetSamSoftware(0);
    s.level = 2;
    s.levelBannerTicks = 10;
    let ops = render(s);
    expect(ops.filter((o) => name(o) === "draw:ready.png")).toEqual([]);
    expect(ops.filter((o) => name(o) === "draw:font.png").length).toBe(7); // "LEVEL 2" without the space
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
    expect(bear()).toEqual([["draw", "bear.png", 0, 64, 16, 16, 112 - 8 + 8, 212 - 8 + 8]]);
    s.pauseTicks = 0;
    expect(bear()).toEqual([["draw", "bear.png", 48, 64, 16, 16, 112 - 8 + 8, 212 - 8 + 8]]);
  });

  test("rolling digit: old glyph scrolls up, new glyph rises from below inside the cell", () => {
    const s = new SweetSamSoftware(0);
    s.scoreValue = 10;
    const reel = s.dials.score[4];
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

// Last: its draw takes a scratch cell, and the tests above expect to see "cell0".
describe("SweetSamSoftware.draw screen", () => {
  test("only the cabinet draws outside the 224x288 screen; everything else is clipped to it", () => {
    const s = new SweetSamSoftware(0);
    const paints = screenPaints((screen) => {
      s.draw(screen, 0);
    });
    expectDrawnOnScreen(paints, imageCabinet);
  });
});
