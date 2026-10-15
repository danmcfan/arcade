// Cruise Elroy (#156) in a real browser (`bun run verify sweet-sam-elroy`).
// The bot plays level 1 headless until 9 drops are left, noting the ticks
// where red flies in the open (awake, out of the home and the tunnel). The
// run is replayed through the `?debug` test hook: with 21 drops left red
// flies at the level's bee speed, with 20 left faster (Elroy 1), with 10 left
// faster again (Elroy 2). Writes a frame at each stop and a video of the last
// 25 drops to out/verify/sweet-sam-elroy/.

import type { InputScript } from "../../src/game/script.ts";
import type { SweetSamSnapshot } from "../../src/game/snapshot.ts";
import { velocityEnemyPower, velocityEnemyTunnel, type Entity } from "../../src/sweet-sam/entity.ts";
import type { SweetSamSoftware } from "../../src/sweet-sam/software.ts";
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

const left = (s: SweetSamSoftware): number => s.items.filter((i) => i !== null).length;
/** Awake, out of the home and out of the tunnel, so the bee flies at its own speed. */
const open = (e: Entity | undefined): boolean =>
  e !== undefined && !e.home && e.velocity !== velocityEnemyPower && e.velocity !== velocityEnemyTunnel;

/** The first tick with each number of drops left at which red and pink both fly in the open. */
const at = new Map<number, number>();
let seed = 0;
let inputs: InputScript["steps"] = [];
for (seed = 1; seed < 50 && !(at.has(21) && at.has(20) && at.has(10)); seed++) {
  at.clear();
  let ticks = 1;
  let before = -1;
  const run = play(seed, 1, (s) => {
    ticks++;
    if (s.level > 1 || s.lives < 3) return true;
    const red = s.enemies.find((e) => e.kind === "red");
    // A tick sets the speeds from the drops left before it.
    const n = before;
    before = left(s);
    if (s.stateMachine.currentId() === "PLAY" && !at.has(n) && open(red)) at.set(n, ticks);
    return before < 9;
  });
  inputs = compress(run.inputs);
}
seed--;
const script: InputScript = {
  name: "sweet-sam-elroy",
  scene: "game",
  software: "sweetSam",
  seed,
  captureTicks: [],
  steps: [{ ticks: 1, input: {} }, ...inputs],
};

await verify("sweet-sam-elroy", (v) => {
  v.openHook("scene=game");
  v.dismissNotice();
  loadFixture(v, script);
  console.log(`bot seed ${seed}`);

  let from = 0;
  const stops: [number, string, number][] = [
    [21, "red flies at the bees' speed", 0.9375],
    [20, "Elroy 1: red flies faster", 0.96875],
    [10, "Elroy 2: red flies faster again", 1],
  ];
  for (const [n, what, speed] of stops) {
    const tick = at.get(n) ?? 0;
    skipTo(v, script, from, tick);
    from = tick;
    const s = sweetSam(v);
    const red = s.enemies.find((e) => e.kind === "red")?.velocity ?? 0;
    check(s.items <= n, `tick ${tick}: ${n} drops left as it starts`, s.items);
    check(red === speed, `${what}: ${speed} px/tick`, red);
    v.frame(`${n}-drops-left`, 2);
  }

  v.record(
    "last-drops",
    () => {
      v.dismissNotice();
      loadFixture(v, script);
      const start = Math.max(0, (at.get(25) ?? at.get(21) ?? 0) - 1);
      skipTo(v, script, 0, start);
      replayLive(
        v,
        script,
        start,
        Math.min(
          from + 60,
          script.steps.reduce((n, st) => n + st.ticks, 0),
        ),
      );
      v.wait(500);
    },
    { scene: "game" },
  );
  v.assertNoErrors();
});
