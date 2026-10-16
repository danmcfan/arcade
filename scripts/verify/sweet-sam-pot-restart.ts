// A second honey pot restarts the sleepy bee award at 200 (#224), in a real
// browser (`bun run verify sweet-sam-pot-restart`). Headless, the bot plays
// until it eats a honey pot while bees are still sleepy and the award has
// already climbed past 200, then eats a bee. The check replays its inputs
// through the `?debug` test hook: just before the pot the award is past 200,
// and the next bee scores 200 with the 200 popup. Writes frames either side
// and a video to out/verify/sweet-sam-pot-restart/.

import type { InputScript } from "../../src/game/script.ts";
import type { SweetSamSnapshot } from "../../src/game/snapshot.ts";
import { anyBeeInScaredMode } from "../../src/sweet-sam/bonusEat.ts";
import { loadFixture, replayLive, skipTo } from "../fixture-replay.ts";
import { check, isGameSnapshot, verify, type Verify } from "../harness.ts";
import { compress, play } from "../sweet-sam-bot.ts";

function sweetSam(v: Verify): SweetSamSnapshot {
  const g = v.snapshot(isGameSnapshot);
  if (g.software !== "sweetSam" || g.sw === null || !("modeTicks" in g.sw)) throw new Error("not in Sweet Sam");
  return g.sw;
}

const seed = 1;
const afterTicks = 90;
// Script ticks: tick 1 is a hub tick, then one bot input per tick.
let ticks = 1;
let potTick = 0;
let eatTick = 0;
let pots = -1;
let sleepyChain = false;
let score = 0;
const run = play(seed, 1, (s) => {
  ticks++;
  const left = s.items.filter((i) => i?.powerPellet === true).length;
  if (potTick === 0 && pots >= 0 && left < pots && sleepyChain) potTick = ticks - 1;
  if (potTick > 0 && eatTick === 0 && s.stateMachine.currentId() === "PAUSE" && s.scoreValue - score >= 200) {
    eatTick = ticks - 1;
  }
  pots = left;
  sleepyChain = anyBeeInScaredMode(s) && s.scaredEatAwardNext > 0;
  score = s.scoreValue;
  return (eatTick > 0 && ticks - eatTick > afterTicks) || ticks > 20_000;
});
if (eatTick === 0) throw new Error(`seed ${seed}: the bot never ate a pot mid-chain and then a bee`);
const script: InputScript = {
  name: "sweet-sam-pot-restart",
  scene: "game",
  software: "sweetSam",
  seed,
  captureTicks: [],
  steps: [{ ticks: 1, input: {} }, ...compress(run.inputs)],
};
const end = run.ticks + 1;

await verify("sweet-sam-pot-restart", (v) => {
  v.openHook("scene=game");
  v.dismissNotice();
  loadFixture(v, script);

  skipTo(v, script, 0, potTick - 1);
  const before = sweetSam(v);
  check(
    before.scaredEatAwardNext > 0,
    `tick ${potTick - 1}: the award has climbed past 200`,
    before.scaredEatAwardNext,
  );
  v.frame("1-before-pot", 2);

  skipTo(v, script, potTick - 1, potTick);
  check(sweetSam(v).scaredEatAwardNext === 0, `tick ${potTick}: the pot restarts the award`);

  skipTo(v, script, potTick, eatTick - 1);
  const pre = sweetSam(v).score;
  skipTo(v, script, eatTick - 1, eatTick);
  const at = sweetSam(v);
  check(at.score - pre === 200, `tick ${eatTick}: the next bee scores 200`, at.score - pre);
  check(at.popups.at(-1)?.frameIdx === 0, "the 200 popup shows", at.popups);
  v.frame("2-bee-200", 2);

  v.record(
    "pot-restart",
    () => {
      v.dismissNotice();
      loadFixture(v, script);
      skipTo(v, script, 0, potTick - 120);
      replayLive(v, script, potTick - 120, end);
      v.wait(500);
    },
    { scene: "game" },
  );
  v.assertNoErrors();
});
