// The no-up junctions (#158) in a real browser (`bun run verify sweet-sam-no-up`).
// The bot plays headless, noting the ticks where an awake bee is in one of the
// four no-up tiles with its target above it, so UP would be its closest exit.
// The run is replayed through the `?debug` test hook: at each such tick the
// bee flies left or right, never up. A sleepy bee seen turning up at one of
// the tiles shows the rule leaves sleepy bees alone. Writes a frame at each
// stop and a video of the first one to out/verify/sweet-sam-no-up/.

import type { InputScript } from "../../src/game/script.ts";
import type { SweetSamSnapshot } from "../../src/game/snapshot.ts";
import { distance, noUpTiles, pointToTile, tileEq, type Tile } from "../../src/sweet-sam/entity.ts";
import { elroyStep } from "../../src/sweet-sam/release.ts";
import { findTarget } from "../../src/sweet-sam/update.ts";
import { loadFixture, replayLive, skipTo } from "../fixture-replay.ts";
import { isGameSnapshot, verify, type Verify } from "../harness.ts";
import { compress, play } from "../sweet-sam-bot.ts";

function check(ok: boolean, what: string, got?: unknown): void {
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

function sweetSam(v: Verify): SweetSamSnapshot {
  const g = v.snapshot(isGameSnapshot);
  if (g.software !== "sweetSam" || g.sw === null || !("modeTicks" in g.sw)) throw new Error("not in Sweet Sam");
  return g.sw;
}

const noUp = (t: Tile): Tile | undefined => noUpTiles.find((n) => tileEq(n, t));

interface Stop {
  tick: number;
  bee: number;
  tile: Tile;
}

/** The first tick an awake bee wants UP at each no-up tile, and one sleepy bee going up from one. */
const awake: Stop[] = [];
let sleepy: Stop | undefined;
const seed = 11;
let tick = 0;
const run = play(seed, 1, (s) => {
  tick++; // the script tick this state follows (tick 1 is the hub tick)
  if (s.stateMachine.currentId() !== "PLAY") return false;
  const elroy = elroyStep(s.release, s.values(), s.items.filter((it) => it !== null).length) !== null;
  s.enemies.forEach((e, bee) => {
    const tile = noUp(pointToTile(e.x, e.y));
    if (tile === undefined || e.home) return;
    if (e.blueFrames > 0) {
      if (e.direction === "UP" && sleepy === undefined) sleepy = { tick, bee, tile };
      return;
    }
    if (awake.some((st) => tileEq(st.tile, tile))) return;
    const target = findTarget(e, s.enemies, s.player, s.modeCurrent, elroy);
    const up = distance({ x: tile.x, y: tile.y - 1 }, target);
    const side = Math.min(
      distance({ x: tile.x - 1, y: tile.y }, target),
      distance({ x: tile.x + 1, y: tile.y }, target),
    );
    if (up < side) awake.push({ tick, bee, tile });
  });
  return (awake.length >= 4 && sleepy !== undefined) || s.level > 1;
});
const script: InputScript = {
  name: "sweet-sam-no-up",
  scene: "game",
  software: "sweetSam",
  seed,
  captureTicks: [],
  steps: [{ ticks: 1, input: {} }, ...compress(run.inputs)],
};
awake.sort((a, b) => a.tick - b.tick);

await verify("sweet-sam-no-up", (v) => {
  v.openHook("scene=game");
  v.dismissNotice();
  loadFixture(v, script);
  console.log(`bot seed ${seed}, ${run.ticks} ticks`);
  check(awake.length > 0, "an awake bee reached a no-up junction wanting UP", awake);

  let from = 0;
  for (const st of awake) {
    skipTo(v, script, from, st.tick);
    from = st.tick;
    const e = sweetSam(v).enemies[st.bee];
    check(
      e !== undefined && e.blue === 0 && e.dir !== "UP",
      `tick ${st.tick}: the ${e?.kind} bee at (${st.tile.x}, ${st.tile.y - 3}) wants UP but flies ${e?.dir}`,
      e,
    );
    v.frame(`${st.tick}-${e?.kind}-at-${st.tile.x}-${st.tile.y - 3}`, 2);
  }
  if (sleepy === undefined) throw new Error("FAILED: no sleepy bee turned up at a no-up junction in this run");
  const st = sleepy;
  if (st.tick < from) loadFixture(v, script);
  skipTo(v, script, st.tick < from ? 0 : from, st.tick);
  const e = sweetSam(v).enemies[st.bee];
  check(
    e !== undefined && e.blue > 0 && e.dir === "UP",
    `tick ${st.tick}: a sleepy ${e?.kind} bee turns UP at (${st.tile.x}, ${st.tile.y - 3})`,
    e,
  );
  v.frame(`${st.tick}-sleepy-${e?.kind}-up`, 2);

  const first = awake[0];
  if (first !== undefined) {
    v.record(
      "awake-bee-turns-aside",
      () => {
        v.dismissNotice();
        loadFixture(v, script);
        const start = Math.max(0, first.tick - 90);
        skipTo(v, script, 0, start);
        replayLive(v, script, start, first.tick + 60);
        v.wait(500);
      },
      { scene: "game" },
    );
  }
  v.assertNoErrors();
});
