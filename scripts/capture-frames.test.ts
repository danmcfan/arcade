import { expect, test } from "bun:test";
import { expandSteps, type InputScript } from "../src/game/script.ts";
import { compressInputs, decodeDataUrl, planCaptures } from "./capture-frames.ts";

const script: InputScript = {
  name: "s",
  scene: "game",
  seed: 1,
  steps: [
    { ticks: 3, input: { left: true } },
    { ticks: 2, input: { shiftP: true, up: true } },
    { ticks: 4, input: {} },
  ],
  captureTicks: [2, 5, 9],
};

test("compressInputs is the inverse of expandSteps", () => {
  const inputs = expandSteps(script.steps);
  const steps = compressInputs(inputs);
  expect(expandSteps(steps)).toEqual(inputs);
  // shiftP gets its own one-tick step so it is not repeated.
  expect(steps.map((s) => s.ticks)).toEqual([3, 1, 1, 4]);
});

test("planCaptures splits the ticks at each capture tick, preserving every input", () => {
  const plan = planCaptures(script);
  expect(plan.map((p) => p.tick)).toEqual([2, 5, 9]);
  expect(plan.flatMap((p) => expandSteps(p.steps))).toEqual(expandSteps(script.steps));
  // Splitting a step mid-way must not re-trigger shiftP on the continuation.
  expect(expandSteps(plan[1]?.steps ?? []).map((i) => i.shiftP)).toEqual([false, true, false]);
});

test("planCaptures sorts capture ticks and rejects ticks outside the script", () => {
  expect(planCaptures({ ...script, captureTicks: [9, 1] }).map((p) => p.tick)).toEqual([1, 9]);
  expect(() => planCaptures({ ...script, captureTicks: [10] })).toThrow("capture tick 10");
  expect(() => planCaptures({ ...script, captureTicks: [0] })).toThrow("capture tick 0");
});

test("decodeDataUrl returns the PNG bytes", () => {
  const bytes = decodeDataUrl("data:image/png;base64,iVBORw0K");
  expect([...bytes.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  expect(() => decodeDataUrl("nope")).toThrow();
});
