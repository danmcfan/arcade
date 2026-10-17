// What the Level (level.ts) emits to the world around it (#271).

import type { SoundName } from "../engine/sounds.generated.ts";
import type { PremulColor } from "../engine/surface.ts";

/**
 * What the Level asks of the world around it, in the order it happens: a
 * sound, a screen shake, a burst of particles. The software wires them up;
 * the Level itself stays headless.
 */
export type LevelEffect =
  | { kind: "sound"; sound: SoundName }
  | { kind: "shake"; ticks: number; intensity: number }
  | { kind: "burst"; x: number; y: number; color: Readonly<PremulColor>; count: number };
