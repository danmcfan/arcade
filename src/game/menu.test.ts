import { afterEach, describe, expect, test } from "bun:test";
import { addSoundListener, type SoundEvent } from "../engine/audio.ts";
import type { MenuEdges } from "../engine/input.ts";
import { Menu, type MenuItem } from "./menu.ts";

const none: MenuEdges = { up: false, down: false, space: false, escape: false };
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

  test("greyed lists the disabled items; labels lists every label", () => {
    const m = new Menu(() => [item("A", []), item("B", [], false), item("C", [], false)]);
    expect(m.greyed()).toEqual([1, 2]);
    expect(m.labels()).toEqual(["A", "B", "C"]);
  });

  test("open puts the cursor back on the first item", () => {
    const m = new Menu(() => [item("A", []), item("B", [])]);
    m.step(press("down"));
    m.open();
    expect(m.cursor).toBe(0);
  });
});
