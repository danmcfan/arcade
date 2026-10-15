import { describe, expect, test } from "bun:test";
import { images } from "../engine/assets.ts";
import { addSoundListener, type SoundEvent } from "../engine/audio.ts";
import type { Sprite } from "../engine/image.ts";
import { NO_INPUT, type Input } from "../engine/input.ts";
import { Surface } from "../engine/surface.ts";
import { fakeSoftware } from "../game/fakeSoftware.testutil.ts";
import { Game } from "../game/game.ts";
import { noHighScores } from "../arcade/wallet.ts";
import { createScene } from "../game/registry.ts";
import type { GameSnapshot } from "../game/snapshot.ts";
import type { Software } from "../game/software.ts";
import { bandRows, cell, charset, glyphHeight, inkOrder, sheetColumns, type Ink } from "../ui/glyphs.ts";
import { canDraw, keyHeight, textWidth } from "../ui/text.ts";
import { standardControls } from "../ui/menu.ts";
import { confirmLines, introLines, introPromptTop, screenWidth } from "./draw.ts";
import { memoryStore, parseSave, type SaveData, type SaveStore } from "./save.ts";
import { Title } from "./title.ts";

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
    load: (): SaveData | null => inner.load(),
    save(d: SaveData): void {
      store.saves++;
      inner.save(d);
    },
    clear: (): void => {
      inner.clear();
    },
  };
  return store;
}

/** Where a fresh hub player ends up after walking up to the Sweet Sam ("sweet") cabinet. */
function atCabinet(): SaveData {
  const g = new Game(null);
  for (let n = 0; n < 60; n++) g.step(press("up"));
  const s = g.snapshot();
  g.dispose();
  expect(s.arcade.title).toBe("sweet");
  return {
    v: 4,
    highScores: noHighScores,
    tokens: 5,
    tickets: 0,
    prizes: [],
    player: { x: s.arcade.player.x, y: s.arcade.player.y, dir: "UP" },
  };
}

describe("title menu", () => {
  test("without a save, only New game is listed and selected", () => {
    const t = new Title();
    expect(t.snapshot()).toMatchObject({
      phase: "menu",
      items: ["NEW GAME"],
      cursor: 0,
      canContinue: false,
      game: null,
    });
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
    const save: SaveData = {
      v: 4,
      highScores: { ...noHighScores, sweetSam: 900 },
      tokens: 5,
      tickets: 0,
      prizes: [],
      player: { x: 50, y: 90, dir: "LEFT" },
    };
    const store = memoryStore(save);
    const t = new Title({ store });
    tap(t, "down"); // Continue -> New game
    tap(t, "space");
    expect(t.snapshot()).toMatchObject({ phase: "confirm", items: ["NO", "YES"], cursor: 0 });
    tap(t, "space");
    expect(t.snapshot()).toMatchObject({ phase: "menu", cursor: 1 });
    tap(t, "space");
    tap(t, "escape");
    expect(t.snapshot()).toMatchObject({ phase: "menu", cursor: 1 });
    expect(store.load()).toEqual(save);
    expect(t.canContinue).toBe(true);
  });

  test("Yes, then Space on the intro, starts a fresh hub and replaces the old save", () => {
    const store = spyStore({
      v: 4,
      highScores: { ...noHighScores, sweetSam: 900 },
      tokens: 5,
      tickets: 0,
      prizes: [],
      player: { x: 50, y: 90, dir: "LEFT" },
    });
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
    expect(store.load()).toEqual({
      v: 4,
      highScores: noHighScores,
      tokens: 5,
      tickets: 0,
      prizes: [],
      player: { x: 80, y: 92, dir: "DOWN" },
    });
  });

  test("New game removes every prize", () => {
    const store = memoryStore({
      v: 4,
      highScores: { ...noHighScores, sweetSam: 900 },
      tokens: 0,
      tickets: 88,
      prizes: ["honeyJar", "runningShoes", "sleepyBees", "lantern", "glowStick", "wings"],
      player: { x: 50, y: 90, dir: "LEFT" },
    });
    const t = new Title({ store });
    tap(t, "down"); // Continue -> New game
    tap(t, "space");
    tap(t, "down"); // No -> Yes
    tap(t, "space");
    tap(t, "space"); // intro
    expect(game(t).arcade.prizes).toBeUndefined();
    expect(store.load()?.prizes).toEqual([]);
  });

  test("New game resets tokens and tickets", () => {
    const store = memoryStore({
      v: 4,
      highScores: { ...noHighScores, sweetSam: 900 },
      tokens: 0,
      tickets: 88,
      prizes: [],
      player: { x: 50, y: 90, dir: "LEFT" },
    });
    const t = new Title({ store });
    tap(t, "down");
    tap(t, "space");
    tap(t, "down");
    tap(t, "space");
    tap(t, "space");
    expect(game(t).arcade).toMatchObject({ tokens: 5, tickets: 0, highScores: noHighScores });
    expect(store.load()).toMatchObject({ tokens: 5, tickets: 0 });
  });
});

