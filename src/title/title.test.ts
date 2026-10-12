import { describe, expect, test } from "bun:test";
import { images } from "../engine/assets.ts";
import { addSoundListener, type SoundEvent } from "../engine/audio.ts";
import type { Sprite } from "../engine/image.ts";
import { NO_INPUT, type Input } from "../engine/input.ts";
import type { Surface } from "../engine/surface.ts";
import { Game } from "../game/game.ts";
import { createScene } from "../game/registry.ts";
import type { GameSnapshot } from "../game/snapshot.ts";
import { bandRows, cell, charset, glyphHeight, inkOrder, sheetColumns, type Ink } from "../ui/glyphs.ts";
import { canDraw, keyHeight, textWidth } from "../ui/text.ts";
import { backHints, confirmLines, controls, introLines, menuHints, panelHints, screenWidth } from "./draw.ts";
import { memoryStore, parseSave, type SaveData, type SaveStore } from "./save.ts";
import { confirmMenu, pauseMenu, Title, titleMenu } from "./title.ts";

const press = (k: keyof Input): Input => ({ ...NO_INPUT, [k]: true });

/** Tap `k` (one tick down, one tick up), as a person does. */
function tap(t: Title, k: keyof Input): void {
  t.step(press(k));
  t.step(NO_INPUT);
}

function hold(t: Title, input: Partial<Input>, ticks: number): void {
  for (let n = 0; n < ticks; n++) t.step({ ...NO_INPUT, ...input });
}

function game(t: Title): GameSnapshot {
  const g = t.snapshot().game;
  if (g === null) throw new Error("no game running");
  return g;
}

/** A store that counts writes. */
function spyStore(initial: SaveData | null = null): SaveStore & { saves: number } {
  const inner = memoryStore(initial);
  const store = {
    saves: 0,
    load: () => inner.load(),
    save(d: SaveData) {
      store.saves++;
      inner.save(d);
    },
    clear: () => inner.clear(),
  };
  return store;
}

/** Where a fresh hub player ends up after walking up to the hive ("sweet") cabinet. */
function atCabinet(): SaveData {
  const g = new Game(null);
  for (let n = 0; n < 60; n++) g.step(press("up"));
  const s = g.snapshot();
  g.dispose();
  expect(s.arcade.title).toBe("sweet");
  return { v: 2, highScore: 0, tokens: 5, tickets: 0, player: { x: s.arcade.player.x, y: s.arcade.player.y, dir: "UP" } };
}

describe("title menu", () => {
  test("without a save, only New game is listed and selected", () => {
    const t = new Title();
    expect(titleMenu).toEqual(["CONTINUE", "NEW GAME"]);
    expect(t.snapshot()).toMatchObject({ phase: "menu", items: ["NEW GAME"], cursor: 0, canContinue: false, game: null });
    tap(t, "down");
    expect(t.cursor).toBe(0);
    tap(t, "up");
    expect(t.cursor).toBe(0);
    expect(t.layout()).toEqual([192, 176]);
  });

  test("with a save, the cursor starts on Continue and wraps", () => {
    const t = new Title({ store: memoryStore(atCabinet()) });
    expect(t.snapshot()).toMatchObject({ cursor: 0, canContinue: true });
    tap(t, "down");
    expect(t.cursor).toBe(1);
    tap(t, "down");
    expect(t.cursor).toBe(0);
    tap(t, "up");
    expect(t.cursor).toBe(1);
  });

  test("keys react on the tick they go down, not while held", () => {
    const t = new Title({ store: memoryStore(atCabinet()) });
    hold(t, { down: true }, 30);
    expect(t.cursor).toBe(1);
  });
});

