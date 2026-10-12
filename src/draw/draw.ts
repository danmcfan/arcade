// Port of internal/draw/draw.go (D8): the 2D vector helpers Brass Monkey uses.
// Go's `CutImage` and `DrawImage` are engine calls here: `sub()` in
// src/engine/image.ts and `Surface.draw` in src/engine/surface.ts.

/** Go `draw.Vector` (a value type: helpers return new vectors). */
export interface Vector {
  x: number;
  y: number;
}

/** Go `draw.NewVector`. */
export function newVector(x: number, y: number): Vector {
  return { x, y };
}

/** Go `draw.Add`. */
export function add(a: Vector, b: Vector): Vector {
  return newVector(a.x + b.x, a.y + b.y);
}

/** Go `draw.Sub`. */
export function sub(a: Vector, b: Vector): Vector {
  return newVector(a.x - b.x, a.y - b.y);
}