describe("continue", () => {
  test("restores the player's position, facing and the high score", () => {
    const t = new Title({
      store: memoryStore({
        v: 4,
        highScores: { ...noHighScores, sweetSam: 120 },
        tokens: 5,
        tickets: 0,
        prizes: [],
        player: { x: 50, y: 90, dir: "LEFT" },
      }),
    });
    tap(t, "space");
    expect(t.phase).toBe("playing");
    expect(game(t).arcade.player).toMatchObject({ x: 50, y: 90, dir: "LEFT" });
    expect(game(t).arcade.highScores.sweetSam).toBe(120);
  });

  test("the Space that chose Continue does not also start the cabinet in front", () => {
    const t = new Title({ store: memoryStore(atCabinet()) });
    hold(t, { space: true }, 30);
    expect(t.phase).toBe("playing");
    expect(game(t).software).toBeNull();
    t.step(NO_INPUT);
    // Facing the cabinet again (up) and pressing Space starts it.
    hold(t, { up: true, space: true }, 2);
    expect(game(t).software).toBe("sweetSam");
  });

  test("a saved position in or beyond a wall falls back to the start position", () => {
    for (const [x, y] of [
      [-500, -500],
      [10, 92],
      [80, 20],
      [80, 500],
    ] as const) {
      const t = new Title({
        store: memoryStore({
          v: 4,
          highScores: noHighScores,
          tokens: 5,
          tickets: 0,
          prizes: [],
          player: { x, y, dir: "UP" },
        }),
      });
      tap(t, "space");
      expect(game(t).arcade.player).toMatchObject({ x: 80, y: 92, dir: "UP" });
    }
  });
});

function playing(store: SaveStore = memoryStore()): Title {
  const t = new Title({ store });
  tap(t, "space");
  tap(t, "space");
  expect(t.phase).toBe("playing");
  return t;
}

describe("pause menu", () => {
  test("Esc in the hub pauses; the game does not step while paused; Esc resumes", () => {
    const t = playing();
    hold(t, { left: true }, 10);
    const before = game(t);
    tap(t, "escape");
    expect(t.snapshot()).toMatchObject({ phase: "paused", items: ["RESUME", "CONTROLS", "QUIT TO MENU"], cursor: 0 });
    hold(t, { left: true }, 10);
    expect(game(t).tick).toBe(before.tick);
    expect(game(t).arcade.player.x).toBe(before.arcade.player.x);
    tap(t, "escape");
    expect(t.phase).toBe("playing");
  });

  test("Resume and Controls; Esc leaves Controls, Space does not", () => {
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
    expect(t.phase).toBe("controls");
    tap(t, "escape");
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
    const t = new Title({
      store: memoryStore({
        v: 4,
        highScores: { ...noHighScores, sweetSam: 120 },
        tokens: 2,
        tickets: 37,
        prizes: [],
        player: { x: 50, y: 90, dir: "LEFT" },
      }),
    });
    tap(t, "space");
    expect(game(t).arcade).toMatchObject({ highScores: { ...noHighScores, sweetSam: 120 }, tokens: 2, tickets: 37 });
  });
});