describe("new game", () => {
  test("without a save, New game goes straight to the intro; a held Space does not skip it", () => {
    const t = new Title();
    hold(t, { space: true }, 30);
    expect(t.phase).toBe("intro");
    t.step(NO_INPUT);
    tap(t, "escape");
    expect(t.snapshot()).toMatchObject({ phase: "menu", items: ["NEW GAME"], cursor: 0 });
  });

  test("with a save, New game asks first; No (the default) and Esc keep the save", () => {
    const save: SaveData = { v: 2, highScore: 900, tokens: 5, tickets: 0, player: { x: 50, y: 100, dir: "LEFT" } };
    const store = memoryStore(save);
    const t = new Title({ store });
    tap(t, "down"); // Continue -> New game
    tap(t, "space");
    expect(t.snapshot()).toMatchObject({ phase: "confirm", items: [...confirmMenu], cursor: 0 });
    tap(t, "space");
    expect(t.snapshot()).toMatchObject({ phase: "menu", cursor: 1 });
    tap(t, "space");
    tap(t, "escape");
    expect(t.snapshot()).toMatchObject({ phase: "menu", cursor: 1 });
    expect(store.load()).toEqual(save);
    expect(t.canContinue).toBe(true);
  });

  test("Yes, then Space on the intro, starts a fresh hub and replaces the old save", () => {
    const store = spyStore({ v: 2, highScore: 900, tokens: 5, tickets: 0, player: { x: 50, y: 100, dir: "LEFT" } });
    const t = new Title({ store });
    tap(t, "down"); // Continue -> New game
    tap(t, "space");
    tap(t, "down"); // No -> Yes
    tap(t, "space");
    expect(t.phase).toBe("intro");
    tap(t, "space");
    expect(t.phase).toBe("playing");
    const fresh = new Game(null).snapshot();
    expect(game(t).arcade).toEqual(fresh.arcade);
    expect(game(t).software).toBeNull();
    expect(store.load()).toEqual({ v: 2, highScore: 0, tokens: 5, tickets: 0, player: { x: 80, y: 92, dir: "DOWN" } });
  });

  test("New game resets tokens and tickets", () => {
    const store = memoryStore({ v: 2, highScore: 900, tokens: 0, tickets: 88, player: { x: 50, y: 100, dir: "LEFT" } });
    const t = new Title({ store });
    tap(t, "down");
    tap(t, "space");
    tap(t, "down");
    tap(t, "space");
    tap(t, "space");
    expect(game(t).arcade).toMatchObject({ tokens: 5, tickets: 0, highScore: 0 });
    expect(store.load()).toMatchObject({ tokens: 5, tickets: 0 });
  });
});

describe("continue", () => {
  test("restores the player's position, facing and the high score", () => {
    const t = new Title({ store: memoryStore({ v: 2, highScore: 120, tokens: 5, tickets: 0, player: { x: 50, y: 100, dir: "LEFT" } }) });
    tap(t, "space");
    expect(t.phase).toBe("playing");
    expect(game(t).arcade.player).toMatchObject({ x: 50, y: 100, dir: "LEFT" });
    expect(game(t).arcade.highScore).toBe(120);
  });

  test("the Space that chose Continue does not also start the cabinet in front", () => {
    const t = new Title({ store: memoryStore(atCabinet()) });
    hold(t, { space: true }, 30);
    expect(t.phase).toBe("playing");
    expect(game(t).software).toBeNull();
    t.step(NO_INPUT);
    // Facing the cabinet again (up) and pressing Space starts it.
    hold(t, { up: true, space: true }, 2);
    expect(game(t).software).toBe("hive");
  });

  test("a saved position in or beyond a wall falls back to the start position", () => {
    for (const [x, y] of [[-500, -500], [10, 92], [80, 20], [80, 500]]) {
      const t = new Title({ store: memoryStore({ v: 2, highScore: 0, tokens: 5, tickets: 0, player: { x: x!, y: y!, dir: "UP" } }) });
      tap(t, "space");
      expect(game(t).arcade.player).toMatchObject({ x: 80, y: 92, dir: "UP" });
    }
  });
});

