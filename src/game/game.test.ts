import { afterEach, describe, expect, test } from "bun:test";
import { sweetSamSounds } from "../engine/assets.ts";
import { addSoundListener, type SoundEvent } from "../engine/audio.ts";
import { makeSolid, type Sprite } from "../engine/image.ts";
import { NO_INPUT, type Input } from "../engine/input.ts";
import * as rng from "../engine/rng.ts";
import { defined } from "../engine/defined.testutil.ts";
import type { Surface } from "../engine/surface.ts";
import { Game, type Progress } from "./game.ts";
import type { GameSnapshot, BrassMonkeySnapshot, SoftwareSnapshot } from "./snapshot.ts";
import { fakeBrassMonkeySnapshot } from "./snapshot.testutil.ts";
import type { FixedViewport, Software, SoftwareName } from "./software.ts";
import type { PrizeId } from "../arcade/prizes.ts";

class FakeSoftware implements Software {
  updates: Input[] = [];
  draws: [Surface, number][] = [];
  over = false;
  points = 0;
  readonly name: SoftwareName;
  readonly highScore: number;
  private readonly bg: Sprite;
  readonly prizes: readonly PrizeId[];

  constructor(name: SoftwareName, highScore: number, bg: Sprite, prizes: readonly PrizeId[] = []) {
    this.name = name;
    this.highScore = highScore;
    this.bg = bg;
    this.prizes = prizes;
  }
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
    const s: BrassMonkeySnapshot = { ...fakeBrassMonkeySnapshot, x: this.updates.length };
    return s;
  }
}

class FakeFixed extends FakeSoftware implements FixedViewport {
  fixedViewportSize(): [number, number] {
    return [240, 304];
  }
}

/** Fake factory: sweetSam is a FixedViewport, the others stay plain Software (224x288 / 224x256 background) so the margin path stays covered. */
interface Fakes {
  built: FakeSoftware[];
  factory: (name: SoftwareName, highScore: number, prizes: readonly PrizeId[]) => Software;
}

interface Harness extends Fakes {
  game: Game;
}

function fakes(): Fakes {
  const built: FakeSoftware[] = [];
  const factory = (name: SoftwareName, highScore: number, prizes: readonly PrizeId[]): Software => {
    let sw: FakeSoftware;
    if (name === "sweetSam") {
      sweetSamSounds.start.rewind();
      sweetSamSounds.start.play();
      sw = new FakeFixed(name, highScore, makeSolid(224, 288, "#000"), prizes);
    } else if (name === "firefly") {
      sw = new FakeSoftware(name, highScore, makeSolid(224, 288, "#000"), prizes);
    } else {
      sw = new FakeSoftware(name, highScore, makeSolid(224, 256, "#000"), prizes);
    }
    built.push(sw);
    return sw;
  };
  return { built, factory };
}

const games: Game[] = [];
function newGame(initial: SoftwareName | null = null, restore?: Progress): Harness {
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
  return game.snapshot();
}
/** From spawn, walk up to the Sweet Sam cabinet and press Space. */
function enterSweetSam(game: Game): void {
  run(game, 31, { up: true });
  game.step(input({ up: true, space: true }));
}
/** From spawn, walk to the Brass Monkey cabinet and press Space. */
function enterBrassMonkey(game: Game): void {
  run(game, 31, { up: true });
  run(game, 40, { left: true });
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
      // The hub song starts on the first tick in the hub.
      sounds: ["play:hub"],
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
    run(game, 31, { up: true }); // reaches the Sweet Sam cabinet on tick 25
    expect(snap(game).sounds).toEqual([]);
    game.step(input({ left: true }));
    expect(snap(game).sounds).toEqual(["pause:attractSweet", "rewind:attractSweet"]);
    game.step(input());
    expect(snap(game).sounds).toEqual([]);
  });

  test("the snapshot carries the title and melody state", () => {
    const { game } = newGame();
    run(game, 25, { up: true });
    const s = snap(game);
    expect(s.sounds).toEqual(["play:attractSweet", "rewind:screenOn", "play:screenOn"]);
    expect(s.arcade.melodyPlaying).toBe(true);
    expect(s.arcade.title).toBe("sweet");
  });

  test("inside a software, sw is that software's snapshot", () => {
    const { game } = newGame();
    enterBrassMonkey(game);
    run(game, 3);
    const s = snap(game);
    expect(s.software).toBe("brassMonkey");
    expect(s.sw).toEqual({ ...fakeBrassMonkeySnapshot, x: 3 });
  });
});

