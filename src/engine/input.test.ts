import { describe, expect, test } from "bun:test";
import { NO_INPUT, axis, direction, moving, opposite, readInput, type Input } from "./input.ts";

const held = (over: Partial<Input>): Input => ({ ...NO_INPUT, ...over });

describe("readInput", () => {
  test("maps WASD and arrows to held directions", () => {
    expect(readInput(new Set(["KeyW", "ArrowLeft"]), new Set())).toEqual(held({ up: true, left: true }));
    expect(readInput(new Set(["ArrowDown", "KeyD"]), new Set())).toEqual(held({ down: true, right: true }));
  });

  test("space and escape are held state", () => {
    expect(readInput(new Set(["Space", "Escape"]), new Set())).toEqual(held({ space: true, escape: true }));
  });

  test("shiftP needs Shift held and P just pressed this tick", () => {
    expect(readInput(new Set(["ShiftLeft", "KeyP"]), new Set(["KeyP"])).shiftP).toBe(true);
    expect(readInput(new Set(["ShiftRight", "KeyP"]), new Set(["KeyP"])).shiftP).toBe(true);
    expect(readInput(new Set(["ShiftLeft", "KeyP"]), new Set()).shiftP).toBe(false);
    expect(readInput(new Set(["KeyP"]), new Set(["KeyP"])).shiftP).toBe(false);
  });
});

describe("direction helpers", () => {
  test("direction priority is Up, Down, Left, Right", () => {
    expect(direction(held({ up: true, down: true, left: true, right: true }))).toBe("UP");
    expect(direction(held({ down: true, left: true, right: true }))).toBe("DOWN");
    expect(direction(held({ left: true, right: true }))).toBe("LEFT");
    expect(direction(held({ right: true }))).toBe("RIGHT");
    expect(direction(NO_INPUT)).toBe("");
  });

  test("moving ignores space and escape", () => {
    expect(moving(held({ space: true, escape: true }))).toBe(false);
    expect(moving(held({ left: true }))).toBe(true);
  });

  test("opposite and axis", () => {
    expect(opposite("UP")).toBe("DOWN");
    expect(opposite("LEFT")).toBe("RIGHT");
    expect(axis("DOWN")).toBe("VERTICAL");
    expect(axis("RIGHT")).toBe("HORIZONTAL");
    expect(() => opposite("" as never)).toThrow("invalid direction: ");
  });
});
