// Replaying a parity fixture's input script in the browser through the
// `?debug` test hook, for verify checks: load the scene, jump to a tick, or
// replay a stretch at about game speed for a video.

import type { InputScript, InputStep } from "../src/game/script.ts";
import { planCaptures } from "./capture-frames.ts";
import type { Verify } from "./harness.ts";

/** Paused, seeded and loaded as `script` starts. */
export function loadFixture(v: Verify, script: InputScript): void {
  const opts = script.software === undefined ? {} : { software: script.software };
  v.page.eval(
    `(() => { const a = window.__arcade; a.pause(); a.seed(${script.seed}); a.load(${JSON.stringify(script.scene)}, ${JSON.stringify(opts)}); return "ok"; })()`,
  );
}

export function runSteps(v: Verify, script: InputScript, steps: InputStep[]): void {
  const chunk: InputScript = { ...script, steps, captureTicks: [] };
  v.page.eval(`window.__arcade.runScript(${JSON.stringify(chunk)}); "ok"`);
}

/** The script's steps from tick `from` (already run) to `to`. */
function stepsBetween(script: InputScript, from: number, to: number): InputStep[] {
  if (from === 0) return planCaptures({ ...script, captureTicks: [to] })[0]?.steps ?? [];
  return planCaptures({ ...script, captureTicks: [from, to] })[1]?.steps ?? [];
}

/** Jump from tick `from` to `to` (no video time spent). */
export function skipTo(v: Verify, script: InputScript, from: number, to: number): void {
  runSteps(v, script, stepsBetween(script, from, to));
}

/** Replay ticks `from`..`to` a few at a time, so a video runs at about game speed. */
export function replayLive(v: Verify, script: InputScript, from: number, to: number): void {
  // Re-chunk into 6-tick pieces, each followed by its 100 ms of wall-clock.
  let pending: InputStep[] = [];
  let ticks = 0;
  const flush = (): void => {
    if (pending.length === 0) return;
    runSteps(v, script, pending);
    v.wait(ticks * 16);
    pending = [];
    ticks = 0;
  };
  for (const step of stepsBetween(script, from, to)) {
    let left = step.ticks;
    while (left > 0) {
      const n = Math.min(left, 6 - ticks);
      pending.push({ ...step, ticks: n });
      ticks += n;
      left -= n;
      if (ticks === 6) flush();
    }
  }
  flush();
}
