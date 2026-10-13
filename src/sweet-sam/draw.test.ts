// Draw order and coordinates, recorded through a fake Surface (bun test has no DOM).
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import type { Sprite } from "../engine/image.ts";
import { Surface, type PremulColor } from "../engine/surface.ts";
import { SweetSamSoftware } from "./software.ts";
import { particleColorCyan } from "./particle.ts";
import { textWidth } from "../ui/text.ts";

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

/** "op:first-arg", e.g. "draw:honey-drop.png". */
function name(o: Op | undefined): string {
  return `${o?.[0]}:${String(o?.[1])}`;
}

/** Glyph draws from the pixel font: their x and y, one per letter. */
function glyphs(ops: Op[]): [unknown, unknown][] {
  return ops.filter((o) => name(o) === "draw:font.png").map((o) => [o[6], o[7]]);
}

/** Where `drawText` puts each letter of `text` drawn from x. */
function letterXs(text: string, x: number): number[] {
  const xs: number[] = [];
  let at = x;
  for (const ch of text) {
    xs.push(at);
    at += textWidth(ch) + 1;
  }
  return xs;
}

/** The x `drawTextCentered` starts `text` at, centred on maze x `cx` (the maze is drawn at 56). */
function centred(text: string, cx: number): number {
  return cx + 56 - Math.trunc(textWidth(text) / 2);
}

describe("SweetSamSoftware.draw", () => {
  test("fresh game: cabinet, maze, labels, score dials, lives, READY, food, bees (player hidden)", () => {
    const s = new SweetSamSoftware(0);
    const ops = render(s);
    expect(ops[0]).toEqual(["draw", "cabinet.png", 0, 0, 336, 428, 0, 0]);
    expect(ops[1]).toEqual(["draw", "maze.png", 0, 0, 224, 288, 56, 56]);
    // "1UP" and "HIGH SCORE" in the pixel font, centred on x 37 and 112 of the maze, on its top row.
    const labels = ops.slice(2, 2 + "1UPHIGH SCORE".length);
    expect(glyphs(labels)).toEqual(
      [...letterXs("1UP", centred("1UP", 37)), ...letterXs("HIGH SCORE", centred("HIGH SCORE", 112))].map((x) => [
        x,
        56,
      ]),
    );
    const rest = ops.slice(2 + labels.length);
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
    // READY! letters ride a sine wave, 2·sin(tick·0.14 + i·1.05), here at tick 0
    // (not rounded here: the Surface snaps), centred on the maze.
    const ready = glyphs(rest.slice(6, 12));
    const readyX = 112 + 56 - Math.trunc(textWidth("READY!") / 2);
    expect(ready.map(([x]) => x)).toEqual(letterXs("READY!", readyX));
    expect(ready.map(([, y]) => y)).toEqual([0, 1, 2, 3, 4, 5].map((i) => 217 + 2 * Math.sin(i * 1.05)));
    const food = rest.slice(12, 12 + 244);
    expect(food.filter((o) => name(o) === "draw:honey-drop.png").length).toBe(240);
    expect(food.filter((o) => name(o) === "draw:smoke-pot.png").length).toBe(4);
    expect(food[0]).toEqual(["draw", "honey-drop.png", 0, 0, 8, 12, 64, 86]);
    expect(food[243]).toEqual(["draw", "smoke-pot.png", 0, 0, 8, 12, 264, 262]);
    // One sheet per bee in bees.png (red, pink, teal, orange, 96 px apart), each facing its way.
    // red bee: RIGHT row 0, at (112-8+56, 116-8+56)
    expect(rest.slice(12 + 244)).toEqual([
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
    // The labels shake with the maze.
    const labels = ops.slice(2, 15);
    expect(labels.every((o) => name(o) === "draw:font.png" && o[7] === 55.5)).toBe(true);
    const rest = ops.slice(15);
    // score/high dials are rounded with goRound before drawing
    expect(rest.slice(0, 4).map((o) => [o[2], o[3]])).toEqual([
      [97, 64],
      [105, 64],
      [177, 64],
      [185, 64],
    ]);
    // player: LEFT row 2, frame trunc(2.7) = 2
    expect(rest[4]).toEqual(["draw", "bear.png", 32, 32, 16, 16, 112 - 8 + 57.25, 212 - 8 + 55.5]);
    // red sleepy + UP: row 1+2 = 3; pink waking + LEFT: row 1+2+2 = 5, in pink's sheet (96 down)
    expect(rest[5]?.slice(1, 6)).toEqual(["bees.png", 0, 48, 16, 16]);
    expect(rest[6]?.slice(1, 6)).toEqual(["bees.png", 0, 96 + 80, 16, 16]);
    // popup: "800" in the pixel font, centred on the bee, its top 20 px above it
    const popup = rest.slice(9, 12);
    const popupX = 100 + 57.25 - Math.trunc(textWidth("800") / 2);
    expect(glyphs(popup)).toEqual(letterXs("800", popupX).map((x) => [x, 120 + 55.5 - 20]));
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
