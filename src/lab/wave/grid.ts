// Port of internal/wave/grid/grid.go: wave-function-collapse over a
// width × height grid of tiles (1 grass, 2 sand, 3 water; 0 is unused).
// Every random call goes through src/engine/rng.ts in Go's math/rand order.

import * as rng from "../../engine/rng.ts";

/** Go `struct{ x, y int }`. */
export interface Pos {
  x: number;
  y: number;
}

/** Go `grid.Cell`. */
export interface Cell {
  possible: readonly number[];
  collapsed: boolean;
}

/**
 * `constraints[value][direction]`: the patterns a neighbour may take.
 * Directions index `neighbors()` order: 0 up, 1 right, 2 down, 3 left.
 */
export const constraints: readonly (readonly (readonly number[])[])[] = [
  [[1, 2, 3], [1, 2, 3], [1, 2, 3], [1, 2, 3]],
  [[1, 2], [1, 2], [1, 2], [1, 2]],
  [[1, 2, 3], [1, 2, 3], [1, 2, 3], [1, 2, 3]],
  [[2, 3], [2, 3], [2, 3], [2, 3]],
];

/** Index a Go-style `[][]T` whose bounds the caller has already checked. */
function at<T>(rows: readonly (readonly T[])[], x: number, y: number): T {
  const v = rows[x]?.[y];
  if (v === undefined) throw new Error(`index out of range [${x}][${y}]`);
  return v;
}

export class Grid {
  readonly width: number;
  readonly height: number;
  /** Indexed `cells[x][y]`, as Go `Cells`. */
  readonly cells: Cell[][];
  collapsedCount = 0;
  readonly patterns: readonly number[] = [1, 2, 3];
  readonly constraints = constraints;

  /** Go `map[int][]struct{x, y int}`, keyed by entropy 0..len(patterns). */
  readonly entropyBuckets: Pos[][] = [];
  readonly entropy: number[][];
  readonly bucketIndex: number[][];

  /** Go `grid.New(width, height)`. */
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cells = [];
    this.entropy = [];
    this.bucketIndex = [];
    for (let x = 0; x < width; x++) {
      const cells: Cell[] = [];
      for (let y = 0; y < height; y++) cells.push({ possible: [], collapsed: false });
      this.cells.push(cells);
      this.entropy.push(new Array<number>(height).fill(0));
      this.bucketIndex.push(new Array<number>(height).fill(0));
    }
    this.reset();
  }

  cell(x: number, y: number): Cell {
    return at(this.cells, x, y);
  }

  private bucket(e: number): Pos[] {
    const b = this.entropyBuckets[e];
    if (b === undefined) throw new Error(`no entropy bucket ${e}`);
    return b;
  }

  reset(): void {
    const n = this.patterns.length;
    for (let e = 0; e < n + 1; e++) this.entropyBuckets[e] = [];

    const top = this.bucket(n);
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const cell = this.cell(x, y);
        cell.possible = this.patterns.slice();
        cell.collapsed = false;

        this.setBucketIndex(x, y, top.length);
        this.setEntropy(x, y, n);
        top.push({ x, y });
      }
    }

    this.collapsedCount = 0;
  }

  step(): void {
    if (this.collapsedCount === this.width * this.height) {
      return;
    }

    let x: number;
    let y: number;
    if (this.collapsedCount === 0) {
      // Go evaluates `rand.Intn(g.Width), rand.Intn(g.Height)` left to right.
      x = rng.intn(this.width);
      y = rng.intn(this.height);
    } else {
      ({ x, y } = this.next());
    }

    this.collapse(x, y);
    this.propogate(x, y);
  }

  /** A random cell from the lowest non-empty entropy bucket above 0. */
  next(): Pos {
    for (let e = 1; e <= this.patterns.length; e++) {
      const cells = this.bucket(e);
      if (cells.length > 0) {
        const sel = cells[rng.intn(cells.length)];
        if (sel === undefined) throw new Error("index out of range");
        return { x: sel.x, y: sel.y };
      }
    }
    throw new Error("no next cell found");
  }

  collapse(x: number, y: number): void {
    const cell = this.cell(x, y);
    this.updateEntropy(x, y, cell.possible.length, 0);
    const selection = cell.possible[rng.intn(cell.possible.length)];
    if (selection === undefined) throw new Error("index out of range");
    cell.possible = [selection];
    cell.collapsed = true;
    this.collapsedCount++;
  }

  /**
   * Narrow each uncollapsed in-bounds neighbour. The neighbour's set is
   * **replaced** by the constraint row only when that row is shorter; it is
   * never intersected (grid.go:150-153). The assigned row is shared with the
   * constraints table, as in Go; nothing mutates it.
   */
  propogate(x: number, y: number): void {
    const cell = this.cell(x, y);

    const value = cell.possible[0];
    if (cell.possible.length !== 1 || value === undefined) {
      throw new Error(`cell (${x}, ${y}) has ${cell.possible.length} possible values`);
    }

    const neighbors = this.neighbors(x, y);
    for (let direction = 0; direction < neighbors.length; direction++) {
      const neighbor = neighbors[direction];
      if (neighbor === undefined || !this.inBounds(neighbor.x, neighbor.y)) {
        continue;
      }

      const nCell = this.cell(neighbor.x, neighbor.y);
      if (nCell.collapsed) {
        continue;
      }

      let nDirection = -1;
      switch (direction) {
        case 0:
          nDirection = 2;
          break;
        case 1:
          nDirection = 3;
          break;
        case 2:
          nDirection = 0;
          break;
        case 3:
          nDirection = 1;
          break;
      }

      const newPossible = at(this.constraints, value, nDirection);

      if (newPossible.length < nCell.possible.length) {
        this.updateEntropy(neighbor.x, neighbor.y, nCell.possible.length, newPossible.length);
        nCell.possible = newPossible;
      }
    }
  }

  /** Swap-remove (x, y) from bucket `oldEntropy`, append it to `newEntropy`. */
  updateEntropy(x: number, y: number, oldEntropy: number, newEntropy: number): void {
    const oldBucket = this.bucket(oldEntropy);
    const idx = at(this.bucketIndex, x, y);

    const lastIdx = oldBucket.length - 1;
    if (idx !== lastIdx) {
      const lastCell = oldBucket[lastIdx];
      if (lastCell === undefined) throw new Error("index out of range [-1]");
      oldBucket[idx] = lastCell;
      this.setBucketIndex(lastCell.x, lastCell.y, idx);
    }
    // Go reslices `oldBucket[:lastIdx]`, which panics on an empty bucket.
    if (lastIdx < 0) throw new Error("slice bounds out of range [:-1]");
    oldBucket.length = lastIdx;

    const newBucket = this.bucket(newEntropy);
    this.setBucketIndex(x, y, newBucket.length);
    newBucket.push({ x, y });
    this.setEntropy(x, y, newEntropy);
  }

  /** Up, right, down, left. */
  neighbors(x: number, y: number): [Pos, Pos, Pos, Pos] {
    return [
      { x, y: y - 1 },
      { x: x + 1, y },
      { x, y: y + 1 },
      { x: x - 1, y },
    ];
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  private setBucketIndex(x: number, y: number, v: number): void {
    const row = this.bucketIndex[x];
    if (row === undefined) throw new Error(`index out of range [${x}]`);
    row[y] = v;
  }

  private setEntropy(x: number, y: number, v: number): void {
    const row = this.entropy[x];
    if (row === undefined) throw new Error(`index out of range [${x}]`);
    row[y] = v;
  }
}
