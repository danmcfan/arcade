import { afterEach, describe, expect, test } from "bun:test";
import { NO_INPUT, type Input } from "../engine/input.ts";
import { imageFireflyBackground } from "../engine/assets.ts";
import { addSoundListener, type SoundEvent } from "../engine/audio.ts";
import * as rng from "../engine/rng.ts";
import { Game } from "../game/game.ts";
import { ticketsFor } from "../game/payout.ts";
import { fireflySnapshot } from "../game/snapshot.testutil.ts";
import { isFixedViewport } from "../game/software.ts";
import { angle, frameAngle, radToDeg, type Enemy } from "./entity.ts";
import { FireflySoftware, playerY } from "./game.ts";
import { createFirefly } from "./index.ts";
import {
  difficulty,
  enemyHp,
  formation,
  hitEffectTicks,
  maxSparks,
  points,
  respawnTicks,
  sparkSpeed,
  stageIntroTicks,
  startLives,
  swayOffset,
  type EnemyKind,
} from "./rules.ts";

describe("angle", () => {
  const tests = [
    { direction: { x: 0, y: 0 }, angle: 0 },
    { direction: { x: 0, y: -1 }, angle: 0 },
    { direction: { x: 1, y: -1 }, angle: 45 },
    { direction: { x: 1, y: 0 }, angle: 90 },
    { direction: { x: 1, y: 1 }, angle: 135 },
    { direction: { x: 0, y: 1 }, angle: 180 },
    { direction: { x: -1, y: 1 }, angle: 225 },
    { direction: { x: -1, y: 0 }, angle: 270 },
    { direction: { x: -1, y: -1 }, angle: 315 },
  ];
  for (const t of tests) {
    test(`(${t.direction.x}, ${t.direction.y}) → ${t.angle}`, () => {
      expect(angle(t.direction)).toBe(t.angle);
    });
  }

  test("radToDeg is 180/π", () => {
    expect(radToDeg).toBe(180 / Math.PI);
  });
});

describe("frameAngle", () => {
  const tests = [
    { angle: 0, row: 0, col: 0 },
    { angle: 15, row: 0, col: 1 },
    { angle: 75, row: 0, col: 5 },
    { angle: 90, row: 1, col: 0 },
    { angle: 180, row: 2, col: 0 },
    { angle: 270, row: 3, col: 0 },
  ];
  for (const t of tests) {
    test(`${t.angle}° → row ${t.row}, col ${t.col}`, () => {
      expect(frameAngle(t.angle)).toEqual([t.row, t.col]);
    });
  }
});

const held = (i: Partial<Input> = {}): Input => ({ ...NO_INPUT, ...i });

function run(f: FireflySoftware, ticks: number, i: Partial<Input> = {}): void {
  for (let t = 0; t < ticks; t++) f.update(held(i));
}

function recordSounds(): { events: SoundEvent[]; stop: () => void } {
  const events: SoundEvent[] = [];
  const stop = addSoundListener((e) => {
    events.push(e);
  });
  return { events, stop };
}

/** A software past its intro with only `enemy` left on the field, frozen in place. */
function withOnly(kind: EnemyKind, at: { x: number; y: number }): { f: FireflySoftware; e: Enemy } {
  const f = new FireflySoftware();
  f.stageTick = stageIntroTicks + 1;
  const e = f.enemies.find((en) => en.kind === kind);
  if (e === undefined) throw new Error(`no ${kind}`);
  // "joining" with its slot where it stands: it stays put.
  e.state = "joining";
  e.x = at.x;
  e.y = at.y;
  e.home = { x: at.x - swayOffset(f.ticks + 1), y: at.y };
  f.enemies = [e];
  return { f, e };
}

/** A spark that reaches (x, y) on the next tick. */
function sparkAt(f: FireflySoftware, x: number, y: number): void {
  f.sparks.push({ x, y: y + sparkSpeed });
}

