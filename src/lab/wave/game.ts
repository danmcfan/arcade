// Port of internal/wave/game.go as a lab scene (D6). The four Go package
// globals (`gridSize`, `seconds`, `activeGridSize`, `activeSeconds`) are
// instance fields; debugui is replaced by an HTML overlay (overlay.ts).

import { fnv1a32 } from "../../engine/gomath.ts";
import type { Input } from "../../engine/input.ts";
import * as rng from "../../engine/rng.ts";
import { waveThree } from "../../engine/assets.ts";
import { makeSolid, sub, whole, type Sprite } from "../../engine/image.ts";
import { Surface } from "../../engine/surface.ts";
import type { Scene, WaveOptions } from "../../game/software.ts";
import type { WaveSnapshot } from "../../game/snapshot.ts";
import { Grid, type Cell } from "./grid.ts";
import { mountWaveOverlay } from "./overlay.ts";

export const tileSize = 16;
export const framesPerSecond = 60;

/** Package-init values of the Go globals. */
export const defaultGridSize = 128;
export const defaultSeconds = 5;

const img = whole(waveThree);
const tileBlack = makeSolid(tileSize, tileSize, "#000000");
const tileGrass = sub(img, 0, 0, 16, 16);
const tileSand = sub(img, 16, 0, 32, 16);
const tileWater = sub(img, 32, 0, 48, 16);

/** Indexed by pattern; 0 (black) is never produced by the grid. */
const tiles: readonly Sprite[] = [tileBlack, tileGrass, tileSand, tileWater];

/** The offscreen surface collapsed cells are painted into, per grid. */
interface CellCanvas {
  grid: Grid;
  surface: Surface;
  /** `painted[x*height + y]`: 1 once that cell's tile is on `surface`. */
  painted: Uint8Array;
  paintedCount: number;
}

/**
 * §4.3 `cellsHash`: FNV-1a over `x, y, possible[0]` of every collapsed
 * single-pattern cell, in Draw order (x outer, y inner).
 */
export function cellsHash(g: Grid): number {
  const values: number[] = [];
  for (let x = 0; x < g.cells.length; x++) {
    const col = g.cells[x] ?? [];
    for (let y = 0; y < col.length; y++) {
      const cell = col[y];
      if (cell === undefined || !cell.collapsed || cell.possible.length !== 1) {
        continue;
      }
      values.push(x, y, cell.possible[0] ?? 0);
    }
  }
  return fnv1a32(values);
}

export class Wave implements Scene {
  readonly name = "wave";

  /** Pending slider values (Go globals `gridSize`, `seconds`). */
  gridSize: number;
  seconds: number;
  /** Applied values (Go globals `activeGridSize`, `activeSeconds`). */
  activeGridSize = defaultGridSize;
  activeSeconds = defaultSeconds;

  grid: Grid;
  private tick = 0;
  /** Previous tick's held Space, for the rising edge. */
  private prevSpace = false;
  /** `draw` calls, for the overlay's FPS readout. */
  private frames = 0;

  /** Created lazily in `draw` (D12); replaced when the grid is. */
  private canvas: CellCanvas | null = null;
  /** Offscreen factory; a seam so tests can record draws without a DOM. */
  createOffscreen: (w: number, h: number) => Surface = (w, h) => Surface.offscreen(w, h);

  /** Go `New()`: the first grid reads the pending `gridSize`. */
  constructor(opts: Partial<WaveOptions> = {}) {
    this.gridSize = opts.gridSize ?? defaultGridSize;
    this.seconds = opts.seconds ?? defaultSeconds;
    this.grid = new Grid(this.gridSize, this.gridSize);
  }

  /** Go `StepInterval()`: grid steps per tick, integer division. */
  stepInterval(): number {
    return Math.trunc((this.activeGridSize * this.activeGridSize) / (framesPerSecond * this.activeSeconds));
  }

  /**
   * Go `Update` minus debugui. Go reads `inpututil.AppendJustPressedKeys`;
   * here a rising edge of the held `space` stands in for "just pressed" (§4.2).
   */
  step(i: Input): void {
    this.tick++;
    const spaceJustPressed = i.space && !this.prevSpace;
    this.prevSpace = i.space;

    if (spaceJustPressed) {
      this.activeGridSize = this.gridSize;
      this.activeSeconds = this.seconds;
      this.grid = new Grid(this.activeGridSize, this.activeGridSize);
    } else {
      for (let n = this.stepInterval(), k = 0; k < n; k++) {
        this.grid.step();
      }
    }
  }

  /**
   * Go `Draw` minus `ui.Draw` (the overlay is HTML, D6). Go redraws every
   * collapsed cell each frame; cells never un-collapse until a reset makes a
   * new grid, so this paints only newly collapsed cells into a persistent
   * offscreen surface and blits it. Tiles do not overlap, so paint order does
   * not matter; uncollapsed cells stay transparent.
   */
  draw(screen: Surface): void {
    this.frames++;
    const canvas = this.currentCanvas();
    if (canvas.paintedCount !== canvas.grid.collapsedCount) paintNewCells(canvas);
    screen.drawSurface(canvas.surface, 0, 0);
  }

  /** The offscreen canvas for the current grid; a new grid gets a fresh one. */
  private currentCanvas(): CellCanvas {
    const canvas = this.canvas;
    if (canvas !== null && canvas.grid === this.grid) return canvas;
    const g = this.grid;
    const fresh: CellCanvas = {
      grid: g,
      surface: this.createOffscreen(tileSize * g.width, tileSize * g.height),
      painted: new Uint8Array(g.width * g.height),
      paintedCount: 0,
    };
    this.canvas = fresh;
    return fresh;
  }

  /** The debugui window, as an HTML overlay outside the canvas (D6). */
  mountOverlay(parent: HTMLElement): () => void {
    return mountWaveOverlay(parent, this);
  }

  collapsedCount(): number {
    return this.grid.collapsedCount;
  }

  frameCount(): number {
    return this.frames;
  }

  tickCount(): number {
    return this.tick;
  }

  layout(): [number, number] {
    return [tileSize * this.activeGridSize, tileSize * this.activeGridSize];
  }

  snapshot(opts?: { full?: boolean }): WaveSnapshot {
    const s: WaveSnapshot = {
      tick: this.tick,
      rng: rng.state(),
      collapsed: this.grid.collapsedCount,
      width: this.grid.width,
      cellsHash: cellsHash(this.grid),
    };
    if (opts?.full === true) {
      s.cells = this.grid.cells.map((col) =>
        col.map((c) => ({ possible: c.possible.slice(), collapsed: c.collapsed })),
      );
    }
    return s;
  }
}

/** Paint every collapsed cell not yet on `canvas`. */
function paintNewCells(canvas: CellCanvas): void {
  const g = canvas.grid;
  for (let x = 0; x < g.width; x++) {
    const col = g.cells[x] ?? [];
    for (let y = 0; y < g.height; y++) {
      const cell = col[y];
      if (cell !== undefined) paintCell(canvas, x, y, cell);
    }
  }
}

/** Paint cell (x, y) when it is collapsed to one tile and not yet painted. */
function paintCell(canvas: CellCanvas, x: number, y: number, cell: Cell): void {
  const i = x * canvas.grid.height + y;
  if ((canvas.painted[i] ?? 0) !== 0 || !cell.collapsed || cell.possible.length !== 1) return;
  const tile = tiles[cell.possible[0] ?? 0];
  if (tile === undefined) throw new Error("index out of range");
  canvas.surface.draw(tile, x * tileSize, y * tileSize);
  canvas.painted[i] = 1;
  canvas.paintedCount++;
}
