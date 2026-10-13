import { expect, test } from "bun:test";
import { NO_INPUT } from "../engine/input.ts";
import { expandSteps } from "./script.ts";

test("expands steps into one Input per tick, defaulting missing keys to false", () => {
  const ticks = expandSteps([
    { ticks: 2, input: { left: true } },
    { ticks: 1, input: {} },
  ]);
  expect(ticks).toEqual([{ ...NO_INPUT, left: true }, { ...NO_INPUT, left: true }, { ...NO_INPUT }]);
});

test("shiftP is just-pressed on the first tick of its step only", () => {
  const ticks = expandSteps([{ ticks: 3, input: { shiftP: true, up: true } }]);
  expect(ticks.map((i) => i.shiftP)).toEqual([true, false, false]);
  expect(ticks.map((i) => i.up)).toEqual([true, true, true]);
});
