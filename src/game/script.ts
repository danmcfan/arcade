// Scripted input: steps of held keys, expanded to one `Input` per tick.

import { NO_INPUT, type Input } from "../engine/input.ts";

export interface InputStep {
  /** How many consecutive ticks this input is applied for (≥ 1). */
  ticks: number;
  /**
   * Keys held during the step; missing keys are false. `shiftP` means "just
   * pressed" on the step's first tick only.
   */
  input: Partial<Input>;
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