describe("pause menu", () => {
  function playing(store: SaveStore = memoryStore()): Title {
    const t = new Title({ store });
    tap(t, "space");
    tap(t, "space");
    expect(t.phase).toBe("playing");
    return t;
  }

  test("Esc in the hub pauses; the game does not step while paused; Esc resumes", () => {
    const t = playing();
    hold(t, { left: true }, 10);
    const before = game(t);
    tap(t, "escape");
    expect(t.snapshot()).toMatchObject({ phase: "paused", items: [...pauseMenu], cursor: 0 });
    hold(t, { left: true }, 10);
    expect(game(t).tick).toBe(before.tick);
    expect(game(t).arcade.player.x).toBe(before.arcade.player.x);
    tap(t, "escape");
    expect(t.phase).toBe("playing");
  });

  test("Resume and Controls; Space or Esc leaves Controls", () => {
    const t = playing();
    tap(t, "escape");
    tap(t, "space");
    expect(t.phase).toBe("playing");
    tap(t, "escape");
    tap(t, "down");
    tap(t, "space");
    expect(t.phase).toBe("controls");
    tap(t, "escape");
    expect(t.phase).toBe("paused");
    tap(t, "space");
    expect(t.phase).toBe("controls");
    tap(t, "space");
    expect(t.snapshot()).toMatchObject({ phase: "paused", cursor: 1 });
  });

  test("Quit to menu saves and returns to the title with Continue selected", () => {
    const store = memoryStore();
    const t = playing(store);
    hold(t, { left: true }, 20);
    tap(t, "escape");
    tap(t, "up"); // wraps to Quit to menu
    expect(t.cursor).toBe(2);
    tap(t, "space");
    expect(t.snapshot()).toMatchObject({ phase: "menu", cursor: 0, canContinue: true, game: null });
    expect(store.load()?.player).toEqual({ x: 60, y: 92, dir: "LEFT" });
    tap(t, "space");
    expect(game(t).arcade.player).toMatchObject({ x: 60, y: 92, dir: "LEFT" });
  });

  test("restores tokens and tickets", () => {
    const t = new Title({ store: memoryStore({ v: 2, highScore: 120, tokens: 2, tickets: 37, player: { x: 50, y: 100, dir: "LEFT" } }) });
    tap(t, "space");
    expect(game(t).arcade).toMatchObject({ highScore: 120, tokens: 2, tickets: 37 });
  });
});

describe("minigames inside the title scene", () => {
  /** Continue at the hive cabinet, then start it. */
  function inHive(store: SaveStore & { saves: number }): Title {
    const t = new Title({ store });
    tap(t, "space");
    hold(t, { up: true, space: true }, 2);
    t.step(NO_INPUT);
    expect(game(t).software).toBe("hive");
    return t;
  }

  test("a cabinet start saves at once, so the spent token is kept", () => {
    const store = spyStore(atCabinet());
    inHive(store);
    expect(store.load()?.tokens).toBe(4);
  });

  test("Esc in a minigame opens the minigame pause menu, not the hub pause menu", () => {
    const store = spyStore(atCabinet());
    const t = inHive(store);
    tap(t, "escape");
    expect(t.phase).toBe("playing");
    expect(game(t)).toMatchObject({ software: "hive", menu: "paused" });
    tap(t, "escape");
    expect(game(t).menu).toBeNull();
  });

  test("Quit game returns to the hub and saves; the next Esc opens the hub pause menu", () => {
    const store = spyStore(atCabinet());
    const t = inHive(store);
    const saves = store.saves;
    tap(t, "escape");
    tap(t, "down");
    tap(t, "down");
    tap(t, "space");
    expect(game(t).software).toBeNull();
    expect(t.phase).toBe("playing");
    expect(store.saves).toBe(saves + 1);
    expect(store.load()).toMatchObject({ tokens: 4, tickets: 0 });
    tap(t, "escape");
    expect(t.phase).toBe("paused");
  });
});

