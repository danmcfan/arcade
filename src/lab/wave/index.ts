// Entry module for the wave lab scene (T7 owns src/lab/**). Replace the stub
// body; keep the export name and signature, which src/game/registry.ts imports.

import type { Scene, WaveOptions } from "../../game/software.ts";

/**
 * Go `wave.New()` with the package globals turned into instance fields;
 * `name` is "wave".
 *
 * `opts` are the **pending** slider values (Go globals `gridSize`, `seconds`;
 * missing fields default to 128 and 5). `activeGridSize`/`activeSeconds` start
 * at their package-init defaults (128 and 5) regardless of `opts`, and the
 * first grid is `gridSize × gridSize` because `New()` reads `gridSize` (§4.2).
 * A rising edge of Space copies pending → active, rebuilds the grid and runs
 * no `Step` that tick. `snapshot({ full: true })` adds `cells`.
 */
export function createWave(opts?: Partial<WaveOptions>): Scene {
  throw new Error(`TODO: createWave(${JSON.stringify(opts)})`);
}
