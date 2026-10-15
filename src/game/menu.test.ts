import { afterEach, describe, expect, test } from "bun:test";
import { addSoundListener, type SoundEvent } from "../engine/audio.ts";
import type { MenuEdges } from "../engine/input.ts";
import { Menu, type MenuItem } from "./menu.ts";

const none: MenuEdges = { up: false, down: false, left: false, right: false, space: false, escape: false };
const press = (k: keyof MenuEdges): MenuEdges => ({ ...none, [k]: true });

let heard: SoundEvent[] = [];
const stop = addSoundListener((e) => {
  if (e.startsWith("play:")) heard.push(e);
});
afterEach(() => {
  heard = [];
});
process.on("exit", stop);

function item(label: string, chosen: string[], enabled = true): MenuItem {
  return {
    label,
    enabled,
    choose: (): void => {
      chosen.push(label);
    },
  };
}

describe("Menu", () => {
  test("Down and Up move the cursor, wrapping at both ends, with a blip", () => {
    const m = new Menu(() => [item("A", []), item("B", []), item("C", [])]);
    expect(m.step(press("up"))).toBe("moved");
    expect(m.cursor).toBe(2);
    expect(m.step(press("down"))).toBe("moved");
    expect(m.cursor).toBe(0);
    expect(heard).toEqual(["play:move", "play:move"]);
  });

  test("Space chooses the selected item with the select sound", () => {
    const chosen: string[] = [];
    const m = new Menu(() => [item("A", chosen), item("B", chosen)]);
    m.step(press("down"));
    heard = [];
    expect(m.step(press("space"))).toBe("chosen");
    expect(chosen).toEqual(["B"]);
    expect(heard).toEqual(["play:select"]);
  });

  test("Space on a disabled item does nothing but the deny sound", () => {
    const chosen: string[] = [];
    const m = new Menu(() => [item("A", chosen, false)]);
    expect(m.step(press("space"))).toBe("denied");
    expect(chosen).toEqual([]);
    expect(heard).toEqual(["play:deny"]);
  });

  test("Esc backs out with the select sound, or is ignored by a menu with no way back", () => {
    let backs = 0;
    const m = new Menu(
      () => [item("A", [])],
      () => {
        backs++;
      },
    );
    expect(m.step(press("escape"))).toBe("back");
    expect(backs).toBe(1);
    expect(heard).toEqual(["play:select"]);
    heard = [];
    expect(new Menu(() => [item("A", [])]).step(press("escape"))).toBeNull();
    expect(heard).toEqual([]);
  });

  test("no key: nothing happens", () => {
    expect(new Menu(() => [item("A", [])]).step(none)).toBeNull();
    expect(heard).toEqual([]);
  });

  test("labels lists every label, disabled or not", () => {
    const m = new Menu(() => [item("A", []), item("B", [], false), item("C", [], false)]);
    expect(m.items().map((i) => i.enabled)).toEqual([true, false, false]);
    expect(m.labels()).toEqual(["A", "B", "C"]);
  });

  test("open puts the cursor back on the first item", () => {
    const m = new Menu(() => [item("A", []), item("B", [])]);
    m.step(press("down"));
    m.open();
    expect(m.cursor).toBe(0);
  });

  test("open(at) puts the cursor on item at", () => {
    const m = new Menu(() => [item("A", []), item("B", [])]);
    m.open(1);
    expect(m.cursor).toBe(1);
  });

  test("Left and Right do nothing in a list", () => {
    const m = new Menu(() => [item("A", []), item("B", [])]);
    expect(m.step(press("right"))).toBeNull();
    expect(m.cursor).toBe(0);
    expect(heard).toEqual([]);
  });

  test("with a move function the arrows go where it says, with a blip", () => {
    const moves: [number, number, number][] = [];
    const m = new Menu(
      () => [item("A", []), item("B", []), item("C", [])],
      undefined,
      (cursor, dx, dy) => {
        moves.push([cursor, dx, dy]);
        return 2;
      },
    );
    expect(m.step(press("left"))).toBe("moved");
    expect(m.cursor).toBe(2);
    m.step(press("up"));
    expect(moves).toEqual([
      [0, -1, 0],
      [2, 0, -1],
    ]);
    expect(heard).toEqual(["play:move", "play:move"]);
  });

  test("Space on an inert item does nothing and plays no sound", () => {
    const chosen: string[] = [];
    const m = new Menu(() => [{ ...item("A", chosen), inert: true }]);
    expect(m.step(press("space"))).toBeNull();
    expect(chosen).toEqual([]);
    expect(heard).toEqual([]);
  });
});
