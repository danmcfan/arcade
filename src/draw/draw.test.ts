import { describe, expect, test } from "bun:test";
import { add, newVector, sub } from "./draw.ts";

describe("draw vectors (internal/draw)", () => {
  test("add and sub work component-wise and return new vectors", () => {
    const a = newVector(16, 240);
    expect(add(a, newVector(16, 16))).toEqual({ x: 32, y: 256 });
    expect(sub(a, newVector(8, 8))).toEqual({ x: 8, y: 232 });
    expect(a).toEqual({ x: 16, y: 240 });
  });
});
