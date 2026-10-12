import { expect, test } from "bun:test";
import { NO_INPUT } from "./input.ts";
import { fakeCanvas } from "./fakeCanvas.testutil.ts";
import { Surface } from "./surface.ts";
import { createTestPattern } from "./testPattern.ts";

test("the temporary test pattern is a 192x176 scene that steps and draws headlessly", () => {
  const scene = createTestPattern();
  expect(scene.layout()).toEqual([192, 176]);
  scene.step({ ...NO_INPUT, right: true });
  scene.step({ ...NO_INPUT, right: true });
  const snap = scene.snapshot();
  expect(snap.tick).toBe(2);
  const { canvas, ctx } = fakeCanvas(192, 176);
  scene.draw(new Surface(canvas));
  expect(ctx.ops.length).toBeGreaterThan(0);
});