describe("createGame(software): tick 1 is a hub tick", () => {
  test("construction sounds land in tick 1; the hub moves on tick 1; the software runs from tick 2", () => {
    const { game, built } = newGame("sweetSam");
    expect(built.map((b) => b.name)).toEqual(["sweetSam"]);
    expect(built[0]?.highScore).toBe(0);

    game.step(input({ left: true }));
    let s = snap(game);
    expect(s.sounds).toEqual(["rewind:sweetStart", "play:sweetStart"]);
    expect(s.software).toBe("sweetSam");
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

/** Every sound event while `play` runs. */
function soundsDuring(play: () => void): SoundEvent[] {
  const events: SoundEvent[] = [];
  const off = addSoundListener((e) => {
    events.push(e);
  });
  play();
  off();
  return events;
}

describe("the hub song", () => {
  test("plays in the hub, pauses in a minigame and plays on after it", () => {
    const { game } = newGame();
    expect(
      soundsDuring(() => {
        run(game, 30);
      }),
    ).toEqual(["play:hub"]);
    expect(
      soundsDuring(() => {
        enterSweetSam(game);
      }).filter((e) => e.endsWith(":hub")),
    ).toEqual(["pause:hub"]);
    expect(
      soundsDuring(() => {
        quitGame(game);
      }).filter((e) => e.endsWith(":hub")),
    ).toEqual(["play:hub"]);
  });

  test("keeps playing under the prize counter menu", () => {
    const { game } = newGame();
    game.step(input());
    expect(
      soundsDuring(() => {
        run(game, 4, { down: true, space: true });
      }).filter((e) => e.endsWith(":hub")),
    ).toEqual([]);
    expect(snap(game).menu).toBe("prizeCounter");
  });

  test("pauseAudio and resumeAudio pause and play it and the faced cabinet; stopAudio rewinds both", () => {
    const { game } = newGame();
    run(game, 25, { up: true });
    expect(
      soundsDuring(() => {
        game.pauseAudio();
      }),
    ).toEqual(["pause:hub", "pause:attractSweet"]);
    expect(
      soundsDuring(() => {
        game.resumeAudio();
      }),
    ).toEqual(["play:hub", "play:attractSweet"]);
    expect(
      soundsDuring(() => {
        game.stopAudio();
      }),
    ).toEqual(["pause:hub", "rewind:hub", "pause:attractSweet", "rewind:attractSweet"]);
  });
});

describe("entering and leaving software", () => {
  test("Space at a cabinet hands its software to the Game on the same tick", () => {
    const { game, built } = newGame();
    enterSweetSam(game);
    const s = snap(game);
    expect(s.software).toBe("sweetSam");
    expect(s.sounds).toEqual([
      "pause:attractSweet",
      "rewind:attractSweet",
      "rewind:sweetStart",
      "play:sweetStart",
      "pause:hub",
    ]);
    expect(built[0]?.updates).toEqual([]);
    game.step(input({ left: true }));
    expect(built[0]?.updates).toEqual([input({ left: true })]);
    expect(snap(game).arcade.player.x).toBe(80); // hub frozen while the software runs
  });

  test("Escape in the hub does nothing special", () => {
    const { game } = newGame();
    game.step(input());
    game.step(input({ escape: true, left: true }));
    const s = snap(game);
    expect(s.sounds).toEqual([]);
    expect(s.arcade.player.x).toBe(79);
  });

  test("Escape does not take the score as a high score", () => {
    const { game, built } = newGame();
    enterSweetSam(game);
    const sw = built[0];
    if (sw === undefined) throw new Error("sweetSam not built");
    sw.points = 500;
    quitGame(game);
    expect(snap(game).arcade.highScore).toBe(0);
  });

  test("a direct start (game.New(software)) that ends goes straight back to the hub: no payout", () => {
    const { game, built } = newGame("sweetSam");
    game.step(input());
    const first = defined(built[0]);
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
    enterSweetSam(game);
    const first = built[0];
    if (first === undefined) throw new Error("sweetSam not built");
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
    if (second === undefined) throw new Error("second sweetSam not built");
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
/** Lets a bare `{ paused }` stand in for the DOM audio element; Sound only reads `paused` here. */
function standsInForAudio(x: object): x is HTMLAudioElement {
  return "paused" in x;
}

/** Sound events heard while `fn` runs. */
function heard(game: Game, fn: () => void): string[] {
  const out: string[] = [];
  const before = snap(game).tick;
  const all: string[][] = [];
  const step = game.step.bind(game);
  game.step = (i: Input): void => {
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

const minigameSoundPauses: SoundEvent[] = [
  "pause:sweetStart",
  "pause:sweetChompHigh",
  "pause:sweetChompLow",
  "pause:sweetSmoke",
  "pause:sweetBee",
  "pause:sweetFlower",
  "pause:sweetDeath",
  "pause:sweetClear",
  "pause:spark",
  "pause:hit",
  "pause:lifeLost",
  "pause:stage",
];

describe("minigame pause menu", () => {
  test("Esc opens it over the minigame: no update that tick, the tick still counts, sounds pause", () => {
    const { game, built } = newGame();
    enterSweetSam(game);
    run(game, 3);
    const tick = snap(game).tick;
    game.step(input({ escape: true, left: true }));
    const s = snap(game);
    expect(s.menu).toBe("paused");
    expect(s.cursor).toBe(0);
    expect(s.software).toBe("sweetSam");
    expect(s.sw).not.toBeNull();
    expect(s.tick).toBe(tick + 1);
    expect(s.sounds).toEqual(["rewind:select", "play:select", ...minigameSoundPauses]);
    expect(built[0]?.updates.length).toBe(3);
    expect(game.inHub()).toBe(false);
  });

  test("the minigame does not advance while the menu is open, and held Esc does not close it", () => {
    const { game, built } = newGame();
    enterSweetSam(game);
    run(game, 3);
    run(game, 30, { escape: true });
    run(game, 30, { left: true });
    expect(snap(game).menu).toBe("paused");
    expect(built[0]?.updates.length).toBe(3);
  });

  test("Up and Down move the cursor with the move blip, wrapping", () => {
    const { game } = newGame();
    enterSweetSam(game);
    tap(game, "escape");
    expect(
      heard(game, () => {
        tap(game, "down");
      }),
    ).toEqual(["rewind:move", "play:move"]);
    expect(snap(game).cursor).toBe(1);
    tap(game, "down");
    tap(game, "down");
    expect(snap(game).cursor).toBe(0);
    tap(game, "up");
    expect(snap(game).cursor).toBe(2);
  });

  test("Space on Resume carries on from the same tick; the held Space is hidden until released", () => {
    const { game, built } = newGame();
    enterSweetSam(game);
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
    enterSweetSam(game);
    tap(game, "escape");
    tap(game, "escape");
    expect(snap(game).menu).toBeNull();
    game.step(input());
    expect(built[0]?.updates.length).toBe(2);
  });

  test("Resume restarts only the minigame sounds that were playing", () => {
    const { game } = newGame();
    enterSweetSam(game);
    const fakeElement = { paused: false };
    if (!standsInForAudio(fakeElement)) throw new Error("fake element lacks paused");
    sweetSamSounds.bee.element = fakeElement;
    try {
      tap(game, "escape");
      expect(
        heard(game, () => {
          tap(game, "escape");
        }),
      ).toEqual(["rewind:select", "play:select", "play:sweetBee"]);
    } finally {
      sweetSamSounds.bee.element = null;
    }
  });

  test("Controls shows the controls; Esc or Space backs out to the menu", () => {
    const { game } = newGame();
    enterSweetSam(game);
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
    enterSweetSam(game);
    expect(snap(game).arcade.tokens).toBe(4);
    defined(built[0]).points = 900;
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
    expect(s.software).toBe("sweetSam");
    expect(s.arcade.tokens).toBe(3);
  });
});

function endRun(points: number, tokens = 5): Harness & { sw: FakeSoftware } {
  const g = newGame(null, { highScore: 0, tokens, tickets: 0, prizes: [], player: { x: 80, y: 92, dir: "DOWN" } });
  enterSweetSam(g.game);
  const sw = defined(g.built[0]);
  sw.points = points;
  sw.over = true;
  g.game.step(input());
  return { ...g, sw };
}

describe("payout", () => {
  test("a run ending with 1420 opens the payout over the minigame and adds 14 tickets", () => {
    const { game, sw } = endRun(1420);
    let s = snap(game);
    expect(s.menu).toBe("payout");
    expect(s.software).toBe("sweetSam");
    expect(s.run).toBe("paid");
    expect(s.arcade.highScore).toBe(1420);
    expect(s.arcade.tickets).toBe(14);
    expect(s.payout).toEqual({ score: 1420, tickets: 0, total: 14, freePlay: false, counting: true });
    expect(game.inHub()).toBe(false);
    expect(game.layout()).toEqual([240, 304]);
    const sounds = heard(game, () => {
      run(game, 14 * 20 + 40);
    });
    expect(sounds.filter((e) => e === "play:ticket")).toHaveLength(14);
    s = snap(game);
    expect(s.payout).toEqual({ score: 0, tickets: 14, total: 14, freePlay: false, counting: false });
    expect(sw.updates.length).toBe(1); // never updated after the game over
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
});

/** A hub with these counts; the player walks down to the counter and presses Space. */
function atCounter(tokens: number, tickets: number): Harness {
  const g = newGame(null, { highScore: 0, tokens, tickets, prizes: [], player: { x: 80, y: 92, dir: "DOWN" } });
  run(g.game, 3, { down: true });
  g.game.step(input({ down: true, space: true }));
  g.game.step(input());
  return g;
}

function wallet(game: Game): { tokens: number; tickets: number } {
  const a = snap(game).arcade;
  return { tokens: a.tokens, tickets: a.tickets };
}

/** The prize counter menu with the cursor on prize `n` (0 = honey jar). */
function atPrize(tickets: number, n: number, prizes: PrizeId[] = []): Harness {
  const g = newGame(null, { highScore: 0, tokens: 5, tickets, prizes, player: { x: 80, y: 92, dir: "DOWN" } });
  run(g.game, 3, { down: true });
  g.game.step(input({ down: true, space: true }));
  g.game.step(input());
  for (let i = 0; i <= n; i++) tap(g.game, "down");
  return g;
}

describe("prize counter", () => {
  test("Space facing the counter opens its menu over the hub", () => {
    const { game, built } = newGame();
    run(game, 3, { down: true });
    const sounds = heard(game, () => {
      game.step(input({ space: true }));
    });
    const s = snap(game);
    expect(s.menu).toBe("prizeCounter");
    expect(s.cursor).toBe(0);
    expect(s.software).toBeNull();
    expect(s.run).toBeNull();
    expect(built).toEqual([]);
    expect(game.inHub()).toBe(false);
    expect(game.layout()).toEqual([192, 176]);
    expect(sounds).toEqual(["rewind:select", "play:select"]);
  });

  test("Space elsewhere in the hub does not open it", () => {
    const { game } = newGame();
    game.step(input({ space: true }));
    run(game, 20, { left: true });
    game.step(input({ space: true }));
    expect(snap(game).menu).toBeNull();
  });

  test("the hub stands still while the menu is open", () => {
    const { game } = atCounter(5, 0);
    const before = snap(game).arcade.player;
    run(game, 10, { left: true });
    expect(snap(game).arcade.player).toEqual(before);
  });

  test("Esc closes it and the hub carries on", () => {
    const { game } = atCounter(5, 0);
    tap(game, "escape");
    expect(snap(game).menu).toBeNull();
    expect(game.inHub()).toBe(true);
    game.step(input({ left: true }));
    expect(snap(game).arcade.player.x).toBe(79);
  });

  test("CLOSE closes it, and the Space that chose it does not open it again", () => {
    const { game } = atCounter(5, 0);
    tap(game, "up");
    expect(snap(game).cursor).toBe(10);
    run(game, 5, { space: true });
    expect(snap(game).menu).toBeNull();
    expect(snap(game).cursor).toBe(0);
    game.step(input());
    game.step(input({ space: true }));
    expect(snap(game).menu).toBe("prizeCounter");
  });

  test("Up and Down move the cursor round the eleven items (token, nine prizes, CLOSE) with the move blip", () => {
    const { game } = atCounter(5, 0);
    const sounds = heard(game, () => {
      tap(game, "up");
    });
    expect(snap(game).cursor).toBe(10);
    expect(sounds).toEqual(["rewind:move", "play:move"]);
    tap(game, "down");
    expect(snap(game).cursor).toBe(0);
    for (let i = 1; i <= 10; i++) {
      tap(game, "down");
      expect(snap(game).cursor).toBe(i);
    }
  });

  test("Space on a prize the player can afford buys it: its price comes off once and it is owned", () => {
    const { game } = atPrize(60, 0);
    const sounds = heard(game, () => {
      tap(game, "space");
    });
    expect(sounds).toEqual(["rewind:select", "play:select"]);
    expect(snap(game).arcade).toMatchObject({ tickets: 35, prizes: ["honeyJar"] });
    expect(game.progress()).toMatchObject({ tickets: 35, prizes: ["honeyJar"] });
    expect(snap(game).menu).toBe("prizeCounter");
  });

  test("an unaffordable prize can't be bought: the no sound, nothing taken", () => {
    const { game } = atPrize(99, 2);
    const sounds = heard(game, () => {
      tap(game, "space");
    });
    expect(sounds).toEqual(["rewind:deny", "play:deny"]);
    expect(snap(game).arcade.tickets).toBe(99);
    expect(snap(game).arcade.prizes).toBeUndefined();
  });

  test("owned prizes go to every minigame the player starts, paid or free play", () => {
    const { game, built } = atPrize(60, 0);
    tap(game, "space");
    tap(game, "escape");
    run(game, 40, { up: true });
    game.step(input({ up: true, space: true }));
    expect(snap(game)).toMatchObject({ software: "sweetSam", run: "paid" });
    expect(defined(built[0]).prizes).toEqual(["honeyJar"]);

    const free = newGame(null, {
      highScore: 0,
      tokens: 0,
      tickets: 0,
      prizes: ["sleepyBees"],
      player: { x: 80, y: 92, dir: "UP" },
    });
    enterSweetSam(free.game);
    expect(snap(free.game).run).toBe("free");
    expect(defined(free.built[0]).prizes).toEqual(["sleepyBees"]);
  });

  test("a Firefly prize is bought the same way, and goes to the Firefly run", () => {
    const { game, built } = atPrize(60, 3); // the lantern
    tap(game, "space");
    expect(snap(game).arcade).toMatchObject({ tickets: 35, prizes: ["lantern"] });
    expect(game.progress()).toMatchObject({ tickets: 35, prizes: ["lantern"] });
    tap(game, "space");
    expect(snap(game).arcade.tickets).toBe(35);
    tap(game, "down"); // glow stick, 50: too few tickets
    tap(game, "space");
    expect(snap(game).arcade).toMatchObject({ tickets: 35, prizes: ["lantern"] });
    tap(game, "escape");
    run(game, 40, { up: true });
    run(game, 40, { right: true });
    game.step(input({ up: true, space: true }));
    expect(snap(game).software).toBe("firefly");
    expect(defined(built[0]).prizes).toEqual(["lantern"]);
  });

  test("with 5 or more tickets, Space buys a token for 5 and the counts update at once", () => {
    const { game } = atCounter(2, 12);
    const sounds = heard(game, () => {
      tap(game, "space");
    });
    expect(wallet(game)).toEqual({ tokens: 3, tickets: 7 });
    expect(sounds).toEqual(["rewind:select", "play:select"]);
    expect(snap(game).menu).toBe("prizeCounter");
    tap(game, "space");
    expect(wallet(game)).toEqual({ tokens: 4, tickets: 2 });
    expect(game.progress()).toMatchObject({ tokens: 4, tickets: 2 });
  });

  test("with tokens left and too few tickets, Space gives the no sound and buys nothing", () => {
    const { game } = atCounter(4, 2);
    const sounds = heard(game, () => {
      tap(game, "space");
    });
    expect(wallet(game)).toEqual({ tokens: 4, tickets: 2 });
    expect(sounds).toEqual(["rewind:deny", "play:deny"]);
    expect(snap(game).menu).toBe("prizeCounter");
  });

  test("a bought token pays for the next cabinet start", () => {
    const { game } = atCounter(0, 5);
    tap(game, "space");
    tap(game, "escape");
    run(game, 40, { up: true });
    game.step(input({ up: true, space: true }));
    expect(snap(game)).toMatchObject({ software: "sweetSam", run: "paid", arcade: { tokens: 0, tickets: 0 } });
  });
});

describe("progress", () => {
  test("carries tokens and tickets, and restore brings them back", () => {
    const { game } = newGame();
    enterSweetSam(game);
    expect(game.progress()).toMatchObject({ tokens: 4, tickets: 0 });
    const restored = new Game(null, {
      createSoftware: fakes().factory,
      restore: { highScore: 9, tokens: 2, tickets: 31, prizes: [], player: { x: 80, y: 92, dir: "UP" } },
    });
    games.push(restored);
    expect(snap(restored).arcade).toMatchObject({ highScore: 9, tokens: 2, tickets: 31 });
  });

  test("a save from before the prize desk, standing where the desk now is, starts at the start position", () => {
    // (40, 100) was free floor beside the old counter; the desk now spans the floor there.
    const restored = new Game(null, {
      createSoftware: fakes().factory,
      restore: { highScore: 0, tokens: 2, tickets: 0, prizes: [], player: { x: 40, y: 100, dir: "LEFT" } },
    });
    games.push(restored);
    expect(snap(restored).arcade.player).toMatchObject({ x: 80, y: 92 });
  });

  test("carries owned prizes, and restore brings them back in catalogue order", () => {
    const { game } = newGame(null, {
      highScore: 0,
      tokens: 5,
      tickets: 0,
      prizes: ["wings", "sleepyBees", "lantern", "honeyJar"],
      player: { x: 80, y: 92, dir: "UP" },
    });
    expect(game.progress().prizes).toEqual(["honeyJar", "sleepyBees", "lantern", "wings"]);
    expect(snap(game).arcade.prizes).toEqual(["honeyJar", "sleepyBees", "lantern", "wings"]);
  });

  test("a fresh hub owns no prizes, and its snapshot has no prizes key (the parity traces predate prizes)", () => {
    const { game } = newGame();
    expect(game.progress().prizes).toEqual([]);
    expect("prizes" in snap(game).arcade).toBe(false);
  });

  test("a minigame started straight from game.New gets no prizes", () => {
    const { built } = newGame("sweetSam");
    expect(defined(built[0]).prizes).toEqual([]);
  });

  test("a saved position inside the prize counter keeps the start position", () => {
    const { game } = newGame(null, {
      highScore: 0,
      tokens: 5,
      tickets: 0,
      prizes: [],
      player: { x: 80, y: 100, dir: "LEFT" },
    });
    expect(snap(game).arcade.player).toMatchObject({ x: 80, y: 92, dir: "LEFT" });
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
    ["sweetSam", [240, 304], [360, 304]],
    ["firefly", [256, 320], [376, 320]],
    ["brassMonkey", [256, 288], [376, 288]],
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
    const { game, built } = newGame("brassMonkey");
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
    sweetSamSounds.start.play();
    game.step(input());
    expect(snap(game).sounds).toEqual([]);
  });
});