/** Continue at the Sweet Sam cabinet, then start it. */
function inSweetSam(store: SaveStore & { saves: number }): Title {
  const t = new Title({ store });
  tap(t, "space");
  hold(t, { up: true, space: true }, 2);
  t.step(NO_INPUT);
  expect(game(t).software).toBe("sweetSam");
  return t;
}

describe("minigames inside the title scene", () => {
  test("a cabinet start saves at once, so the spent token is kept", () => {
    const store = spyStore(atCabinet());
    inSweetSam(store);
    expect(store.load()?.tokens).toBe(4);
  });

  test("Esc in a minigame opens the minigame pause menu, not the hub pause menu", () => {
    const store = spyStore(atCabinet());
    const t = inSweetSam(store);
    tap(t, "escape");
    expect(t.phase).toBe("playing");
    expect(game(t)).toMatchObject({ software: "sweetSam", menu: "paused" });
    tap(t, "escape");
    expect(game(t).menu).toBeNull();
  });

  test("Quit game returns to the hub and saves; the next Esc opens the hub pause menu", () => {
    const store = spyStore(atCabinet());
    const t = inSweetSam(store);
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

/** A Sweet Sam run that ends on its first update, scoring `points`. */
function endingSoftware(points: number): Software {
  return {
    ...fakeSoftware("sweetSam"),
    update: (): void => {},
    gameOver: (): boolean => true,
    score: (): number => points,
  };
}

/** Continue at the Sweet Sam cabinet with `tokens`, start a run that scores `points`, and let it end. */
function endedRun(store: SaveStore & { saves: number }, tokens: number, points: number): Title {
  store.save({ ...atCabinet(), tokens });
  const t = new Title({
    store,
    createGame: (restore): Game =>
      new Game(null, { createSoftware: (): Software => endingSoftware(points), ...(restore ? { restore } : {}) }),
  });
  tap(t, "space"); // Continue
  hold(t, { up: true, space: true }, 2);
  t.step(NO_INPUT); // the run ends: the payout opens over it
  expect(t.hostedGame().inHub()).toBe(false);
  return t;
}

describe("saving when the wallet changes", () => {
  test("every purchase saves at once, token or prize; a refused one does not", () => {
    const store = spyStore();
    const t = atCounter(store, 0, 30);
    let saves = store.saves;
    tap(t, "space"); // a token: 25 tickets left
    expect(store.saves).toBe(saves + 1);
    expect(store.load()).toMatchObject({ tokens: 1, tickets: 25, prizes: [] });
    saves = store.saves;
    tap(t, "up"); // the shelf's bottom row, the oil can
    tap(t, "right");
    tap(t, "space"); // the honey jar: 0 tickets left
    expect(store.saves).toBe(saves + 1);
    expect(store.load()).toMatchObject({ tokens: 1, tickets: 0, prizes: ["honeyJar"] });
    saves = store.saves;
    tap(t, "up");
    tap(t, "space"); // the running shoes: too few tickets
    expect(store.saves).toBe(saves);
  });

  test("a payout saves at once, while the payout is still counting", () => {
    const store = spyStore();
    endedRun(store, 5, 1420);
    expect(store.load()).toMatchObject({ tokens: 4, tickets: 14, highScores: { ...noHighScores, sweetSam: 1420 } });
  });

  test("a free play run that only sets a new high score saves it at once", () => {
    const store = spyStore();
    const t = endedRun(store, 0, 900);
    const saves = store.saves;
    expect(store.load()).toMatchObject({ tokens: 0, tickets: 0, highScores: { ...noHighScores, sweetSam: 900 } });
    t.step(NO_INPUT);
    expect(store.saves).toBe(saves); // nothing changed since: no save
  });
});

/** Continue from a save at the start position with these counts, then open the prize counter. */
function atCounter(store: SaveStore, tokens: number, tickets: number, prizes: SaveData["prizes"] = []): Title {
  store.save({ v: 4, highScores: noHighScores, tokens, tickets, prizes, player: { x: 80, y: 92, dir: "DOWN" } });
  const t = new Title({ store });
  tap(t, "space"); // Continue
  hold(t, { down: true }, 3);
  tap(t, "space");
  expect(game(t).menu).toBe("prizeCounter");
  return t;
}

describe("prize counter inside the title scene", () => {
  test("Esc closes the prize counter menu, not the hub pause menu; the next Esc pauses", () => {
    const t = atCounter(spyStore(), 5, 0);
    tap(t, "escape");
    expect(t.phase).toBe("playing");
    expect(game(t).menu).toBeNull();
    tap(t, "escape");
    expect(t.phase).toBe("paused");
  });

  test("a purchase saves at once, and Continue brings back the new counts", () => {
    const store = spyStore();
    const t = atCounter(store, 0, 7);
    tap(t, "space");
    expect(game(t).arcade).toMatchObject({ tokens: 1, tickets: 2 });
    expect(store.load()).toMatchObject({ tokens: 1, tickets: 2 });
    t.dispose();

    const again = new Title({ store });
    tap(again, "space"); // Continue
    expect(game(again).arcade).toMatchObject({ tokens: 1, tickets: 2 });
    again.dispose();
  });

  test("a prize purchase saves at once as a v3 save, and Continue brings the prize back", () => {
    const store = spyStore();
    const t = atCounter(store, 3, 40);
    tap(t, "up"); // the oil can, bottom left of the shelf
    tap(t, "right"); // the honey jar
    const saves = store.saves;
    tap(t, "space");
    expect(game(t).arcade).toMatchObject({ tickets: 15, prizes: ["honeyJar"] });
    expect(store.saves).toBe(saves + 1);
    expect(store.load()).toEqual({
      v: 4,
      highScores: noHighScores,
      tokens: 3,
      tickets: 15,
      prizes: ["honeyJar"],
      player: { x: 80, y: 95, dir: "DOWN" },
    });
    t.dispose();

    const again = new Title({ store });
    tap(again, "space"); // Continue
    expect(game(again).arcade).toMatchObject({ tokens: 3, tickets: 15, prizes: ["honeyJar"] });
    again.dispose();
  });

  test("a v2 save (from before prizes) Continues with no prizes, and is saved back as v4", () => {
    const store = memoryStore();
    const raw = { v: 2, highScore: 40, tokens: 2, tickets: 30, player: { x: 80, y: 92, dir: "DOWN" } };
    const parsed = parseSave(raw);
    if (parsed === null) throw new Error("v2 save did not parse");
    store.save(parsed);
    const t = new Title({ store });
    tap(t, "space"); // Continue
    expect(game(t).arcade).toMatchObject({ highScores: noHighScores, tokens: 2, tickets: 30 });
    expect(game(t).arcade.prizes).toBeUndefined();
    t.persist();
    expect(store.load()).toEqual({
      v: 4,
      highScores: noHighScores,
      tokens: 2,
      tickets: 30,
      prizes: [],
      player: { x: 80, y: 92, dir: "DOWN" },
    });
    t.dispose();
  });
});

/** The sound calls made while `fn` runs. */
function heard(fn: () => void): SoundEvent[] {
  const events: SoundEvent[] = [];
  const off = addSoundListener((e) => {
    events.push(e);
  });
  try {
    fn();
  } finally {
    off();
  }
  return events;
}

/** Like `heard`, without the title music. */
function effects(fn: () => void): SoundEvent[] {
  return heard(fn).filter((e) => !e.endsWith(":title"));
}

describe("sounds", () => {
  test("the title music starts on the first tick and plays through the New game check and intro", () => {
    const t = new Title({
      store: memoryStore({
        v: 4,
        highScores: noHighScores,
        tokens: 5,
        tickets: 0,
        prizes: [],
        player: { x: 80, y: 92, dir: "UP" },
      }),
    });
    expect(
      heard(() => {
        t.step(NO_INPUT);
      }),
    ).toEqual(["play:title"]);
    // Retried on key presses until the browser lets it play (never, without a DOM).
    expect(
      heard(() => {
        tap(t, "down");
      }),
    ).toContain("play:title");
    expect(
      heard(() => {
        tap(t, "space");
      }),
    ).not.toContain("pause:title");
    expect(t.phase).toBe("confirm");
    tap(t, "down");
    expect(
      heard(() => {
        tap(t, "space");
      }),
    ).not.toContain("pause:title");
    expect(t.phase).toBe("intro");
  });

  test("the music stops when play starts and comes back on Quit to menu", () => {
    const t = new Title();
    t.step(NO_INPUT);
    tap(t, "space");
    const start = heard(() => {
      tap(t, "space");
    });
    expect(t.phase).toBe("playing");
    expect(start).toContain("pause:title");
    expect(start).toContain("rewind:title");
    expect(
      heard(() => {
        hold(t, { left: true }, 5);
      }),
    ).not.toContain("play:title");
    tap(t, "escape");
    tap(t, "down");
    tap(t, "down");
    expect(
      heard(() => {
        tap(t, "space");
      }),
    ).toContain("play:title");
    expect(t.phase).toBe("menu");
  });

  test("moving the cursor blips; a choice or Back chirps; nothing else does", () => {
    const t = new Title({
      store: memoryStore({
        v: 4,
        highScores: noHighScores,
        tokens: 5,
        tickets: 0,
        prizes: [],
        player: { x: 80, y: 92, dir: "UP" },
      }),
    });
    t.step(NO_INPUT);
    expect(
      effects(() => {
        tap(t, "down");
      }),
    ).toEqual(["rewind:move", "play:move"]);
    expect(
      effects(() => {
        tap(t, "escape");
      }),
    ).toEqual([]);
    expect(
      effects(() => {
        hold(t, { left: true }, 3);
      }),
    ).toEqual([]);
    expect(
      effects(() => {
        tap(t, "space");
      }),
    ).toEqual(["rewind:select", "play:select"]);
    expect(t.phase).toBe("confirm");
    expect(
      effects(() => {
        tap(t, "escape");
      }),
    ).toEqual(["rewind:select", "play:select"]);
    expect(t.phase).toBe("menu");
  });

  test("the pause menu chirps when it opens and on choices, and blips when the cursor moves", () => {
    const t = new Title();
    tap(t, "space");
    tap(t, "space");
    const select: SoundEvent[] = ["rewind:select", "play:select"];
    const opened = heard(() => {
      tap(t, "escape");
    });
    for (const e of select) expect(opened).toContain(e);
    expect(t.phase).toBe("paused");
    expect(
      heard(() => {
        tap(t, "down");
      }),
    ).toEqual(["rewind:move", "play:move"]);
    expect(
      heard(() => {
        tap(t, "space");
      }),
    ).toEqual(select);
    expect(t.phase).toBe("controls");
    expect(
      heard(() => {
        tap(t, "escape");
      }),
    ).toEqual(select);
    expect(t.phase).toBe("paused");
  });
});

describe("parseSave", () => {
  const ok: SaveData = {
    v: 4,
    highScores: { sweetSam: 3, firefly: 0, brassMonkey: 7 },
    tokens: 4,
    tickets: 12,
    prizes: ["honeyJar", "sleepyBees"],
    player: { x: 1, y: 2, dir: "UP" },
  };

  test("accepts a v4 save with its player high scores and owned prizes", () => {
    expect(parseSave(ok)).toEqual(ok);
    const empty: SaveData = { ...ok, tokens: 0, tickets: 0, prizes: [] };
    expect(parseSave({ ...ok, tokens: 0, tickets: 0, prizes: [] })).toEqual(empty);
  });

  test("keeps owned prizes in catalogue order, once each", () => {
    expect(parseSave({ ...ok, prizes: ["sleepyBees", "runningShoes", "sleepyBees", "honeyJar"] })?.prizes).toEqual([
      "honeyJar",
      "runningShoes",
      "sleepyBees",
    ]);
  });

  test("keeps the Firefly prizes too, after the Sweet Sam ones", () => {
    expect(parseSave({ ...ok, prizes: ["wings", "glowStick", "honeyJar", "lantern"] })?.prizes).toEqual([
      "honeyJar",
      "lantern",
      "glowStick",
      "wings",
    ]);
  });

  test("keeps the Brass Monkey prizes alongside the Sweet Sam ones", () => {
    expect(parseSave({ ...ok, prizes: ["pocketWatch", "sleepyBees", "oilCan", "springBoots"] })?.prizes).toEqual([
      "sleepyBees",
      "oilCan",
      "springBoots",
      "pocketWatch",
    ]);
  });

  test("upgrades a v2 save: same counts and position, no prizes and no player high scores", () => {
    const v2 = { v: 2, highScore: 3, tokens: 4, tickets: 12, player: { x: 1, y: 2, dir: "UP" } };
    expect(parseSave(v2)).toEqual({
      v: 4,
      highScores: noHighScores,
      tokens: 4,
      tickets: 12,
      prizes: [],
      player: { x: 1, y: 2, dir: "UP" },
    });
    // A v2 save never had prizes: anything under that key is ignored.
    expect(parseSave({ ...v2, prizes: ["honeyJar"] })?.prizes).toEqual([]);
    expect(parseSave({ ...v2, tokens: -1 })).toBeNull();
  });

  test("a save written before the Sweet Sam code rename (#45) loads unchanged", () => {
    // Saves name prizes by id, never the software, so the rename leaves them readable.
    const raw =
      '{"v":3,"highScore":2470,"tokens":2,"tickets":9,"prizes":["honeyJar","runningShoes","sleepyBees"],"player":{"x":70,"y":53,"dir":"UP"}}';
    expect(parseSave(JSON.parse(raw))).toEqual({
      v: 4,
      highScores: noHighScores,
      tokens: 2,
      tickets: 9,
      prizes: ["honeyJar", "runningShoes", "sleepyBees"],
      player: { x: 70, y: 53, dir: "UP" },
    });
  });

  test("upgrades a v1 save: same position, no player high scores, plus 5 tokens, 0 tickets and no prizes", () => {
    const v1 = { v: 1, highScore: 3, player: { x: 1, y: 2, dir: "UP" } };
    expect(parseSave(v1)).toEqual({
      v: 4,
      highScores: noHighScores,
      tokens: 5,
      tickets: 0,
      prizes: [],
      player: { x: 1, y: 2, dir: "UP" },
    });
    expect(parseSave({ ...v1, player: null })).toBeNull();
  });

  test("an old save's one shared high score is dropped: no machine can claim it", () => {
    const v3 = { v: 3, highScore: 99999, tokens: 1, tickets: 0, prizes: [], player: { x: 1, y: 2, dir: "UP" } };
    expect(parseSave(v3)?.highScores).toEqual({ sweetSam: 0, firefly: 0, brassMonkey: 0 });
  });

  test("rejects anything else", () => {
    for (const bad of [
      null,
      1,
      "x",
      {},
      { ...ok, v: 5 },
      { ...ok, v: 0 },
      { ...ok, prizes: undefined },
      { ...ok, prizes: "honeyJar" },
      { ...ok, prizes: ["goldenTrophy"] },
      { ...ok, highScores: undefined },
      { ...ok, highScores: { sweetSam: 1, firefly: 2 } },
      { ...ok, highScores: { ...ok.highScores, firefly: -1 } },
      { ...ok, highScores: { ...ok.highScores, firefly: Number.NaN } },
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

/** The drawn characters in reading order (top to bottom, left to right), optionally of one ink. */
function readText(glyphs: readonly Glyph[], ink?: Ink, from = 0): string {
  return glyphs
    .slice(from)
    .filter((g) => ink === undefined || g.ink === ink)
    .toSorted((a, b) => a.y - b.y || a.x - b.x)
    .map((g) => g.ch)
    .join("");
}

interface KeyCap {
  x: number;
  y: number;
  w: number;
}

/** A headless surface that records the glyphs, sprites and key caps drawn on it. */
class RecordingSurface extends Surface {
  readonly glyphs: Glyph[] = [];
  readonly sprites: [string, number, number][] = [];
  /** Key caps, found by the face `drawKey` fills first: x, top and width. */
  readonly caps: KeyCap[] = [];
  /** How many glyphs were drawn before the last dimming fill. */
  dimmedAt = 0;

  constructor() {
    super(null, 0, 0);
  }

  override draw(s: Sprite, x: number, y: number): void {
    if (s.asset === images.font) {
      const row = Math.trunc(s.sy / cell);
      const band = Math.trunc(row / bandRows);
      const i = (row % bandRows) * sheetColumns + s.sx / cell;
      expect(s.h).toBe(glyphHeight);
      const ch = charset[i];
      const ink = inkOrder[band];
      if (ch === undefined || ink === undefined) throw new Error(`glyph outside the font sheet: ${s.sx},${s.sy}`);
      this.glyphs.push({ ch, ink, x, y });
      return;
    }
    this.sprites.push([Object.entries(images).find(([, a]) => a === s.asset)?.[0] ?? "?", x, y]);
  }

  override fillRect(x: number, y: number, w: number, h: number, colour: string): void {
    if (colour === "#566c86" && h === keyHeight - 1) this.caps.push({ x: x - 1, y, w: w + 2 });
  }

  override fillPremul(): void {
    this.dimmedAt = this.glyphs.length;
  }

  override strokeRect(): void {}
}

function recordingSurface(): {
  surface: Surface;
  sprites: [string, number, number][];
  glyphs: Glyph[];
  text: (ink?: Ink, from?: number) => string;
  over: (ink?: Ink) => string;
  keys: () => (KeyCap & { label: string })[];
} {
  const surface = new RecordingSurface();
  const { glyphs, sprites } = surface;
  const text = (ink?: Ink, from = 0): string => readText(glyphs, ink, from);
  /** Each key cap drawn, with the label printed on it. */
  const keys = (): (KeyCap & { label: string })[] =>
    surface.caps.map((c) => {
      const label = glyphs
        .filter((g) => g.y === c.y + 1 && g.x >= c.x && g.x < c.x + c.w)
        .toSorted((a, b) => a.x - b.x)
        .map((g) => g.ch)
        .join("");
      return { x: c.x, y: c.y, w: c.w, label };
    });
  /** Like `text`, but only what was drawn over the last dimming fill (a panel). */
  const over = (ink?: Ink): string => text(ink, surface.dimmedAt);
  return { surface, sprites, glyphs, text, over, keys };
}

describe("drawing", () => {
  test("every UI string can be drawn and fits on the screen", () => {
    const strings = [
      "CONTINUE",
      "NEW GAME",
      "NO",
      "YES",
      ...confirmLines,
      "RESUME",
      "CONTROLS",
      "QUIT TO MENU",
      ...standardControls.map((c) => c.label),
      "GAMES WITHIN A GAME",
      "INTERACT TO START",
    ];
    for (const s of strings) {
      expect({ s, ok: canDraw(s) }).toEqual({ s, ok: true });
      expect(textWidth(s)).toBeLessThanOrEqual(screenWidth - 8);
    }
    // How to Play's lines are the owner's exact copy; the widest leaves 2 px each side.
    for (const s of introLines) {
      expect({ s, ok: canDraw(s) }).toEqual({ s, ok: true });
      expect(textWidth(s)).toBeLessThanOrEqual(screenWidth - 4);
    }
  });

  test("the menu draws the logo and tagline (no hub scene), and no Continue without a save", () => {
    const t = new Title();
    const r = recordingSurface();
    t.draw(r.surface);
    // title-logo.png once; its animation is painted over it (src/title/logo.test.ts).
    expect(r.sprites.map(([name]) => name)).toEqual(["titleLogo"]);
    expect(r.text("blue")).toBe("GAMES WITHIN A GAME");
    expect(r.text("yellow")).toBe(">NEW GAME<");
    expect(r.text("white")).not.toContain("CONTINUE");
    expect(r.text("orange")).toBe("");
  });

  test("the menu shows no key hints: controls live only in Controls and How to Play", () => {
    const t = new Title();
    const r = recordingSurface();
    t.draw(r.surface);
    expect(r.keys()).toEqual([]);
  });

  test("the New game check draws its warning, No and Yes, and no key hints", () => {
    const t = new Title({
      store: memoryStore({
        v: 4,
        highScores: noHighScores,
        tokens: 5,
        tickets: 0,
        prizes: [],
        player: { x: 80, y: 92, dir: "UP" },
      }),
    });
    tap(t, "down");
    tap(t, "space");
    const r = recordingSurface();
    t.draw(r.surface);
    expect(r.over()).toBe(`${confirmLines.join("")}>NO<YES`);
    expect(r.over("yellow")).toBe("START A NEW GAME?>NO<");
    expect(r.keys()).toEqual([]);
  });

  test("with a save, the menu shows the saved high score (when there is one)", () => {
    const zero = new Title({
      store: memoryStore({
        v: 4,
        highScores: noHighScores,
        tokens: 5,
        tickets: 0,
        prizes: [],
        player: { x: 80, y: 92, dir: "UP" },
      }),
    });
    const r0 = recordingSurface();
    zero.draw(r0.surface);
    expect(r0.text("orange")).toBe("");

    const t = new Title({
      store: memoryStore({
        v: 4,
        highScores: { ...noHighScores, sweetSam: 120 },
        tokens: 5,
        tickets: 0,
        prizes: [],
        player: { x: 80, y: 92, dir: "UP" },
      }),
    });
    const r = recordingSurface();
    t.draw(r.surface);
    expect(r.text("yellow")).toBe(">CONTINUE<");
    expect(r.text("orange")).toBe("HIGH SCORE 120");
  });

  test("the selection arrows move in and out", () => {
    const t = new Title();
    const frames = Array.from({ length: 60 }, () => {
      const r = recordingSurface();
      t.draw(r.surface);
      hold(t, {}, 1);
      return r;
    });
    const gaps = frames.map((r) => {
      const [left, first] = r.glyphs.filter((g) => g.ink === "yellow").toSorted((a, b) => a.x - b.x);
      if (left === undefined || first === undefined) throw new Error("no selection arrow drawn");
      return first.x - left.x;
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
    expect(all).toContain(introLines.join(""));
    for (const c of standardControls) expect(all).toContain(c.label);
    expect(all).not.toContain("SPACE TO");
    expect(r.keys().map((k) => k.label)).toEqual([
      "↑",
      "←",
      "↓",
      "→",
      "WASD",
      "E",
      "SPACE",
      "ENTER",
      "Q",
      "ESC",
      "BACKSPACE",
    ]);
    expect(r.text("yellow")).toContain("INTERACT TO START");
    hold(t, {}, 95);
    const off = recordingSurface();
    t.draw(off.surface);
    expect(off.text("yellow")).not.toContain("INTERACT TO START");
  });

  test("nothing on the intro runs off the screen or into the prompt", () => {
    const t = new Title();
    tap(t, "space");
    const r = recordingSurface();
    t.draw(r.surface);
    for (const k of r.keys()) {
      expect(k.x).toBeGreaterThanOrEqual(0);
      expect(k.x + k.w).toBeLessThanOrEqual(screenWidth);
      expect(k.y + keyHeight).toBeLessThan(introPromptTop); // above INTERACT TO START
    }
    for (const g of r.glyphs) expect(g.x).toBeLessThan(screenWidth);
  });
});
