import { afterEach, describe, expect, test } from "bun:test";
import { soundStart } from "../engine/assets.ts";
import { makeSolid, type Sprite } from "../engine/image.ts";
import { NO_INPUT, type Input } from "../engine/input.ts";
import * as rng from "../engine/rng.ts";
import type { Surface } from "../engine/surface.ts";
import { Game } from "./game.ts";
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
function newGame(initial: SoftwareName | null = null) {
  const f = fakes();
  const game = new Game(initial, { createSoftware: f.factory });
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
      },
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

  test("Escape leaves the software, pauses the start jingle and skips the update", () => {
    const { game, built } = newGame();
    enterHive(game);
    run(game, 3);
    game.step(input({ escape: true, left: true }));
    const s = snap(game);
    expect(s.software).toBeNull();
    expect(s.sw).toBeNull();
    expect(s.sounds).toEqual(["pause:start"]);
    expect(built[0]?.updates.length).toBe(3);
    expect(s.arcade.player.x).toBe(80); // no hub update on the Escape tick either
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
    game.step(input({ escape: true }));
    expect(snap(game).arcade.highScore).toBe(0);
  });

  test("on gameOver the high score becomes max(high score, score) and the Game returns to the hub", () => {
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
    expect(s.software).toBeNull();
    expect(s.arcade.highScore).toBe(500);
    expect(first.updates.length).toBe(3); // updated on the game-over tick

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

  test("leaving a software restores the hub layout", () => {
    const { game } = newGame("firefly");
    game.step(input());
    expect(game.layout()).toEqual([256, 320]);
    game.step(input({ escape: true }));
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
