import { afterEach, describe, expect, test } from "bun:test";
import { soundPower, soundStart } from "../engine/assets.ts";
import type { SoundEvent } from "../engine/audio.ts";
import { makeSolid, type Sprite } from "../engine/image.ts";
import { NO_INPUT, type Input } from "../engine/input.ts";
import * as rng from "../engine/rng.ts";
import type { Surface } from "../engine/surface.ts";
import { Game, type Progress } from "./game.ts";
import type { GameSnapshot, GearheadSnapshot, SoftwareSnapshot } from "./snapshot.ts";
import type { FixedViewport, Software, SoftwareName } from "./software.ts";

class FakeSoftware implements Software {
  updates: Input[] = [];
  draws: [Surface, number][] = [];
  over = false;
  points = 0;
  constructor(
    readonly name: SoftwareName,
    readonly highScore: number,
    private readonly bg: Sprite,
  ) {}
  background(): Sprite {
    return this.bg;
  }
  update(i: Input): void {
    this.updates.push(i);
  }
  draw(screen: Surface, buffer: number): void {
    this.draws.push([screen, buffer]);
  }
  gameOver(): boolean {
    return this.over;
  }
  score(): number {
    return this.points;
  }
  snapshot(): SoftwareSnapshot {
    const s: GearheadSnapshot = { x: this.updates.length, y: 0, frame: 0, left: false, moving: false, joystick: 0 };
    return s;
  }
}

class FakeFixed extends FakeSoftware implements FixedViewport {
  fixedViewportSize(): [number, number] {
    return [336, 428];
  }
}

/** Fake factory: hive is a FixedViewport, the others stay plain Software (224x288 / 224x256 background) so the margin path stays covered. */
function fakes() {
  const built: FakeSoftware[] = [];
  const factory = (name: SoftwareName, highScore: number): Software => {
    let sw: FakeSoftware;
    if (name === "hive") {
      soundStart.rewind();
      soundStart.play();
      sw = new FakeFixed(name, highScore, makeSolid(224, 288, "#000"));
    } else if (name === "firefly") {
      sw = new FakeSoftware(name, highScore, makeSolid(224, 288, "#000"));
    } else {
      sw = new FakeSoftware(name, highScore, makeSolid(224, 256, "#000"));
    }
    built.push(sw);
    return sw;
  };
  return { built, factory };
}

const games: Game[] = [];
function newGame(initial: SoftwareName | null = null, restore?: Progress) {
  const f = fakes();
  const game = new Game(initial, { createSoftware: f.factory, ...(restore ? { restore } : {}) });
  games.push(game);
  return { game, ...f };
}
afterEach(() => {
  for (const g of games.splice(0)) g.dispose();
});

function input(keys: Partial<Input> = {}): Input {
  return { ...NO_INPUT, ...keys };
}
function run(game: Game, ticks: number, keys: Partial<Input> = {}): void {
  for (let t = 0; t < ticks; t++) game.step(input(keys));
}
function snap(game: Game): GameSnapshot {
  return game.snapshot() as GameSnapshot;
}
/** From spawn, walk up to the hive cabinet and press Space. */
function enterHive(game: Game): void {
  run(game, 31, { up: true });
  game.step(input({ up: true, space: true }));
}
/** From spawn, walk to the gearhead cabinet and press Space. */
function enterGearhead(game: Game): void {
  run(game, 31, { up: true });
  run(game, 24, { left: true });
  game.step(input({ up: true, space: true }));
}

