// Input script format (§4.2), shared by the Go golden harness, the parity
// harness (test/parity/harness.ts) and the test hook (`__arcade.runScript`).
// Files live in test/fixtures/inputs/<name>.json.

import { NO_INPUT, type Input } from "../engine/input.ts";
import type { SceneName, SoftwareName, WaveOptions } from "./software.ts";

export interface InputStep {
  /** How many consecutive ticks this input is applied for (≥ 1). */
  ticks: number;
  /**
   * Keys held during the step; missing keys are false. `shiftP` means "just
   * pressed" on the step's first tick only.
   */
  input: Partial<Input>;
}

export interface InputScript {
  name: string;
  scene: SceneName;
  /**
   * `scene: "game"` only: start as `game.New(<software>)`; omit to start in
   * the hub. Tick 1 is still a hub tick (§4.2).
   */
  software?: SoftwareName;
  /** `rng.seed(seed)` before the scene is constructed. */
  seed: number;
  steps: InputStep[];
  /** Ticks (1-based, after that tick's update) at which golden frames are captured. */
  captureTicks: number[];
  /** `scene: "wave"` only: pending slider values (defaults 128 and 5). */
  wave?: WaveOptions;
}

/** Expand steps into one `Input` per tick (index 0 = tick 1). */
export function expandSteps(steps: readonly InputStep[]): Input[] {
  const out: Input[] = [];
  for (const step of steps) {
    for (let t = 0; t < step.ticks; t++) {
      const input: Input = { ...NO_INPUT, ...step.input };
      if (t > 0) input.shiftP = false;
      out.push(input);
    }
  }
  return out;
}
