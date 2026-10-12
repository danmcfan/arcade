import { describe, expect, test } from "bun:test";
import { KeyTracker, installKeyboard, shouldPreventDefault } from "./keyboard.ts";

describe("KeyTracker (D3: input is read per tick)", () => {
  test("a held key is just-pressed on the first tick only", () => {
    const keys = new KeyTracker();
    keys.keyDown("KeyP");
    const t1 = keys.sample();
    const t2 = keys.sample();
    expect([...t1.pressed]).toEqual(["KeyP"]);
    expect([...t1.justPressed]).toEqual(["KeyP"]);
    expect([...t2.pressed]).toEqual(["KeyP"]);
    expect([...t2.justPressed]).toEqual([]);
  });

  test("releasing and pressing again between ticks is a new press", () => {
    const keys = new KeyTracker();
    keys.keyDown("Space");
    keys.sample();
    keys.keyUp("Space");
    expect(keys.sample().pressed.size).toBe(0);
    keys.keyDown("Space");
    expect([...keys.sample().justPressed]).toEqual(["Space"]);
  });

  test("auto-repeat keydowns do not re-trigger just-pressed", () => {
    const keys = new KeyTracker();
    keys.keyDown("KeyP");
    keys.sample();
    keys.keyDown("KeyP");
    expect(keys.sample().justPressed.size).toBe(0);
  });

  test("clear() releases everything (blur / visibilitychange)", () => {
    const keys = new KeyTracker();
    keys.keyDown("ArrowLeft");
    keys.keyDown("ShiftLeft");
    keys.sample();
    keys.clear();
    expect(keys.sample().pressed.size).toBe(0);
  });

  test("ignoreHeld() hides held keys, auto-repeat included, until each is released", () => {
    const keys = new KeyTracker();
    keys.keyDown("Space");
    keys.keyDown("KeyK");
    keys.sample();
    keys.ignoreHeld();
    expect(keys.sample().pressed.size).toBe(0);
    keys.keyDown("Space"); // auto-repeat
    expect(keys.sample().pressed.size).toBe(0);
    keys.keyUp("Space");
    keys.keyDown("Space");
    expect([...keys.sample().justPressed]).toEqual(["Space"]);
    keys.keyDown("ArrowUp");
    expect([...keys.sample().justPressed]).toEqual(["ArrowUp"]);
  });

  test("clear() also forgets ignored keys, whose keyup may never arrive", () => {
    const keys = new KeyTracker();
    keys.keyDown("Space");
    keys.ignoreHeld();
    keys.clear();
    keys.keyDown("Space");
    expect([...keys.sample().justPressed]).toEqual(["Space"]);
  });

  test("samples are snapshots, not live views", () => {
    const keys = new KeyTracker();
    keys.keyDown("KeyW");
    const t1 = keys.sample();
    keys.keyUp("KeyW");
    expect(t1.pressed.has("KeyW")).toBe(true);
  });
});

describe("installKeyboard", () => {
  class FakeTarget {
    readonly listeners = new Map<string, (e: Event) => void>();
    addEventListener(type: string, fn: (e: Event) => void): void {
      this.listeners.set(type, fn);
    }
    removeEventListener(type: string): void {
      this.listeners.delete(type);
    }
    fire(type: string, e: object): void {
      this.listeners.get(type)?.(e as Event);
    }
  }

  function keyEvent(code: string) {
    return {
      code,
      prevented: false,
      preventDefault() {
        this.prevented = true;
      },
    };
  }

  test("routes keydown/keyup codes into the tracker and clears on blur", () => {
    const win = new FakeTarget();
    const doc = new FakeTarget();
    const keys = new KeyTracker();
    const remove = installKeyboard(keys, win, doc, () => true);
    win.fire("keydown", keyEvent("KeyA"));
    expect(keys.sample().pressed.has("KeyA")).toBe(true);
    win.fire("keyup", keyEvent("KeyA"));
    expect(keys.sample().pressed.has("KeyA")).toBe(false);
    win.fire("keydown", keyEvent("KeyD"));
    win.fire("blur", {});
    expect(keys.sample().pressed.size).toBe(0);
    remove();
    expect(win.listeners.size).toBe(0);
    expect(doc.listeners.size).toBe(0);
  });

  test("falls back to the key when code is empty (synthetic CDP events, e.g. agent-browser)", () => {
    const win = new FakeTarget();
    const keys = new KeyTracker();
    installKeyboard(keys, win, new FakeTarget(), () => false);
    for (const key of ["ArrowRight", " ", "Shift", "P", "w", "Escape"]) win.fire("keydown", { ...keyEvent(""), key });
    expect([...keys.sample().pressed].sort()).toEqual(["ArrowRight", "Escape", "KeyP", "KeyW", "ShiftLeft", "Space"]);
    win.fire("keyup", { ...keyEvent(""), key: "ArrowRight" });
    expect(keys.sample().pressed.has("ArrowRight")).toBe(false);
  });

  test("clears when the page becomes hidden", () => {
    const win = new FakeTarget();
    const doc = new FakeTarget();
    const keys = new KeyTracker();
    let hidden = false;
    installKeyboard(keys, win, doc, () => hidden);
    win.fire("keydown", keyEvent("KeyD"));
    hidden = true;
    doc.fire("visibilitychange", {});
    expect(keys.sample().pressed.size).toBe(0);
  });

  test("prevents page scrolling for arrows and Space only", () => {
    expect(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].every(shouldPreventDefault)).toBe(true);
    expect(shouldPreventDefault("KeyW")).toBe(false);
    expect(shouldPreventDefault("Escape")).toBe(false);

    const win = new FakeTarget();
    installKeyboard(new KeyTracker(), win, new FakeTarget(), () => false);
    const space = keyEvent("Space");
    const w = keyEvent("KeyW");
    win.fire("keydown", space);
    win.fire("keydown", w);
    expect(space.prevented).toBe(true);
    expect(w.prevented).toBe(false);
  });
});
