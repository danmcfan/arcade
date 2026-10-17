import { afterEach, describe, expect, test } from "bun:test";
import { NO_INPUT, type Input } from "../engine/input.ts";
import { imageFireflyBackground } from "../engine/assets.ts";
import { addSoundListener, type SoundEvent } from "../engine/audio.ts";
import * as rng from "../engine/rng.ts";
import { Game } from "../game/game.ts";
import { noHighScores, ticketsFor } from "../arcade/wallet.ts";
import { fireflySnapshot } from "../game/snapshot.testutil.ts";
import { isFixedViewport } from "../game/software.ts";
import { angle, frameAngle, radToDeg, type Enemy, type Vec } from "./entity.ts";
import { beamY, bonusTicks, FireflySoftware, playerY } from "./game.ts";
import { minigame } from "../game/minigames.ts";
import { fireflyStartTune, tuneSeconds } from "../ui/sounds.ts";
import {
  beamTicks,
  beamWidth,
  difficulty,
  entryPairOffset,
  entryWaves,
  fieldWidth,
  enemyHp,
  fieldHeight,
  formation,
  hitEffectTicks,
  maxSparks,
  points,
  respawnTicks,
  sparkSpeed,
  stageIntroTicks,
  startLives,
  swayOffset,
  breathePeriod,
  type EnemyKind,
} from "./rules.ts";

/** Puts an Owl on a degenerate dive path that stays at (x, y), with one hit point. */
function divingAt(e: Enemy, x: number, y: number): void {
  const p = { x, y };
  e.state = "diving";
  e.outOfFormation = true;
  e.path = [{ p0: p, p1: p, p2: p, p3: p }];
  e.tStep = 0.001;
  e.hp = 1;
}

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
    const f = minigame("firefly").create({ highScore: 0, prizes: [] });
    expect(f.name).toBe("firefly");
    expect(f.background()).toBe(imageFireflyBackground);
    expect(f.gameOver()).toBe(false);
    expect(f.score()).toBe(0);
    const s = fireflySnapshot(f.snapshot());
    expect([s.stage, s.lives, s.score, s.over]).toEqual([1, startLives, 0, false]);
    expect(s.player).toEqual({ x: 112, y: playerY });
  });

  test("is a FixedViewport the size of the cabinet", () => {
    const f = minigame("firefly").create({ highScore: 0, prizes: [] });
    expect(isFixedViewport(f)).toBe(true);
    if (isFixedViewport(f)) expect(f.fixedViewportSize()).toEqual([240, 304]);
  });
});