describe("snapshot", () => {
  test("hub snapshot has exactly the §4.3 game keys", () => {
    rng.seed(42);
    const { game } = newGame();
    game.step(input({ left: true }));
    expect(snap(game)).toEqual({
      tick: 1,
      rng: rng.state(),
      debug: false,
      software: null,
      arcade: {
        player: { x: 79, y: 92, dir: "LEFT", frame: 0.1 },
        melodyPlaying: false,
        title: null,
        highScore: 0,
        tokens: 5,
        tickets: 0,
      },
      run: null,
      menu: null,
      cursor: 0,
      payout: null,
      sw: null,
      sounds: [],
    });
  });

  test("name is game; tick counts steps", () => {
    const { game } = newGame();
    expect(game.name).toBe("game");
    run(game, 5);
    expect(snap(game).tick).toBe(5);
  });

  test("sounds hold only the events of the latest tick", () => {
    const { game } = newGame();
    run(game, 31, { up: true }); // reaches the hive cabinet on tick 25
    expect(snap(game).sounds).toEqual([]);
    game.step(input({ left: true }));
    expect(snap(game).sounds).toEqual(["pause:melody", "rewind:melody"]);
    game.step(input());
    expect(snap(game).sounds).toEqual([]);
  });

  test("the snapshot carries the title and melody state", () => {
    const { game } = newGame();
    run(game, 25, { up: true });
    const s = snap(game);
    expect(s.sounds).toEqual(["play:melody"]);
    expect(s.arcade.melodyPlaying).toBe(true);
    expect(s.arcade.title).toBe("sweet");
  });

  test("inside a software, sw is that software's snapshot", () => {
    const { game } = newGame();
    enterGearhead(game);
    run(game, 3);
    const s = snap(game);
    expect(s.software).toBe("gearhead");
    expect(s.sw).toEqual({ x: 3, y: 0, frame: 0, left: false, moving: false, joystick: 0 });
  });
});

describe("createGame(software): tick 1 is a hub tick", () => {
  test("construction sounds land in tick 1; the hub moves on tick 1; the software runs from tick 2", () => {
    const { game, built } = newGame("hive");
    expect(built.map((b) => b.name)).toEqual(["hive"]);
    expect(built[0]?.highScore).toBe(0);

    game.step(input({ left: true }));
    let s = snap(game);
    expect(s.sounds).toEqual(["rewind:start", "play:start"]);
    expect(s.software).toBe("hive");
    expect(s.arcade.player.x).toBe(79); // the hub consumed tick 1's input
    expect(built[0]?.updates).toEqual([]);

    game.step(input({ right: true }));
    s = snap(game);
    expect(s.sounds).toEqual([]);
    expect(s.arcade.player.x).toBe(79);
    expect(built[0]?.updates).toEqual([input({ right: true })]);
  });

  test("without a software, nothing is built up front", () => {
    const { built } = newGame();
    expect(built).toEqual([]);
  });
});

describe("entering and leaving software", () => {
  test("Space at a cabinet hands its software to the Game on the same tick", () => {
    const { game, built } = newGame();
    enterHive(game);
    const s = snap(game);
    expect(s.software).toBe("hive");
    expect(s.sounds).toEqual(["pause:melody", "rewind:melody", "rewind:start", "play:start"]);
    expect(built[0]?.updates).toEqual([]);
    game.step(input({ left: true }));
    expect(built[0]?.updates).toEqual([input({ left: true })]);
    expect(snap(game).arcade.player.x).toBe(80); // hub frozen while the software runs
  });

  test("Escape in the hub does nothing special", () => {
    const { game } = newGame();
    game.step(input({ escape: true, left: true }));
    const s = snap(game);
    expect(s.sounds).toEqual([]);
    expect(s.arcade.player.x).toBe(79);
  });

  test("Escape does not take the score as a high score", () => {
    const { game, built } = newGame();
    enterHive(game);
    const sw = built[0];
    if (sw === undefined) throw new Error("hive not built");
    sw.points = 500;
    quitGame(game);
    expect(snap(game).arcade.highScore).toBe(0);
  });

  test("a direct start (game.New(software)) that ends goes straight back to the hub: no payout", () => {
    const { game, built } = newGame("hive");
    game.step(input());
    const first = built[0]!;
    first.points = 500;
    first.over = true;
    game.step(input());
    const s = snap(game);
    expect(s.software).toBeNull();
    expect(s.menu).toBeNull();
    expect(s.arcade.highScore).toBe(500);
    expect([s.arcade.tokens, s.arcade.tickets]).toEqual([5, 0]);
    expect(first.updates.length).toBe(1);
  });

  test("on gameOver the high score becomes max(high score, score); the next machine gets it", () => {
    const { game, built } = newGame();
    enterHive(game);
    const first = built[0];
    if (first === undefined) throw new Error("hive not built");
    first.points = 500;
    run(game, 2);
    expect(snap(game).arcade.highScore).toBe(0); // not over yet
    first.over = true;
    game.step(input());
    let s = snap(game);
    expect(s.arcade.highScore).toBe(500);
    expect(first.updates.length).toBe(3); // updated on the game-over tick
    closePayout(game);

    // A lower score does not lower it; the next machine gets the high score.
    game.step(input({ space: true, up: true }));
    const second = built[1];
    if (second === undefined) throw new Error("second hive not built");
    expect(second.highScore).toBe(500);
    second.points = 200;
    second.over = true;
    game.step(input());
    s = snap(game);
    expect(s.arcade.highScore).toBe(500);
  });
});

