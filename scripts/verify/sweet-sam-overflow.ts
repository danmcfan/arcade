// Pac-Man's up-overflow bug (#159) in a real browser (`bun run verify sweet-sam-overflow`).
// The bot plays headless, noting the first tick the pink and the teal bee each
// turn while chasing a bear that faces up, where the turn heads for the shifted
// target (up and left) but the unshifted one (straight up) would not have
// favoured it. The run is replayed through the `?debug` test hook: at each such
// tick the live bee flies the same way. Writes a frame at each stop and a video
// of the first one to out/verify/sweet-sam-overflow/.

import type { InputScript } from "../../src/game/script.ts";
import type { SweetSamSnapshot } from "../../src/game/snapshot.ts";
import { distance, pointToTile } from "../../src/sweet-sam/entity.ts";
import { modeChase } from "../../src/sweet-sam/levels.ts";
import { findTarget } from "../../src/sweet-sam/update.ts";
import type { Direction } from "../../src/engine/input.ts";
import { loadFixture, replayLive, skipTo } from "../fixture-replay.ts";
import { check, isGameSnapshot, verify, type Verify } from "../harness.ts";
import { compress, stepFrom, play } from "../sweet-sam-bot.ts";

function sweetSam(v: Verify): SweetSamSnapshot {
  const g = v.snapshot(isGameSnapshot);
  if (g.software !== "sweetSam" || g.sw === null || !("modeTicks" in g.sw)) throw new Error("not in Sweet Sam");
  return g.sw;
}

/** The up overflow moves pink's target this many tiles left (teal's pivot 2, so its target 4). */
const overflowShift = 4;

interface Stop {
  tick: number;
  bee: number;
  dir: Direction;
  x: number;
  y: number;
}

/** The first overflow-led turn for pink (1) and teal (2). */
const stops = new Map<number, Stop>();
const prev = new Map<number, Direction>();
const seed = 4;
let tick = 0;
const run = play(seed, 1, (s) => {
  tick++; // the script tick this state follows (tick 1 is the hub tick)
  if (s.stateMachine.currentId() !== "PLAY") return false;
  for (const bee of [1, 2]) {
    const e = s.enemies[bee];
    if (e === undefined) continue;
    const dir = e.direction;
    if (dir === "") continue;
    const was = prev.get(bee);
    prev.set(bee, dir);
    if (stops.has(bee) || e.home || e.blueFrames > 0 || s.modeCurrent !== modeChase) continue;
    if (s.player.direction !== "UP" || was === undefined || was === dir) continue;
    const target = findTarget(e, s.enemies, s.player, s.modeCurrent);
    // Undo the left shift.
    const unshifted = { x: target.x + overflowShift, y: target.y };
    const tile = pointToTile(e.x, e.y);
    const now = stepFrom(tile, dir);
    const straight = stepFrom(tile, was);
    if (
      distance(now, target) < distance(straight, target) &&
      distance(now, unshifted) > distance(straight, unshifted)
    ) {
      stops.set(bee, { tick, bee, dir: dir, x: e.x, y: e.y });
    }
  }
  return stops.size >= 2;
});
const script: InputScript = {
  name: "sweet-sam-overflow",
  scene: "game",
  software: "sweetSam",
  seed,
  captureTicks: [],
  steps: [{ ticks: 1, input: {} }, ...compress(run.inputs)],
};
const sorted = [...stops.values()].toSorted((a, b) => a.tick - b.tick);

await verify("sweet-sam-overflow", (v) => {
  v.openHook("scene=game");
  v.dismissNotice();
  loadFixture(v, script);
  console.log(`bot seed ${seed}, ${run.ticks} ticks`);
  check(sorted.length === 2, "the pink and the teal bee each turned toward the up-and-left target", sorted);

  let from = 0;
  for (const st of sorted) {
    skipTo(v, script, from, st.tick);
    from = st.tick;
    const g = sweetSam(v);
    const e = g.enemies[st.bee];
    check(g.player.dir === "UP", `tick ${st.tick}: the bear faces UP`, g.player);
    check(
      e !== undefined && e.dir === st.dir && e.x === st.x && e.y === st.y,
      `tick ${st.tick}: the ${e?.kind} bee turns ${st.dir}, toward the target shifted left`,
      e,
    );
    v.frame(`${st.tick}-${e?.kind}-turns-${st.dir}`, 2);
  }

  const first = sorted[0];
  if (first !== undefined) {
    v.record(
      "bee-turns-toward-overflow-target",
      () => {
        v.dismissNotice();
        loadFixture(v, script);
        const start = Math.max(0, first.tick - 90);
        skipTo(v, script, 0, start);
        replayLive(v, script, start, Math.min(first.tick + 60, run.ticks + 1));
        v.wait(500);
      },
      { scene: "game" },
    );
  }
  v.assertNoErrors();
});
