// Port of the Go Sweet Sam minigame's particle.go (docs/port-notes.md gives its old Go name).

import * as rng from "../engine/rng.ts";
import type { PremulColor, Surface } from "../engine/surface.ts";
import { framesPerSecond } from "./constants.ts";

export const maxParticles = 300;

export const particleSize = 3;
export const particleBurstBeeEatenCount = 25;
export const particleBurstPlayerEatenCount = 25;

/** #72dcbb — burst when the player eats a bee. */
export const particleColorTeal: Readonly<PremulColor> = { r: 0x72, g: 0xdc, b: 0xbb, a: 255 };
/** #ee6a7c — burst when a bee eats the player. */
export const particleColorRed: Readonly<PremulColor> = { r: 0xee, g: 0x6a, b: 0x7c, a: 255 };

export class Particle {
  x = 0;
  y = 0;
  /** Pixels per tick. */
  vx = 0;
  vy = 0;
  color: Readonly<PremulColor> = { r: 0, g: 0, b: 0, a: 0 };
  lifeTicks = 0;
  maxLifeTicks = 0;
  active = false;
}

/**
 * Recycles a fixed pool of particles. Go's 3×3 white `pixel` image is drawn
 * with `Surface.fillPremul` instead (D15), so nothing is created here.
 */
export class ParticleSystem {
  readonly pool: Particle[] = Array.from({ length: maxParticles }, () => new Particle());

  /** Creates a cluster of particles at the given playfield coordinates. */
  spawnBurst(x: number, y: number, col: Readonly<PremulColor>, count: number): void {
    if (count <= 0) {
      return;
    }

    let spawned = 0;
    for (const p of this.pool) {
      if (p.active) {
        continue;
      }

      const angle = rng.float() * 2 * Math.PI;
      const speed = (50.0 + rng.float() * 100.0) / framesPerSecond;

      p.x = x;
      p.y = y;
      // Math.cos/sin may differ from Go's in the last ulp (fact 3); positions are draw-only.
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.color = col;
      p.maxLifeTicks = 18 + Math.trunc(rng.float() * 24); // ~0.3–0.7s at 60 ticks/s
      p.lifeTicks = p.maxLifeTicks;
      p.active = true;

      spawned++;
      if (spawned >= count) {
        break;
      }
    }
  }

  /** Advances physics for all active particles. Call once per game tick. */
  update(): void {
    for (const p of this.pool) {
      if (!p.active) {
        continue;
      }

      p.lifeTicks--;
      if (p.lifeTicks <= 0) {
        p.active = false;
        continue;
      }

      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95;
      p.vy *= 0.95;
    }
  }

  /** Snapshot helper (`particlesActive`): count of active pool entries. */
  activeCount(): number {
    let n = 0;
    for (const p of this.pool) {
      if (p.active) n++;
    }
    return n;
  }

  /** Renders active particles using bufX/bufY so they move with camera shake. */
  draw(screen: Surface, bufX: number, bufY: number): void {
    const half = particleSize / 2;
    for (const p of this.pool) {
      if (!p.active) {
        continue;
      }

      const alpha = p.lifeTicks / p.maxLifeTicks;
      // A white pixel scaled by a premultiplied RGBA is exactly a premultiplied fill (D15).
      screen.fillPremul(p.x - half + bufX, p.y - half + bufY, particleSize, particleSize, {
        r: p.color.r,
        g: p.color.g,
        b: p.color.b,
        a: Math.trunc(alpha * 255), // Go uint8(alpha * 255)
      });
    }
  }
}
