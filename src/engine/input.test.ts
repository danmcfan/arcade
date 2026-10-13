import { describe, expect, test } from "bun:test";
import { MenuKeys, NO_INPUT, axis, direction, moving, opposite, readInput, type Input } from "./input.ts";

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

describe("MenuKeys", () => {
  test("reports menu keys on the tick they go down, not while held", () => {
    const keys = new MenuKeys();
    expect(keys.read(held({ space: true })).edges).toEqual({ up: false, down: false, space: true, escape: false });
    expect(keys.read(held({ space: true })).edges.space).toBe(false);
    expect(keys.read(NO_INPUT).edges.space).toBe(false);
    expect(keys.read(held({ escape: true, down: true })).edges).toEqual({
      up: false,
      down: true,
      space: false,
      escape: true,
    });
  });

  test("anyPressed is true when any key goes down, menu key or not", () => {
    const keys = new MenuKeys();
    expect(keys.read(held({ left: true })).anyPressed).toBe(true);
    expect(keys.read(held({ left: true })).anyPressed).toBe(false);
    expect(keys.read(held({ left: true, right: true })).anyPressed).toBe(true);
  });

  test("maskHeld hides the keys held now until each is released", () => {
    const keys = new MenuKeys();
    keys.read(held({ space: true, up: true }));
    keys.maskHeld();
    expect(keys.unmasked(held({ space: true, up: true, left: true }))).toEqual(held({ left: true }));
    // Up released: it comes back on the next press; Space stays hidden while held.
    expect(keys.unmasked(held({ space: true }))).toEqual(NO_INPUT);
    expect(keys.unmasked(held({ space: true, up: true }))).toEqual(held({ up: true }));
    expect(keys.unmasked(NO_INPUT)).toEqual(NO_INPUT);
    expect(keys.unmasked(held({ space: true }))).toEqual(held({ space: true }));
  });

  test("maskHeld with an input masks that input's keys and replaces the old mask", () => {
    const keys = new MenuKeys();
    keys.maskHeld(held({ space: true }));
    keys.maskHeld(held({ escape: true }));
    expect(keys.unmasked(held({ space: true, escape: true }))).toEqual(held({ space: true }));
  });
});