/** Tap a key: one tick held, one released. */
function tap(game: Game, key: keyof Input): void {
  game.step(input({ [key]: true }));
  game.step(input());
}
/** From a running minigame: Esc, Down, Down, Space (Quit game). */
function quitGame(game: Game): void {
  tap(game, "escape");
  tap(game, "down");
  tap(game, "down");
  tap(game, "space");
}
/** In the payout: Space (skip), Space (close). */
function closePayout(game: Game): void {
  tap(game, "space");
  tap(game, "space");
}
/** Sound events heard while `fn` runs. */
function heard(game: Game, fn: () => void): string[] {
  const out: string[] = [];
  const before = snap(game).tick;
  const all: string[][] = [];
  const step = game.step.bind(game);
  game.step = (i: Input) => {
    step(i);
    all.push(snap(game).sounds);
  };
  try {
    fn();
  } finally {
    game.step = step;
  }
  for (const s of all) out.push(...s);
  expect(snap(game).tick).toBeGreaterThanOrEqual(before);
  return out;
}

const minigameSoundPauses: SoundEvent[] = ["pause:start", "pause:power", "pause:death", "pause:laser", "pause:boom"];

describe("minigame pause menu", () => {
  test("Esc opens it over the minigame: no update that tick, the tick still counts, sounds pause", () => {
    const { game, built } = newGame();
    enterHive(game);
    run(game, 3);
    const tick = snap(game).tick;
    game.step(input({ escape: true, left: true }));
    const s = snap(game);
    expect(s.menu).toBe("paused");
    expect(s.cursor).toBe(0);
    expect(s.software).toBe("hive");
    expect(s.sw).not.toBeNull();
    expect(s.tick).toBe(tick + 1);
    expect(s.sounds).toEqual(["rewind:select", "play:select", ...minigameSoundPauses]);
    expect(built[0]?.updates.length).toBe(3);
    expect(game.inHub()).toBe(false);
  });

  test("the minigame does not advance while the menu is open, and held Esc does not close it", () => {
    const { game, built } = newGame();
    enterHive(game);
    run(game, 3);
    run(game, 30, { escape: true });
    run(game, 30, { left: true });
    expect(snap(game).menu).toBe("paused");
    expect(built[0]?.updates.length).toBe(3);
  });

  test("Up and Down move the cursor with the move blip, wrapping", () => {
    const { game } = newGame();
    enterHive(game);
    tap(game, "escape");
    expect(heard(game, () => tap(game, "down"))).toEqual(["rewind:move", "play:move"]);
    expect(snap(game).cursor).toBe(1);
    tap(game, "down");
    tap(game, "down");
    expect(snap(game).cursor).toBe(0);
    tap(game, "up");
    expect(snap(game).cursor).toBe(2);
  });

  test("Space on Resume carries on from the same tick; the held Space is hidden until released", () => {
    const { game, built } = newGame();
    enterHive(game);
    run(game, 3);
    tap(game, "escape");
    game.step(input({ space: true }));
    expect(snap(game).menu).toBeNull();
    expect(built[0]?.updates.length).toBe(3);
    game.step(input({ space: true, left: true }));
    expect(built[0]?.updates).toHaveLength(4);
    expect(built[0]?.updates[3]).toEqual(input({ left: true }));
    game.step(input());
    game.step(input({ space: true }));
    expect(built[0]?.updates[5]).toEqual(input({ space: true }));
  });

  test("a second Esc resumes too", () => {
    const { game, built } = newGame();
    enterHive(game);
    tap(game, "escape");
    tap(game, "escape");
    expect(snap(game).menu).toBeNull();
    game.step(input());
    expect(built[0]?.updates.length).toBe(2);
  });

  test("Resume restarts only the minigame sounds that were playing", () => {
    const { game } = newGame();
    enterHive(game);
    const fakeElement = { paused: false } as HTMLAudioElement;
    soundPower.element = fakeElement;
    try {
      tap(game, "escape");
      expect(heard(game, () => tap(game, "escape"))).toEqual(["rewind:select", "play:select", "play:power"]);
    } finally {
      soundPower.element = null;
    }
  });

  test("Controls shows the controls; Esc or Space backs out to the menu", () => {
    const { game } = newGame();
    enterHive(game);
    tap(game, "escape");
    tap(game, "down");
    tap(game, "space");
    expect(snap(game).menu).toBe("controls");
    tap(game, "escape");
    expect([snap(game).menu, snap(game).cursor]).toEqual(["paused", 1]);
    tap(game, "space");
    expect(snap(game).menu).toBe("controls");
    tap(game, "space");
    expect(snap(game).menu).toBe("paused");
  });

  test("Quit game returns to the hub: the token stays spent, no tickets, no payout", () => {
    const { game, built } = newGame();
    enterHive(game);
    expect(snap(game).arcade.tokens).toBe(4);
    built[0]!.points = 900;
    tap(game, "escape");
    tap(game, "down");
    tap(game, "down");
    game.step(input({ space: true }));
    let s = snap(game);
    expect(s.software).toBeNull();
    expect(s.menu).toBeNull();
    expect(s.payout).toBeNull();
    expect([s.arcade.tokens, s.arcade.tickets, s.arcade.highScore]).toEqual([4, 0, 0]);
    expect(game.inHub()).toBe(true);
    // Still facing the cabinet with Space held: it does not start again until Space is pressed anew.
    run(game, 5, { space: true, up: true });
    expect(snap(game).software).toBeNull();
    game.step(input({ up: true }));
    game.step(input({ space: true, up: true }));
    s = snap(game);
    expect(s.software).toBe("hive");
    expect(s.arcade.tokens).toBe(3);
  });
});