describe("sounds", () => {
  /** The sound calls made while `fn` runs. */
  function heard(fn: () => void): SoundEvent[] {
    const events: SoundEvent[] = [];
    const off = addSoundListener((e) => events.push(e));
    try {
      fn();
    } finally {
      off();
    }
    return events;
  }

  test("the title music starts on the first tick and plays through the New game check and intro", () => {
    const t = new Title({ store: memoryStore({ v: 2, highScore: 0, tokens: 5, tickets: 0, player: { x: 80, y: 92, dir: "UP" } }) });
    expect(heard(() => t.step(NO_INPUT))).toEqual(["play:title"]);
    // Retried on key presses until the browser lets it play (never, without a DOM).
    expect(heard(() => tap(t, "down"))).toContain("play:title");
    expect(heard(() => tap(t, "space"))).not.toContain("pause:title");
    expect(t.phase).toBe("confirm");
    tap(t, "down");
    expect(heard(() => tap(t, "space"))).not.toContain("pause:title");
    expect(t.phase).toBe("intro");
  });

  test("the music stops when play starts and comes back on Quit to menu", () => {
    const t = new Title();
    t.step(NO_INPUT);
    tap(t, "space");
    const start = heard(() => tap(t, "space"));
    expect(t.phase).toBe("playing");
    expect(start).toContain("pause:title");
    expect(start).toContain("rewind:title");
    expect(heard(() => hold(t, { left: true }, 5))).not.toContain("play:title");
    tap(t, "escape");
    tap(t, "down");
    tap(t, "down");
    expect(heard(() => tap(t, "space"))).toContain("play:title");
    expect(t.phase).toBe("menu");
  });

  test("moving the cursor blips; a choice or Back chirps; nothing else does", () => {
    const t = new Title({ store: memoryStore({ v: 2, highScore: 0, tokens: 5, tickets: 0, player: { x: 80, y: 92, dir: "UP" } }) });
    t.step(NO_INPUT);
    const effects = (fn: () => void) => heard(fn).filter((e) => !e.endsWith(":title"));
    expect(effects(() => tap(t, "down"))).toEqual(["rewind:move", "play:move"]);
    expect(effects(() => tap(t, "escape"))).toEqual([]);
    expect(effects(() => hold(t, { left: true }, 3))).toEqual([]);
    expect(effects(() => tap(t, "space"))).toEqual(["rewind:select", "play:select"]);
    expect(t.phase).toBe("confirm");
    expect(effects(() => tap(t, "escape"))).toEqual(["rewind:select", "play:select"]);
    expect(t.phase).toBe("menu");
  });

  test("the pause menu chirps when it opens and on choices, and blips when the cursor moves", () => {
    const t = new Title();
    tap(t, "space");
    tap(t, "space");
    const select: SoundEvent[] = ["rewind:select", "play:select"];
    expect(heard(() => tap(t, "escape"))).toEqual(expect.arrayContaining(select));
    expect(t.phase).toBe("paused");
    expect(heard(() => tap(t, "down"))).toEqual(["rewind:move", "play:move"]);
    expect(heard(() => tap(t, "space"))).toEqual(select);
    expect(t.phase).toBe("controls");
    expect(heard(() => tap(t, "escape"))).toEqual(select);
    expect(t.phase).toBe("paused");
  });
});

describe("parseSave", () => {
  const ok = { v: 2, highScore: 3, tokens: 4, tickets: 12, player: { x: 1, y: 2, dir: "UP" } };

  test("accepts a v2 save", () => {
    expect(parseSave(ok)).toEqual(ok as SaveData);
    expect(parseSave({ ...ok, tokens: 0, tickets: 0 })).toEqual({ ...ok, tokens: 0, tickets: 0 } as SaveData);
  });

  test("upgrades a v1 save: same high score and position, plus 5 tokens and 0 tickets", () => {
    const v1 = { v: 1, highScore: 3, player: { x: 1, y: 2, dir: "UP" } };
    expect(parseSave(v1)).toEqual({ v: 2, highScore: 3, tokens: 5, tickets: 0, player: { x: 1, y: 2, dir: "UP" } });
    expect(parseSave({ ...v1, player: null })).toBeNull();
  });

  test("rejects anything else", () => {
    for (const bad of [
      null,
      1,
      "x",
      {},
      { ...ok, v: 3 },
      { ...ok, v: 0 },
      { ...ok, highScore: -1 },
      { ...ok, tokens: -1 },
      { ...ok, tokens: 1.5 },
      { ...ok, tickets: Number.POSITIVE_INFINITY },
      { ...ok, tickets: "3" },
      { ...ok, tokens: undefined },
      { ...ok, player: null },
      { ...ok, player: { x: 1, y: Number.NaN, dir: "UP" } },
      { ...ok, player: { x: 1, y: 2, dir: "NORTH" } },
    ]) {
      expect(parseSave(bad)).toBeNull();
    }
  });
});