describe("a new run", () => {
  test("is Firefly on the night sky: stage 1, 3 lives, no score, not over", () => {
    const f = createFirefly();
    expect(f.name).toBe("firefly");
    expect(f.background()).toBe(imageFireflyBackground);
    expect(f.gameOver()).toBe(false);
    expect(f.score()).toBe(0);
    const s = fireflySnapshot(f.snapshot());
    expect([s.stage, s.lives, s.score, s.over]).toEqual([1, startLives, 0, false]);
    expect(s.player).toEqual({ x: 112, y: playerY });
  });

  test("is a FixedViewport the size of the cabinet", () => {
    const f = createFirefly();
    expect(isFixedViewport(f)).toBe(true);
    if (isFixedViewport(f)) expect(f.fixedViewportSize()).toEqual([336, 428]);
  });

  test("the snapshot's joystick follows the input", () => {
    const f = new FireflySoftware();
    const frames = [held(), held({ up: true }), held({ down: true }), held({ left: true }), held({ right: true })].map(
      (i) => {
        f.update(i);
        return f.snapshot().joystick;
      },
    );
    expect(frames).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("stage start", () => {
  test("plays the stage sound, then the enemies wait out the STAGE n text before flying in", () => {
    const f = new FireflySoftware();
    const rec = recordSounds();
    f.update(NO_INPUT);
    rec.stop();
    expect(rec.events).toEqual(["rewind:stage", "play:stage"]);
    run(f, stageIntroTicks - 2);
    expect(f.enemies.every((e) => e.state === "waiting")).toBe(true);
    run(f, 2);
    expect(f.enemies.filter((e) => e.state === "entering").length).toBeGreaterThan(0);
  });

  test("every enemy flies in to its own slot in the swaying formation", () => {
    rng.seed(1);
    const f = new FireflySoftware();
    let t = 0;
    while (!f.enemies.every((e) => e.state === "formation") && t++ < 2000) f.update(NO_INPUT);
    expect(t).toBeLessThan(2000);
    const sway = swayOffset(f.ticks);
    expect(f.enemies.map((e) => [e.kind, e.x - sway, e.y])).toEqual(formation().map((s) => [s.kind, s.x, s.y]));
  });
});

/** A fresh software with every enemy settled in formation and a dive due next tick. */
function settled(): FireflySoftware {
  const f = new FireflySoftware();
  f.stageTick = stageIntroTicks + 1;
  for (const e of f.enemies) {
    e.state = "formation";
    e.path = null;
  }
  f.diveTimer = 1;
  return f;
}

describe("dives", () => {
  test("once every enemy is in, they break off and dive, Wasps most often", () => {
    rng.seed(7);
    const counts: Record<EnemyKind, number> = { moth: 0, wasp: 0, owl: 0 };
    for (let i = 0; i < 300; i++) {
      const f = settled();
      f.update(NO_INPUT);
      const diver = f.enemies.find((e) => e.state === "diving");
      if (diver === undefined) throw new Error("no dive started");
      counts[diver.kind]++;
    }
    expect(counts.wasp).toBeGreaterThan(counts.moth);
    expect(counts.wasp).toBeGreaterThan(counts.owl);
  });

  test("divers drop shots aimed down at the firefly, then rejoin the formation", () => {
    rng.seed(3);
    const f = settled();
    f.update(NO_INPUT);
    const diver = f.enemies.find((e) => e.state === "diving");
    if (diver === undefined) throw new Error("no dive started");
    f.diveTimer = 1_000_000;
    let shots = 0;
    for (let t = 0; t < 600 && diver.state !== "formation"; t++) {
      f.update(NO_INPUT);
      shots = Math.max(shots, f.shots.length);
      if (f.respawn > 0) break;
    }
    expect(shots).toBeGreaterThan(0);
    expect(f.shots.every((s) => s.dy > 0)).toBe(true);
  });

  test("each dive sends as many enemies as the stage says, together", () => {
    rng.seed(5);
    for (const stage of [1, 2, 3]) {
      const f = settled();
      f.stage = stage;
      f.update(NO_INPUT);
      expect(f.enemies.filter((e) => e.state === "diving").length).toBe(difficulty(stage).diversPerDive);
      expect(f.diveTimer).toBe(difficulty(stage).diveInterval);
    }
  });
});

describe("sparks", () => {
  test("Space fires a spark that flies up, with never more than 2 on the screen", () => {
    const f = new FireflySoftware();
    const rec = recordSounds();
    f.update(held({ space: true }));
    rec.stop();
    expect(rec.events).toContain("play:spark");
    expect(f.sparks).toEqual([{ x: 112, y: playerY - 10 - sparkSpeed }]);
    let most = 0;
    for (let t = 0; t < 200; t++) {
      f.update(held({ space: true }));
      most = Math.max(most, f.sparks.length);
    }
    expect(most).toBe(maxSparks);
  });

  test("the firefly moves left and right only, kept on the screen", () => {
    const f = new FireflySoftware();
    run(f, 10, { left: true });
    expect(f.player).toEqual({ x: 92, y: playerY });
    run(f, 10, { up: true });
    expect(f.player).toEqual({ x: 92, y: playerY });
    run(f, 200, { right: true });
    expect(f.player.x).toBe(216);
  });
});

describe("hits", () => {
  for (const kind of ["moth", "wasp"] as const) {
    test(`one spark kills a ${kind}`, () => {
      const { f, e } = withOnly(kind, { x: 100, y: 100 });
      sparkAt(f, 100, 100);
      const rec = recordSounds();
      f.update(NO_INPUT);
      rec.stop();
      expect(rec.events).toContain("play:hit");
      expect([e.hp, e.deadFrames]).toEqual([0, hitEffectTicks - 1]);
      expect(f.sparks).toEqual([]);
    });
  }

  test("an Owl takes 2 sparks: the first leaves it hurt", () => {
    const { f, e } = withOnly("owl", { x: 100, y: 100 });
    expect(e.hp).toBe(enemyHp.owl);
    sparkAt(f, 100, 100);
    f.update(NO_INPUT);
    expect([e.hp, e.deadFrames]).toEqual([1, 0]);
    expect(f.snapshot().enemies[0]?.hp).toBe(1);
    sparkAt(f, e.x, e.y);
    f.update(NO_INPUT);
    expect(e.hp).toBe(0);
    expect(e.deadFrames).toBeGreaterThan(0);
  });

  test("a diving kill scores more than a kill in formation", () => {
    const a = withOnly("moth", { x: 100, y: 100 });
    sparkAt(a.f, 100, 100);
    a.f.update(NO_INPUT);
    expect(a.f.score()).toBe(points("moth", false));

    const b = withOnly("moth", { x: 100, y: 100 });
    b.e.state = "diving";
    b.e.outOfFormation = true;
    b.e.path = { p0: { x: 100, y: 100 }, p1: { x: 100, y: 100 }, p2: { x: 100, y: 100 }, p3: { x: 100, y: 100 } };
    b.e.tStep = 0.001;
    sparkAt(b.f, 100, 100);
    b.f.update(NO_INPUT);
    expect(b.f.score()).toBe(points("moth", true));
    expect(b.f.score()).toBeGreaterThan(a.f.score());
  });

  test("an enemy flying back to the formation after its dive still scores the diving points", () => {
    const { f, e } = withOnly("owl", { x: 100, y: 100 });
    e.outOfFormation = true; // "joining" after its swoop, its slot far above
    e.home = { x: 100, y: 40 };
    e.hp = 1;
    sparkAt(f, 100, 98);
    f.update(NO_INPUT);
    expect(f.score()).toBe(points("owl", true));
  });
});

describe("lives", () => {
  test("an enemy shot touching the firefly costs a life; it comes back after a pause", () => {
    const { f } = withOnly("moth", { x: 30, y: 40 });
    f.shots.push({ x: 112, y: playerY - 3, dx: 0, dy: 0 });
    const rec = recordSounds();
    f.update(NO_INPUT);
    rec.stop();
    expect(rec.events).toContain("play:lifeLost");
    expect([f.lives, f.respawn]).toEqual([startLives - 1, respawnTicks - 1]);
    run(f, 50, { left: true, space: true });
    expect(f.player.x).toBe(112);
    expect(f.sparks).toEqual([]);
    run(f, respawnTicks);
    expect(f.respawn).toBe(0);
    expect(f.gameOver()).toBe(false);
  });

  test("shots still falling when the firefly comes back are cleared, so it is not hit at once", () => {
    const { f } = withOnly("moth", { x: 30, y: 40 });
    f.loseLife();
    run(f, respawnTicks - 1);
    f.shots.push({ x: 112, y: playerY - 6, dx: 0, dy: 3 });
    f.update(NO_INPUT);
    expect(f.respawn).toBe(0);
    expect(f.shots).toEqual([]);
    f.update(NO_INPUT);
    expect(f.lives).toBe(startLives - 1);
  });

  test("an enemy touching the firefly costs a life, and that enemy dies too", () => {
    const { f, e } = withOnly("wasp", { x: 112, y: playerY });
    f.update(NO_INPUT);
    expect(f.lives).toBe(startLives - 1);
    expect(e.hp).toBe(0);
  });

  test("the third lost life ends the run once the firefly's burst has played", () => {
    const { f } = withOnly("moth", { x: 30, y: 40 });
    f.points = 1234;
    for (let life = 0; life < startLives; life++) {
      expect(f.gameOver()).toBe(false);
      f.shots.push({ x: f.player.x, y: playerY, dx: 0, dy: 0 });
      f.update(NO_INPUT);
      expect(f.lives).toBe(startLives - 1 - life);
      run(f, respawnTicks);
    }
    expect(f.gameOver()).toBe(true);
    expect(f.snapshot().over).toBe(true);
    expect(f.score()).toBe(1234);
  });
});

describe("stages", () => {
  test("when the last enemy is dead and its hit effect has played, the next stage starts", () => {
    const { f } = withOnly("moth", { x: 100, y: 100 });
    sparkAt(f, 100, 100);
    f.shots.push({ x: 20, y: 0, dx: 0, dy: 0 });
    f.update(NO_INPUT);
    expect(f.stage).toBe(1);
    run(f, hitEffectTicks - 2);
    expect(f.stage).toBe(1);
    f.update(NO_INPUT);
    expect(f.stage).toBe(2);
    expect(f.stageTick).toBe(0);
    expect(f.enemies.length).toBe(40);
    expect(f.diveTimer).toBe(difficulty(2).diveInterval);
    expect(f.shots).toEqual([]);
    const rec = recordSounds();
    f.update(NO_INPUT);
    rec.stop();
    expect(rec.events).toContain("play:stage");
  });
});

describe("payout", () => {
  const games: Game[] = [];
  afterEach(() => {
    for (const g of games.splice(0)) g.dispose();
  });

  test("a paid run played to game over pays its score in tickets", () => {
    rng.seed(1);
    const game = new Game(null, {
      restore: { highScore: 0, tokens: 1, tickets: 0, prizes: [], player: { x: 80, y: 92, dir: "DOWN" } },
    });
    games.push(game);
    // Walk up to the Firefly cabinet and press Space.
    for (let t = 0; t < 31; t++) game.step(held({ up: true }));
    for (let t = 0; t < 24; t++) game.step(held({ right: true }));
    game.step(held({ up: true, space: true }));
    expect(game.snapshot().software).toBe("firefly");

    let score = 0;
    for (let t = 0; t < 40_000 && game.snapshot().menu !== "payout"; t++) {
      game.step(held({ space: t % 2 === 0, left: t % 400 < 100, right: t % 400 >= 200 && t % 400 < 300 }));
      const sw = game.snapshot().sw;
      if (sw !== null) score = fireflySnapshot(sw).score;
    }
    const s = game.snapshot();
    expect(s.menu).toBe("payout");
    expect(score).toBeGreaterThan(0);
    expect(s.payout?.score).toBe(score);
    expect(s.payout?.total).toBe(ticketsFor(score, false));
    expect(s.arcade.tickets).toBe(ticketsFor(score, false));
  });
});