describe("payout", () => {
  function endRun(points: number, tokens = 5) {
    const g = newGame(null, { highScore: 0, tokens, tickets: 0, player: { x: 80, y: 92, dir: "DOWN" } });
    enterHive(g.game);
    const sw = g.built[0]!;
    sw.points = points;
    sw.over = true;
    g.game.step(input());
    return { ...g, sw };
  }

  test("a run ending with 1420 opens the payout over the minigame and adds 14 tickets", () => {
    const { game, sw } = endRun(1420);
    let s = snap(game);
    expect(s.menu).toBe("payout");
    expect(s.software).toBe("hive");
    expect(s.run).toBe("paid");
    expect(s.arcade.highScore).toBe(1420);
    expect(s.arcade.tickets).toBe(14);
    expect(s.payout).toEqual({ score: 1420, tickets: 0, total: 14, freePlay: false, counting: true });
    expect(game.inHub()).toBe(false);
    expect(game.layout()).toEqual([336, 428]);
    const sounds = heard(game, () => run(game, 14 * 20 + 40));
    expect(sounds.filter((e) => e === "play:ticket")).toHaveLength(14);
    s = snap(game);
    expect(s.payout).toEqual({ score: 0, tickets: 14, total: 14, freePlay: false, counting: false });
    expect(sw.updates.length).toBe(1); // never updated after the game over
  });

  test("a score of 60 adds 1 ticket", () => {
    const { game } = endRun(60);
    expect(snap(game).arcade.tickets).toBe(1);
    expect(snap(game).payout?.total).toBe(1);
  });

  test("Space skips to the totals, Space again returns to the hub with the tickets", () => {
    const { game } = endRun(1420);
    run(game, 30);
    tap(game, "space");
    let s = snap(game);
    expect(s.menu).toBe("payout");
    expect(s.payout).toMatchObject({ score: 0, tickets: 14, counting: false });
    game.step(input({ space: true, up: true }));
    s = snap(game);
    expect(s.menu).toBeNull();
    expect(s.software).toBeNull();
    expect(s.payout).toBeNull();
    expect(s.arcade.tickets).toBe(14);
    expect(game.inHub()).toBe(true);
    expect(game.layout()).toEqual([192, 176]);
    run(game, 3, { space: true, up: true });
    expect(snap(game).software).toBeNull(); // the closing Space does not start the cabinet again
  });

  test("free play shows the score, adds no tickets, and one Space closes it", () => {
    const { game } = endRun(1420, 0);
    let s = snap(game);
    expect(s.run).toBe("free");
    expect(s.arcade.tokens).toBe(0);
    expect(s.payout).toEqual({ score: 1420, tickets: 0, total: 0, freePlay: true, counting: false });
    expect(s.arcade.tickets).toBe(0);
    tap(game, "space");
    s = snap(game);
    expect(s.software).toBeNull();
    expect(s.arcade.tickets).toBe(0);
  });

  test("Esc does nothing in the payout", () => {
    const { game } = endRun(1420);
    tap(game, "escape");
    expect(snap(game).menu).toBe("payout");
  });

  test("tickets add up over runs", () => {
    const { game, built } = endRun(250);
    closePayout(game);
    game.step(input({ up: true, space: true }));
    built[1]!.points = 60;
    built[1]!.over = true;
    game.step(input());
    expect(snap(game).arcade.tickets).toBe(3);
    expect(snap(game).arcade.tokens).toBe(3);
  });
});

