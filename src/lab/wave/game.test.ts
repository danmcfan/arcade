import { expect, test } from "bun:test";
import { NO_INPUT, type Input } from "../../engine/input.ts";
import * as rng from "../../engine/rng.ts";
import type { Sprite } from "../../engine/image.ts";
import type { Surface } from "../../engine/surface.ts";
import type { WaveOptions } from "../../game/software.ts";
import type { WaveSnapshot } from "../../game/snapshot.ts";
import { Wave } from "./game.ts";
import { createWave } from "./index.ts";

const SPACE: Input = { ...NO_INPUT, space: true };

function snap(scene: ReturnType<typeof createWave>, full = false): WaveSnapshot {
  return scene.snapshot({ full }) as WaveSnapshot;
}

test("defaults: 128² grid, 2048² layout, 54 steps per tick", () => {
  rng.seed(1);
  const wave = createWave();
  expect(wave.name).toBe("wave");
  expect(wave.layout()).toEqual([2048, 2048]);
  wave.step(NO_INPUT);
  const s = snap(wave);
  expect(s.tick).toBe(1);
  expect(s.width).toBe(128);
  expect(s.collapsed).toBe(54);
  expect(s.rng).toBe(rng.state());
  expect("cells" in s).toBe(false);
  wave.step(NO_INPUT);
  expect(snap(wave)).toMatchObject({ tick: 2, collapsed: 108 });
});

test("pending options size the first grid, but layout and step rate stay at the 128/5 defaults", () => {
  rng.seed(7);
  const wave = createWave({ gridSize: 64, seconds: 30 });
  expect(wave.layout()).toEqual([2048, 2048]);
  wave.step(NO_INPUT);
  expect(snap(wave)).toMatchObject({ width: 64, collapsed: 54 });
});

test("a Space rising edge applies the pending settings, rebuilds the grid and runs no step", () => {
  rng.seed(3);
  const wave = createWave({ gridSize: 64, seconds: 30 });
  wave.step(NO_INPUT);
  wave.step(NO_INPUT);

  const before = rng.state();
  wave.step(SPACE);
  expect(snap(wave)).toMatchObject({ tick: 3, width: 64, collapsed: 0, rng: before });
  expect(wave.layout()).toEqual([1024, 1024]);

  // Held Space is not "just pressed": 64*64/(60*30) = 2 steps per tick.
  wave.step(SPACE);
  expect(snap(wave)).toMatchObject({ tick: 4, collapsed: 2 });

  // Release, then press again: another reset.
  wave.step(NO_INPUT);
  expect(snap(wave).collapsed).toBe(4);
  wave.step(SPACE);
  expect(snap(wave).collapsed).toBe(0);
});

test("Space held on the very first tick counts as just pressed", () => {
  rng.seed(3);
  const wave = createWave();
  wave.step(SPACE);
  expect(snap(wave)).toMatchObject({ tick: 1, collapsed: 0, rng: 3 });
});

test("a full snapshot adds cells[x][y] as plain copies", () => {
  rng.seed(11);
  const wave = createWave({ gridSize: 64 });
  wave.step(SPACE); // apply 64 / 5: 13 steps per tick
  wave.step(NO_INPUT);
  const s = snap(wave, true);
  const cells = s.cells ?? [];
  expect(cells.length).toBe(64);
  expect(cells.every((col) => col.length === 64)).toBe(true);

  const collapsed = cells.flat().filter((c) => c.collapsed);
  expect(collapsed.length).toBe(13);
  expect(collapsed.every((c) => c.possible.length === 1)).toBe(true);
  const open = cells.flat().filter((c) => !c.collapsed);
  expect(open.every((c) => c.possible.length >= 2)).toBe(true);

  // Mutating the snapshot does not reach the scene.
  for (const c of cells.flat()) c.possible.push(9);
  expect(snap(wave, true).cells?.flat().some((c) => c.possible.includes(9))).toBe(false);

  // JSON-round-trips exactly (the harness diffs parsed JSON).
  expect(JSON.parse(JSON.stringify(s))).toEqual(s);
});

/** Records draw calls; stands in for the canvas-backed engine Surface. */
class RecordingSurface {
  readonly draws: { sx: number; solid: boolean; x: number; y: number }[] = [];
  readonly blits: { src: unknown; x: number; y: number }[] = [];
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  draw(s: Sprite, x: number, y: number): void {
    this.draws.push({ sx: s.sx, solid: s.asset.solid !== undefined, x, y });
  }
  drawSurface(src: unknown, x: number, y: number): void {
    this.blits.push({ src, x, y });
  }
}

function recordingWave(opts: Partial<WaveOptions>): { wave: Wave; made: RecordingSurface[] } {
  const made: RecordingSurface[] = [];
  const wave = new Wave(opts);
  wave.createOffscreen = (w, h) => {
    const s = new RecordingSurface(w, h);
    made.push(s);
    return s as unknown as Surface;
  };
  return { wave, made };
}

test("draw paints only newly collapsed cells into a persistent offscreen surface, then blits it", () => {
  rng.seed(4);
  const { wave, made } = recordingWave({ gridSize: 64 });
  const screen = new RecordingSurface(2048, 2048);
  wave.step(SPACE); // 64², 13 steps per tick
  wave.step(NO_INPUT);
  wave.draw(screen as unknown as Surface);

  expect(made.length).toBe(1);
  const off = made[0] as RecordingSurface;
  expect([off.width, off.height]).toEqual([1024, 1024]);
  expect(off.draws.length).toBe(13);
  expect(screen.blits).toEqual([{ src: off, x: 0, y: 0 }]);

  // Each draw is the cell's tile (grass/sand/water = sx 0/16/32 of three.png) at x*16, y*16.
  const cells = wave.snapshot({ full: true }).cells ?? [];
  for (const d of off.draws) {
    const cell = cells[d.x / 16]?.[d.y / 16];
    expect(cell?.collapsed).toBe(true);
    expect(d.solid).toBe(false);
    expect(d.sx).toBe(((cell?.possible[0] ?? 0) - 1) * 16);
  }

  // Nothing new collapsed: nothing redrawn.
  wave.draw(screen as unknown as Surface);
  expect(off.draws.length).toBe(13);

  wave.step(NO_INPUT);
  wave.draw(screen as unknown as Surface);
  expect(off.draws.length).toBe(26);
  expect(new Set(off.draws.map((d) => `${d.x},${d.y}`)).size).toBe(26);

  // A reset starts a fresh offscreen surface sized to the new grid.
  wave.gridSize = 128;
  wave.step(NO_INPUT);
  wave.step(SPACE);
  wave.draw(screen as unknown as Surface);
  expect(made.length).toBe(2);
  expect([made[1]?.width, made[1]?.height]).toEqual([2048, 2048]);
  expect(made[1]?.draws.length).toBe(0);
});