test('createScene("title") builds the title scene', () => {
  const scene = createScene("title", { store: memoryStore() });
  expect(scene.name).toBe("title");
  scene.step(NO_INPUT);
  expect(scene.snapshot()).toMatchObject({ tick: 1, phase: "menu" });
  scene.dispose?.();
});

// ---------------------------------------------------------------------------
// Drawing: decode font.png draws back into text, so tests read the screen.

interface Glyph {
  ch: string;
  ink: Ink;
  x: number;
  y: number;
}

function recordingSurface() {
  const glyphs: Glyph[] = [];
  const sprites: [string, number, number][] = [];
  /** Key caps, found by the face `drawKey` fills first: x, top and width. */
  const caps: { x: number; y: number; w: number }[] = [];
  /** How many glyphs were drawn before the last dimming fill. */
  let dimmedAt = 0;
  const surface = {
    draw(s: Sprite, x: number, y: number) {
      if (s.asset === images.font) {
        const row = Math.trunc(s.sy / cell);
        const band = Math.trunc(row / bandRows);
        const i = (row % bandRows) * sheetColumns + s.sx / cell;
        expect(s.h).toBe(glyphHeight);
        glyphs.push({ ch: charset[i]!, ink: inkOrder[band]!, x, y });
        return;
      }
      sprites.push([Object.entries(images).find(([, a]) => a === s.asset)?.[0] ?? "?", x, y]);
    },
    fillRect(x: number, y: number, w: number, h: number, colour: string) {
      if (colour === "#566c86" && h === keyHeight - 1) caps.push({ x: x - 1, y, w: w + 2 });
    },
    fillPremul() {
      dimmedAt = glyphs.length;
    },
    strokeRect() {},
  };
  /** The drawn characters in reading order (top to bottom, left to right), optionally of one ink. */
  const text = (ink?: Ink, from = 0) =>
    glyphs
      .slice(from)
      .filter((g) => ink === undefined || g.ink === ink)
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((g) => g.ch)
      .join("");
  /** Each key cap drawn, with the label printed on it. */
  const keys = () =>
    caps.map((c) => ({
      ...c,
      label: glyphs
        .filter((g) => g.y === c.y + 1 && g.x >= c.x && g.x < c.x + c.w)
        .sort((a, b) => a.x - b.x)
        .map((g) => g.ch)
        .join(""),
    }));
  /** Like `text`, but only what was drawn over the last dimming fill (a panel). */
  const over = (ink?: Ink) => text(ink, dimmedAt);
  return { surface: surface as unknown as Surface, sprites, glyphs, text, over, keys };
}