describe("progress", () => {
  test("carries tokens and tickets, and restore brings them back", () => {
    const { game } = newGame();
    enterHive(game);
    expect(game.progress()).toMatchObject({ tokens: 4, tickets: 0 });
    const restored = new Game(null, { createSoftware: fakes().factory, restore: { highScore: 9, tokens: 2, tickets: 31, player: { x: 80, y: 92, dir: "UP" } } });
    games.push(restored);
    expect(snap(restored).arcade).toMatchObject({ highScore: 9, tokens: 2, tickets: 31 });
  });
});

describe("debug mode and layout", () => {
  test("hub is 192x176", () => {
    const { game } = newGame();
    expect(game.layout()).toEqual([192, 176]);
  });

  test("Shift+P toggles debug (+120 width) and the tick continues", () => {
    const { game } = newGame();
    game.step(input({ shiftP: true, left: true }));
    expect(snap(game).debug).toBe(true);
    expect(snap(game).arcade.player.x).toBe(79);
    expect(game.layout()).toEqual([312, 176]);
    game.step(input({ shiftP: true }));
    expect(snap(game).debug).toBe(false);
    expect(game.layout()).toEqual([192, 176]);
  });

  const sizes: [SoftwareName, [number, number], [number, number]][] = [
    ["hive", [336, 428], [456, 428]],
    ["firefly", [256, 320], [376, 320]],
    ["gearhead", [256, 288], [376, 288]],
  ];
  for (const [name, plain, debug] of sizes) {
    test(`${name} layout is ${plain.join("x")}, ${debug.join("x")} with debug`, () => {
      const { game } = newGame(name);
      game.step(input());
      expect(game.layout()).toEqual(plain);
      game.step(input({ shiftP: true }));
      expect(snap(game).debug).toBe(true);
      expect(game.layout()).toEqual(debug);
    });
  }

  test("Shift+P inside a software still updates the software that tick", () => {
    const { game, built } = newGame("gearhead");
    game.step(input());
    game.step(input({ shiftP: true }));
    expect(built[0]?.updates.length).toBe(1);
  });

  test("leaving a software restores the hub layout; the pause menu keeps the minigame's", () => {
    const { game } = newGame("firefly");
    game.step(input());
    expect(game.layout()).toEqual([256, 320]);
    tap(game, "escape");
    expect(game.layout()).toEqual([256, 320]);
    tap(game, "down");
    tap(game, "down");
    tap(game, "space");
    expect(game.layout()).toEqual([192, 176]);
  });
});

describe("dispose", () => {
  test("stops recording sounds", () => {
    const { game } = newGame();
    game.dispose();
    soundStart.play();
    game.step(input());
    expect(snap(game).sounds).toEqual([]);
  });
});