describe("stage start", () => {
  test("a new run opens on the start theme, not the stage fanfare", () => {
    const f = new FireflySoftware();
    const rec = recordSounds();
    f.update(NO_INPUT);
    rec.stop();
    expect(rec.events).toEqual(["rewind:fireflyStart", "play:fireflyStart"]);
  });

  test("the start theme ends within the intro, and the firefly is held until it does", () => {
    expect(tuneSeconds(fireflyStartTune) * 60).toBeLessThanOrEqual(stageIntroTicks);
    const f = new FireflySoftware();
    run(f, stageIntroTicks, { left: true, space: true });
    expect(f.player.x).toBe(112);
    expect(f.sparks).toEqual([]);
    run(f, 1, { left: true });
    expect(f.player.x).toBeLessThan(112);
  });

  test("later stages play the stage fanfare, and the firefly moves during their intro", () => {
    const f = new FireflySoftware();
    f.jumpTo(2);
    const rec = recordSounds();
    f.update(held({ left: true }));
    rec.stop();
    expect(rec.events).toEqual(["rewind:stage", "play:stage"]);
    expect(f.player.x).toBeLessThan(112);
  });

  test("the enemies wait out the STAGE n text before flying in", () => {
    const f = new FireflySoftware();
    f.update(NO_INPUT);
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

describe("breathing", () => {
  test("once every enemy is in formation, the edges move in and out about a fixed centre", () => {
    rng.seed(1);
    const f = new FireflySoftware();
    let t = 0;
    while (f.formationPhase !== "breathe" && t++ < 2000) f.update(NO_INPUT);
    expect(t).toBeLessThan(2000);
    expect(f.enemies.every((e) => e.state === "formation")).toBe(true);
    const edge = f.enemies.find((e) => e.row === 4 && e.col === 0);
    if (edge === undefined) throw new Error("no edge moth");
    const meanX = (): number => f.enemies.reduce((sum, e) => sum + e.x, 0) / f.enemies.length;
    const [x0, mean0] = [edge.x, meanX()];
    run(f, breathePeriod / 2);
    expect(f.enemies.every((e) => e.state === "formation")).toBe(true);
    expect(edge.x).toBeLessThan(x0);
    expect(meanX()).toBe(mean0);
  });
});

describe("jumpTo", () => {
  test("starts stage n afresh: STAGE n text, a full formation, no shots, that stage's dive timer", () => {
    const f = new FireflySoftware();
    run(f, stageIntroTicks + 200, { space: true });
    f.jumpTo(8);
    expect(f.stage).toBe(8);
    expect(f.stageTick).toBe(0);
    expect(f.shots).toEqual([]);
    expect(f.enemies.length).toBe(formation().length);
    expect(f.enemies.every((e) => e.state === "waiting")).toBe(true);
    expect(f.diveTimer).toBe(difficulty(8).diveInterval);
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
  f.formationPhase = "breathe";
  f.diveTimer = 1;
  return f;
}

/** The curve step of the first diver on `stage`, from the same seed and formation. */
function diveStep(stage: number): number {
  rng.seed(9);
  const f = settled();
  f.stage = stage;
  f.update(NO_INPUT);
  const diver = f.enemies.find((e) => e.state === "diving");
  if (diver === undefined) throw new Error("no dive started");
  return diver.tStep;
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
      const divers = f.enemies.filter((e) => e.state === "diving" && e.escortOf === null);
      expect(divers.length).toBe(difficulty(stage).diversPerDive);
      expect(f.diveTimer).toBe(difficulty(stage).diveInterval);
    }
  });

  test("on later stages a diver flies its dive faster", () => {
    expect(diveStep(10) / diveStep(5)).toBeCloseTo(difficulty(10).diveSpeed / difficulty(5).diveSpeed);
  });

  test("on later stages a shot drifts further sideways at the firefly", () => {
    for (const stage of [5, 10]) {
      const f = settled();
      f.stage = stage;
      f.diveTimer = 1_000_000;
      const e = f.enemies[0];
      if (e === undefined) throw new Error("no enemy");
      divingAt(e, 20, 20);
      e.shotsLeft = 1;
      e.shotTimer = 1;
      f.player.x = 200;
      f.update(NO_INPUT);
      expect(f.shots.map((s) => s.dx)).toEqual([difficulty(stage).shotDrift]);
    }
  });
});

/** The Owl in column `col` of a settled formation. */
function owlAt(f: FireflySoftware, col: number): Enemy {
  const owl = f.enemies.find((e) => e.kind === "owl" && e.col === col);
  if (owl === undefined) throw new Error(`no owl in column ${col}`);
  return owl;
}

/** `settled()`, a tick on: everyone stands in their slot, and no dive is due. */
function inFormation(): FireflySoftware {
  rng.seed(1);
  const f = settled();
  f.diveTimer = 1_000_000;
  f.update(NO_INPUT);
  return f;
}

describe("Owl escorts", () => {
  test("a diving Owl takes the 2 Wasps from the slots under it, flying either side of it", () => {
    const f = inFormation();
    const owl = owlAt(f, 1);
    f.dive(owl);
    const escorts = f.enemies.filter((e) => e.state === "diving" && e !== owl);
    expect(escorts.length).toBe(2);
    expect(escorts.every((e) => e.kind === "wasp" && e.escortOf === owl && e.outOfFormation)).toBe(true);
    expect(escorts.every((e) => Math.abs(e.home.x - owl.home.x) <= 16)).toBe(true);
    for (let t = 0; t < 60; t++) {
      f.update(NO_INPUT);
      for (const e of escorts) {
        expect(e.state).toBe("diving");
        expect(Math.abs(e.x - owl.x)).toBeLessThanOrEqual(16);
        expect(e.y).toBe(owl.y);
      }
    }
    expect(escorts.map((e) => Math.sign(e.x - owl.x)).toSorted((a, b) => a - b)).toEqual([-1, 1]);
  });

  test("with no Wasps under it, an Owl dives alone", () => {
    const f = inFormation();
    const owl = owlAt(f, 1);
    f.enemies = f.enemies.filter((e) => e.kind !== "wasp" || Math.abs(e.home.x - owl.home.x) > 16);
    f.dive(owl);
    expect(f.enemies.filter((e) => e.state === "diving")).toEqual([owl]);
  });

  test("escorts go their own way once the Owl's swoop ends or it is shot", () => {
    const f = inFormation();
    const owl = owlAt(f, 2);
    f.dive(owl);
    const escorts = f.enemies.filter((e) => e.escortOf === owl);
    owl.hp = 1;
    sparkAt(f, owl.x, owl.y);
    f.update(NO_INPUT);
    expect(owl.deadFrames).toBeGreaterThan(0);
    expect(escorts.every((e) => e.escortOf === null && e.state === "joining")).toBe(true);

    const g = inFormation();
    const lead = owlAt(g, 1);
    g.dive(lead);
    const wings = g.enemies.filter((e) => e.escortOf === lead);
    for (let t = 0; t < 600 && lead.state === "diving"; t++) g.update(NO_INPUT);
    expect(["joining", "beaming"]).toContain(lead.state);
    g.update(NO_INPUT);
    expect(wings.every((e) => e.escortOf === null && e.state !== "diving")).toBe(true);
  });
});

/** A settled field with one Owl diving at (100, 100) and its 2 escorts beside it, frozen there. */
function escortedOwl(): { f: FireflySoftware; owl: Enemy; escorts: Enemy[] } {
  const f = inFormation();
  const owl = owlAt(f, 1);
  f.dive(owl);
  divingAt(owl, 100, 100);
  const escorts = f.enemies.filter((e) => e.escortOf === owl);
  f.update(NO_INPUT);
  f.sparks = [];
  return { f, owl, escorts };
}

describe("escort-kill bonus", () => {
  test("shooting both escorts and then the Owl scores 160 + 160 + 1600, with the bonus shown", () => {
    const { f, owl, escorts } = escortedOwl();
    for (const e of escorts) {
      sparkAt(f, e.x, e.y);
      f.update(NO_INPUT);
    }
    expect(f.score()).toBe(2 * points("wasp", true));
    sparkAt(f, owl.x, owl.y);
    f.update(NO_INPUT);
    expect(f.score()).toBe(2 * points("wasp", true) + 1600);
    expect(f.bonuses.map((b) => [b.points, b.x, b.y])).toEqual([[1600, owl.x, owl.y]]);
  });

  test("shooting the Owl first scores 400, then its escorts 160 each", () => {
    const { f, owl, escorts } = escortedOwl();
    sparkAt(f, owl.x, owl.y);
    f.update(NO_INPUT);
    expect(f.score()).toBe(400);
    expect(f.bonuses).toEqual([]);
    for (const e of escorts) {
      sparkAt(f, e.x, e.y);
      f.update(NO_INPUT);
    }
    expect(f.score()).toBe(400 + 160 + 160);
  });

  test("the bonus number shows for a while, then goes", () => {
    const { f, owl, escorts } = escortedOwl();
    const [escort] = escorts;
    if (escort === undefined) throw new Error("no escort");
    sparkAt(f, escort.x, escort.y);
    f.update(NO_INPUT);
    sparkAt(f, owl.x, owl.y);
    f.update(NO_INPUT);
    expect(f.bonuses.map((b) => b.points)).toEqual([800]);
    run(f, bonusTicks);
    expect(f.bonuses).toEqual([]);
  });
});

describe("sparks", () => {
  test("Space fires a spark that flies up, with never more than 2 on the screen", () => {
    const f = new FireflySoftware();
    run(f, stageIntroTicks);
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
    run(f, stageIntroTicks);
    run(f, 10, { left: true });
    expect(f.player).toEqual({ x: 92, y: playerY });
    run(f, 10, { up: true });
    expect(f.player).toEqual({ x: 92, y: playerY });
    run(f, 200, { right: true });
    expect(f.player.x).toBe(216);
  });
});

/** Kills a lone moth in formation with the score at `score` beforehand; returns lives gained and sounds. */
function killAt(f: FireflySoftware, score: number): { gained: number; sounds: SoundEvent[] } {
  const e = f.enemies[0];
  if (e === undefined) throw new Error("no enemy");
  e.hp = 1;
  e.deadFrames = 0;
  e.outOfFormation = false;
  sparkAt(f, e.x, e.y);
  f.points = score;
  const before = f.lives;
  const rec = recordSounds();
  f.update(NO_INPUT);
  rec.stop();
  return { gained: f.lives - before, sounds: rec.events };
}

describe("extra lives", () => {
  test("scoreTo sets the score, and the next tick pays any extra life it reaches", () => {
    const { f } = withOnly("moth", { x: 100, y: 100 });
    f.scoreTo(20_000);
    expect([f.score(), f.lives]).toEqual([20_000, startLives]);
    f.update(NO_INPUT);
    expect(f.lives).toBe(startLives + 1);
    f.scoreTo(19_990);
    f.scoreTo(20_000);
    f.update(NO_INPUT);
    expect(f.lives).toBe(startLives + 2);
  });

  const moth = points("moth", false);

  test("crossing 20,000, 70,000 and 140,000 each adds one life with the extra-life jingle", () => {
    const { f } = withOnly("moth", { x: 100, y: 100 });
    for (const t of [20_000, 70_000, 140_000]) {
      const below = killAt(f, t - moth - 10);
      expect(below.gained).toBe(0);
      expect(below.sounds).not.toContain("play:extraLife");
      const across = killAt(f, t - 10);
      expect(across.gained).toBe(1);
      expect(across.sounds).toContain("play:extraLife");
      expect(killAt(f, t + 10).gained).toBe(0);
    }
  });

  test("one jump across two thresholds pays two lives, once", () => {
    const { f } = withOnly("moth", { x: 100, y: 100 });
    f.points = 19_990;
    f.update(NO_INPUT);
    expect(f.lives).toBe(startLives);
    f.points = 75_000;
    f.update(NO_INPUT);
    expect(f.lives).toBe(startLives + 2);
    expect(f.snapshot().nextLife).toBe(140_000);
    f.update(NO_INPUT);
    expect(f.lives).toBe(startLives + 2);
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
      expect(rec.events).toContain(`play:${kind}Hit`);
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
    b.e.path = [{ p0: { x: 100, y: 100 }, p1: { x: 100, y: 100 }, p2: { x: 100, y: 100 }, p3: { x: 100, y: 100 } }];
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

  test("a formation Moth ramming the firefly dies but scores nothing", () => {
    const { f, e } = withOnly("moth", { x: 112, y: playerY });
    f.update(NO_INPUT);
    expect([f.score(), f.lives]).toEqual([0, startLives - 1]);
    expect(e.deadFrames).toBeGreaterThan(0);
  });

  test("a diving Owl ramming the firefly leaves the score unchanged", () => {
    const { f, e } = withOnly("owl", { x: 112, y: playerY });
    divingAt(e, 112, playerY);
    f.points = 1234;
    f.update(NO_INPUT);
    expect([f.score(), f.lives, e.hp]).toEqual([1234, startLives - 1, 0]);
  });

  test("shooting a diving Owl still scores 400", () => {
    const { f, e } = withOnly("owl", { x: 100, y: 100 });
    divingAt(e, 100, 100);
    sparkAt(f, 100, 100);
    f.update(NO_INPUT);
    expect(f.score()).toBe(400);
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
  test("on the last life, a rammed last enemy does not start the next stage: the run ends on stage 1", () => {
    const { f } = withOnly("wasp", { x: 112, y: playerY });
    f.lives = 1;
    f.update(NO_INPUT);
    run(f, respawnTicks + hitEffectTicks);
    expect([f.over, f.stage]).toEqual([true, 1]);
  });

  test("with lives left, a rammed last enemy still starts the next stage", () => {
    const { f } = withOnly("wasp", { x: 112, y: playerY });
    f.lives = 2;
    f.update(NO_INPUT);
    run(f, respawnTicks);
    expect([f.respawn, f.lives, f.stage, f.over]).toEqual([0, 1, 2, false]);
  });

  test("on the last life, shooting the last enemy on the tick the firefly is hit still ends the run on stage 1", () => {
    const { f } = withOnly("moth", { x: 100, y: 100 });
    f.lives = 1;
    sparkAt(f, 100, 100);
    f.shots.push({ x: 112, y: playerY - 3, dx: 0, dy: 0 });
    f.update(NO_INPUT);
    expect(f.lives).toBe(0);
    expect(f.enemies.every((e) => e.deadFrames > 0)).toBe(true);
    run(f, respawnTicks + hitEffectTicks);
    expect([f.over, f.stage]).toEqual([true, 1]);
  });

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
      restore: {
        highScores: noHighScores,
        tokens: 1,
        tickets: 0,
        arcadeWon: false,
        prizes: [],
        player: { x: 80, y: 92, dir: "DOWN" },
      },
    });
    games.push(game);
    // Walk up to the Firefly cabinet and press Space.
    for (let t = 0; t < 31; t++) game.step(held({ up: true }));
    for (let t = 0; t < 40; t++) game.step(held({ right: true }));
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
    expect(s.payout?.total).toBe(ticketsFor(score));
    expect(s.arcade.tickets).toBe(ticketsFor(score));
  });
});

describe("entry waves", () => {
  const enemies = new FireflySoftware().enemies;
  const at = (row: number, col: number): Enemy | undefined => enemies.find((e) => e.row === row && e.col === col);

  test("every Owl waits longer than the whole of wave 1", () => {
    const wave1 = entryWaves[0]?.pairs.flat() ?? [];
    const wave1Waits = enemies.filter((e) => wave1.some((s) => s.row === e.row && s.col === e.col)).map((e) => e.wait);
    expect(wave1Waits.length).toBe(8);
    for (const owl of enemies.filter((e) => e.kind === "owl"))
      expect(owl.wait).toBeGreaterThan(Math.max(...wave1Waits));
  });

  test("each wave flies in as pairs: equal waits, two different paths", () => {
    for (const w of entryWaves) {
      const waits = new Set<number>();
      for (const [a, b] of w.pairs) {
        const ea = at(a.row, a.col);
        const eb = at(b.row, b.col);
        expect(ea?.wait).toBe(eb?.wait ?? -1);
        const pa = ea?.path?.[0]?.p0 ?? { x: 0, y: 0 };
        const pb = eb?.path?.[0]?.p0 ?? { x: 0, y: 0 };
        if (w.split) expect(pb.x).toBe(fieldWidth - pa.x);
        else expect(Math.hypot(pb.x - pa.x, pb.y - pa.y)).toBeCloseTo(entryPairOffset);
        waits.add(ea?.wait ?? -1);
      }
      expect(waits.size).toBe(4);
    }
  });
});

/** Puts the Owl hovering at x with its beam on, just switched on. */
function beamingAt(e: Enemy, x: number): void {
  e.state = "beaming";
  e.outOfFormation = true;
  e.x = x;
  e.y = beamY;
  e.path = null;
  e.beamTicks = beamTicks;
}

describe("tractor beam", () => {
  test("an Owl dive is sometimes a beam dive: it stops low over the firefly and beams", () => {
    const { f, e } = withOnly("owl", { x: 100, y: 40 });
    e.state = "formation";
    e.home = { x: 100, y: 40 };
    rng.seed(4);
    const seen = new Set<string>();
    for (let t = 0; t < 4000 && !seen.has("beaming"); t++) {
      f.update(NO_INPUT);
      seen.add(e.state);
      if (f.respawn > 0) break;
    }
    expect(seen.has("beaming")).toBe(true);
    expect(e.y).toBe(beamY);
  });

  test("a beaming Owl over the firefly captures it: a life gone, no burst, the capture sound", () => {
    const { f, e } = withOnly("owl", { x: 30, y: 40 });
    beamingAt(e, 112 + beamWidth / 2 - 1);
    const rec = recordSounds();
    f.update(NO_INPUT);
    rec.stop();
    expect(f.captured).toBe(true);
    expect([f.lives, f.respawn]).toEqual([startLives - 1, respawnTicks - 1]);
    expect(rec.events).toContain("play:capture");
    expect(rec.events).not.toContain("play:lifeLost");
    expect(e.hp).toBe(enemyHp.owl);
  });

  test("a firefly outside the beam is not captured", () => {
    const { f, e } = withOnly("owl", { x: 30, y: 40 });
    beamingAt(e, 112 + beamWidth / 2 + 1);
    run(f, 10);
    expect([f.captured, f.lives]).toEqual([false, startLives]);
  });

  test("the beam plays its sound and ends after beamTicks, and the Owl flies home", () => {
    const { f, e } = withOnly("owl", { x: 30, y: 40 });
    f.player.x = 20;
    e.home = { x: 100, y: 40 };
    const rec = recordSounds();
    beamingAt(e, 180);
    run(f, beamTicks - 1);
    expect(e.state).toBe("beaming");
    f.update(NO_INPUT);
    rec.stop();
    expect(rec.events).toContain("play:beam");
    expect(e.state).toBe("joining");
  });

  test("the captive is pulled up to its Owl, then follows it in formation and in a dive", () => {
    const { f, e } = withOnly("owl", { x: 30, y: 40 });
    e.home = { x: 100, y: 40 };
    beamingAt(e, 112);
    f.update(NO_INPUT);
    const captive = f.captive;
    expect(captive?.y).toBeGreaterThan(beamY);
    for (let t = 0; t < 400 && e.state !== "formation"; t++) f.update(NO_INPUT);
    expect(e.state).toBe("formation");
    expect(f.captive).toEqual({ owl: e, x: e.x, y: e.y - 16 });
    divingAt(e, 60, 150);
    e.hp = 2;
    run(f, 5);
    expect(f.captive).toEqual({ owl: e, x: e.x, y: e.y - 16 });
  });

  test("an Owl holding a captive does not beam again", () => {
    const { f, e } = withOnly("owl", { x: 30, y: 40 });
    beamingAt(e, 112);
    f.update(NO_INPUT);
    run(f, respawnTicks);
    beamingAt(e, 112);
    run(f, 5);
    expect(f.lives).toBe(startLives - 1);
  });

  test("a capture on the last life ends the run after respawnTicks", () => {
    const { f, e } = withOnly("owl", { x: 30, y: 40 });
    f.lives = 1;
    beamingAt(e, 112);
    f.update(NO_INPUT);
    expect(f.lives).toBe(0);
    run(f, respawnTicks - 2);
    expect(f.gameOver()).toBe(false);
    f.update(NO_INPUT);
    expect(f.gameOver()).toBe(true);
  });
});

/** A settled software whose only enemy is one `kind`, about to dive; returns its path, tick by tick, until it is back in formation. */
function diveTrack(kind: EnemyKind): { start: Vec; home: Vec; track: Vec[]; back: boolean } {
  rng.seed(5);
  const f = settled();
  const e = f.enemies.find((c) => c.kind === kind);
  if (e === undefined) throw new Error(`no ${kind}`);
  f.enemies = [e];
  f.player.x = 40;
  f.update(NO_INPUT);
  if (e.state !== "diving") throw new Error(`the ${kind} did not dive`);
  f.diveTimer = 1_000_000;
  const start = { x: e.x, y: e.y };
  const state = (): string => e.state;
  const track: Vec[] = [];
  for (let t = 0; t < 1000 && state() !== "formation"; t++) {
    f.update(NO_INPUT);
    if (state() === "diving") track.push({ x: e.x, y: e.y });
  }
  return { start, home: e.home, track, back: state() === "formation" };
}

describe("dive shapes", () => {
  test("a Moth loops above its slot first, then sweeps off the bottom", () => {
    const { start, track, back } = diveTrack("moth");
    const lowest = track.reduce((i, p, n) => (p.y > (track[i]?.y ?? 0) ? n : i), 0);
    expect(track.slice(0, lowest).some((p) => p.y < start.y - 16)).toBe(true);
    expect(track.at(-1)?.y).toBeGreaterThan(fieldHeight);
    expect(back).toBe(true);
  });

  test("a Wasp swoops down and curves back up to its slot without leaving the field", () => {
    const { start, track, back } = diveTrack("wasp");
    expect(Math.max(...track.map((p) => p.y))).toBeGreaterThan(playerY - 60);
    expect(track.every((p) => p.y <= fieldHeight)).toBe(true);
    const last = track.at(-1);
    expect(Math.hypot((last?.x ?? 0) - start.x, (last?.y ?? 0) - start.y)).toBeLessThan(4);
    expect(back).toBe(true);
  });
});

describe("hit sounds", () => {
  for (const [kind, sound] of [
    ["moth", "mothHit"],
    ["wasp", "waspHit"],
  ] as const) {
    test(`killing a ${kind} plays ${sound}`, () => {
      const { f, e } = withOnly(kind, { x: 100, y: 120 });
      sparkAt(f, e.x, e.y);
      const rec = recordSounds();
      f.update(NO_INPUT);
      rec.stop();
      expect(e.hp).toBe(0);
      expect(rec.events).toEqual([`rewind:${sound}`, `play:${sound}`]);
    });
  }

  test("an Owl's first spark plays owlHurt and its second plays owlKill", () => {
    const { f, e } = withOnly("owl", { x: 100, y: 120 });
    expect(e.hp).toBe(enemyHp.owl);
    const rec = recordSounds();
    sparkAt(f, e.x, e.y);
    f.update(NO_INPUT);
    expect(e.hp).toBe(1);
    sparkAt(f, e.x, e.y);
    f.update(NO_INPUT);
    rec.stop();
    expect(e.hp).toBe(0);
    expect(rec.events).toEqual(["rewind:owlHurt", "play:owlHurt", "rewind:owlKill", "play:owlKill"]);
  });
});

describe("dive sound", () => {
  test("starting a dive plays the dive swoop once", () => {
    const f = new FireflySoftware();
    const e = f.enemies.find((en) => en.kind === "moth");
    if (e === undefined) throw new Error("no moth");
    const rec = recordSounds();
    f.dive(e);
    rec.stop();
    expect(rec.events).toEqual(["rewind:dive", "play:dive"]);
  });
});