describe("drawing", () => {
  test("every UI string can be drawn and fits on the screen", () => {
    const hints = [...menuHints, ...backHints, ...panelHints];
    const strings = [...titleMenu, ...confirmMenu, ...confirmLines, ...pauseMenu, ...introLines, ...controls.map((c) => c.label), ...hints.flatMap((h) => [...h.keys, h.label]), "GAMES WITHIN A GAME", "PRESS SPACE TO START"];
    for (const s of strings) {
      expect({ s, ok: canDraw(s) }).toEqual({ s, ok: true });
      expect(textWidth(s)).toBeLessThanOrEqual(screenWidth - 8);
    }
  });

  test("the menu draws the logo and tagline (no hub scene), and no Continue without a save", () => {
    const t = new Title();
    const r = recordingSurface();
    t.draw(r.surface);
    // One slice of logo.png per letter of ARCADE, so each can bob.
    expect(r.sprites.map(([name]) => name)).toEqual(Array(6).fill("logo"));
    expect(r.text("blue")).toBe("GAMES WITHIN A GAME");
    expect(r.text("yellow")).toBe(">NEW GAME<");
    expect(r.text("white")).not.toContain("CONTINUE");
    expect(r.text("orange")).toBe("");
  });

  test("the menu's choose and select hints are key caps, as in the controls table", () => {
    const t = new Title();
    const r = recordingSurface();
    t.draw(r.surface);
    const keys = r.keys();
    expect(keys.map((k) => k.label)).toEqual(["↑", "↓", "SPACE"]);
    // One row, below everything else on the menu.
    expect(new Set(keys.map((k) => k.y)).size).toBe(1);
    expect(r.text("white")).toContain("CHOOSE");
    expect(r.text("white")).toContain("OK");
    expect(r.text()).not.toContain("↑↓ CHOOSE");
  });

  test("the New game check draws its warning, No and Yes, and key hints", () => {
    const t = new Title({ store: memoryStore({ v: 2, highScore: 0, tokens: 5, tickets: 0, player: { x: 80, y: 92, dir: "UP" } }) });
    tap(t, "down");
    tap(t, "space");
    const r = recordingSurface();
    t.draw(r.surface);
    expect(r.over()).toBe(`${confirmLines.join("")}>NO<YES↑↓SPACECHOOSEOK`);
    expect(r.over("yellow")).toBe("START A NEW GAME?>NO<");
    expect(r.keys().map((k) => k.label)).toEqual(["↑", "↓", "SPACE"]);
  });

  test("with a save, the menu shows the saved high score (when there is one)", () => {
    const zero = new Title({ store: memoryStore({ v: 2, highScore: 0, tokens: 5, tickets: 0, player: { x: 80, y: 92, dir: "UP" } }) });
    const r0 = recordingSurface();
    zero.draw(r0.surface);
    expect(r0.text("orange")).toBe("");

    const t = new Title({ store: memoryStore({ v: 2, highScore: 120, tokens: 5, tickets: 0, player: { x: 80, y: 92, dir: "UP" } }) });
    const r = recordingSurface();
    t.draw(r.surface);
    expect(r.text("yellow")).toBe(">CONTINUE<");
    expect(r.text("orange")).toBe("HIGH SCORE 120");
  });

  test("the logo's letters bob on a wave and the selection arrows move in and out", () => {
    const t = new Title();
    const frames = Array.from({ length: 60 }, () => {
      const r = recordingSurface();
      t.draw(r.surface);
      hold(t, {}, 1);
      return r;
    });
    const letterTops = frames.map((r) => r.sprites.map(([, , y]) => y).join());
    expect(new Set(letterTops).size).toBeGreaterThan(1);
    // Mid-wave, neighbouring letters sit at different heights.
    expect(new Set(frames[10]!.sprites.map(([, , y]) => y)).size).toBeGreaterThan(1);

    const gaps = frames.map((r) => {
      const [left, ...rest] = r.glyphs.filter((g) => g.ink === "yellow").sort((a, b) => a.x - b.x);
      return rest[0]!.x - left!.x;
    });
    // From the left arrow to the label's first letter, which stays put.
    expect(new Set(gaps)).toEqual(new Set([8, 9, 10]));
    expect(new Set(frames.map((r) => r.text("yellow")))).toEqual(new Set([">NEW GAME<"]));
  });

  test("the intro explains the game and the controls; the prompt blinks", () => {
    const t = new Title();
    tap(t, "space");
    const r = recordingSurface();
    t.draw(r.surface);
    const all = r.text();
    expect(all).toContain("HOW TO PLAY");
    expect(all).toContain("WALK UP TO A CABINET");
    for (const c of controls) expect(all).toContain(c.label);
    expect(all).toContain("↑←↓→WASD");
    expect(r.text("yellow")).toContain("PRESS SPACE TO START");
    hold(t, {}, 45);
    const off = recordingSurface();
    t.draw(off.surface);
    expect(off.text("yellow")).not.toContain("PRESS SPACE TO START");
  });
});
