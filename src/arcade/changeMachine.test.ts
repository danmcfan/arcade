import { describe, expect, test } from "bun:test";
import { changeMachineFrameTicks, changeMachineSweeps } from "../ui/changeMachineArt.ts";
import { changeMachineFrame } from "./changeMachine.ts";

describe("changeMachineFrame: the twinkle loops one frame per changeMachineFrameTicks", () => {
  const frames = changeMachineSweeps.length;
  test("holds each frame for its ticks, then moves on", () => {
    expect(changeMachineFrame(0)).toBe(0);
    expect(changeMachineFrame(changeMachineFrameTicks - 1)).toBe(0);
    expect(changeMachineFrame(changeMachineFrameTicks)).toBe(1);
    expect(changeMachineFrame(changeMachineFrameTicks * (frames - 1))).toBe(frames - 1);
  });
  test("starts over after the last frame", () => {
    expect(changeMachineFrame(changeMachineFrameTicks * frames)).toBe(0);
    expect(changeMachineFrame(changeMachineFrameTicks * frames * 7 + changeMachineFrameTicks * 3)).toBe(3);
  });
  test("is 8 ticks a frame, as prototyped", () => {
    expect(changeMachineFrameTicks).toBe(8);
  });
});
