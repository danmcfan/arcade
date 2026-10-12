// camera.ts, particle.ts, bonusEat.ts, cabinet.ts
import { describe, expect, test } from "bun:test";
import * as rng from "../engine/rng.ts";
import { NO_INPUT } from "../engine/input.ts";
import { CameraSystem } from "./camera.ts";
import { maxParticles, ParticleSystem, particleColorRed, particleColorTeal } from "./particle.ts";
import { bonusEatFrameRect, bonusEatIndicatorTicks, scaredBeeEatPoints } from "./bonusEat.ts";
import { cabinetJoystickFrame } from "./cabinet.ts";

describe("CameraSystem", () => {
  test("idle: zero offsets and no random draws", () => {
    rng.seed(5);
    const c = new CameraSystem();
    c.update();
    expect(c.cameraOffset()).toEqual([0, 0]);
    expect(rng.state()).toBe(5);
  });

  test("a shake lasts durationTicks updates, two random draws each, then resets", () => {
    rng.seed(9);
    const r = [rng.float(), rng.float()];
    rng.seed(9);
    const c = new CameraSystem();
    c.requestScreenShake(2, 4.0);
    c.update();
    expect(c.cameraOffset()).toEqual([((r[0] ?? 0) * 2.0 - 1.0) * 4.0, ((r[1] ?? 0) * 2.0 - 1.0) * 4.0]);
    expect(c.shakeTicksRemaining).toBe(1);
    c.update();
    expect(c.shakeTicksRemaining).toBe(0);
    expect(c.shakeIntensity).toBe(4);
    const before = rng.state();
    c.update();
    expect([c.shakeOffsetX, c.shakeOffsetY, c.shakeTicksRemaining, c.shakeIntensity]).toEqual([0, 0, 0, 0]);
    expect(rng.state()).toBe(before);
  });

  test("a new request replaces the running shake; non-positive durations are ignored", () => {
    const c = new CameraSystem();
    c.requestScreenShake(6, 4.0);
    c.requestScreenShake(9, 8.0);
    expect([c.shakeTicksRemaining, c.shakeIntensity]).toEqual([9, 8]);
    c.requestScreenShake(0, 1.0);
    expect([c.shakeTicksRemaining, c.shakeIntensity]).toEqual([9, 8]);
  });
});

describe("ParticleSystem", () => {
  test("colors are #72dcbb and #ee6a7c, opaque", () => {
    expect(particleColorTeal).toEqual({ r: 0x72, g: 0xdc, b: 0xbb, a: 255 });
    expect(particleColorRed).toEqual({ r: 0xee, g: 0x6a, b: 0x7c, a: 255 });
  });

  test("a burst fills the first free slots, three random draws per particle", () => {
    rng.seed(3);
    const ps = new ParticleSystem();
    ps.spawnBurst(10, 20, particleColorTeal, 25);
    expect(ps.activeCount()).toBe(25);
    rng.seed(3);
    for (let i = 0; i < 25 * 3; i++) rng.float();
    const expected = rng.state();
    rng.seed(3);
    new ParticleSystem().spawnBurst(10, 20, particleColorTeal, 25);
    expect(rng.state()).toBe(expected);
  });

  test("MaxLifeTicks = 18 + trunc(r*24), r being the third draw", () => {
    rng.seed(11);
    rng.float();
    rng.float();
    const r = rng.float();
    rng.seed(11);
    const ps = new ParticleSystem();
    ps.spawnBurst(0, 0, particleColorRed, 1);
    const p = ps.pool[0];
    expect(p?.maxLifeTicks).toBe(18 + Math.trunc(r * 24));
    expect(p?.lifeTicks).toBe(p?.maxLifeTicks);
    expect(p?.active).toBe(true);
    expect(ps.pool[1]?.active).toBe(false);
  });

  test("update: life ticks down first, then position moves and velocity decays", () => {
    rng.seed(1);
    const ps = new ParticleSystem();
    ps.spawnBurst(50, 60, particleColorRed, 1);
    const p = ps.pool[0];
    if (p === undefined) throw new Error("missing particle");
    const [vx, vy, life] = [p.vx, p.vy, p.lifeTicks];
    ps.update();
    expect([p.x, p.y, p.vx, p.vy, p.lifeTicks]).toEqual([50 + vx, 60 + vy, vx * 0.95, vy * 0.95, life - 1]);
    for (let i = 1; i < life; i++) ps.update();
    expect(p.active).toBe(false);
    expect(ps.activeCount()).toBe(0);
  });

  test("a full pool spawns nothing more", () => {
    rng.seed(2);
    const ps = new ParticleSystem();
    for (let i = 0; i < 12; i++) ps.spawnBurst(0, 0, particleColorRed, 25);
    expect(ps.activeCount()).toBe(maxParticles);
    const before = rng.state();
    ps.spawnBurst(0, 0, particleColorRed, 25);
    expect(rng.state()).toBe(before);
  });
});

describe("bonus eat", () => {
  test("TTL is int(0.75*60) = 45 ticks and the ladder is 200/400/800/1600", () => {
    expect(bonusEatIndicatorTicks).toBe(45);
    expect(scaredBeeEatPoints).toEqual([200, 400, 800, 1600]);
  });

  test("frame rects are 16px columns, clamped to 0..3", () => {
    expect(bonusEatFrameRect(-1)).toEqual([0, 0, 16, 16]);
    expect(bonusEatFrameRect(2)).toEqual([32, 0, 48, 16]);
    expect(bonusEatFrameRect(9)).toEqual([48, 0, 64, 16]);
  });
});

describe("cabinetJoystickFrame", () => {
  test("neutral 0, then up 1, down 2, left 3, right 4 by input priority", () => {
    expect(cabinetJoystickFrame(NO_INPUT)).toBe(0);
    expect(cabinetJoystickFrame({ ...NO_INPUT, up: true, left: true })).toBe(1);
    expect(cabinetJoystickFrame({ ...NO_INPUT, down: true, right: true })).toBe(2);
    expect(cabinetJoystickFrame({ ...NO_INPUT, left: true, right: true })).toBe(3);
    expect(cabinetJoystickFrame({ ...NO_INPUT, right: true })).toBe(4);
    expect(cabinetJoystickFrame({ ...NO_INPUT, space: true })).toBe(0);
  });
});
