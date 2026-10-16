// The bear eats the honey drop on a junction it corners round (#201), in a
// real browser (`bun run verify sweet-sam-corner-eat`). Headless, the bear runs
// LEFT from the start until it is 4 px short of a junction that opens UP and
// still holds its drop (the earliest pre-turn); there UP is tapped. The run is
// replayed through the `?debug` test hook: the bear cuts the corner, the
// junction's drop is gone and the browser's score matches the headless run.
// Writes frames before the tap and after the turn, and a video, to
// out/verify/sweet-sam-corner-eat/.

import { NO_INPUT, type Input } from "../../src/engine/input.ts";
import * as rng from "../../src/engine/rng.ts";
import type { InputScript } from "../../src/game/script.ts";
import type { SweetSamSnapshot } from "../../src/game/snapshot.ts";
import { SweetSamSoftware } from "../../src/sweet-sam/software.ts";
import { minigame } from "../../src/game/minigames.ts";
import { replayLive, loadFixture, skipTo } from "../fixture-replay.ts";
import { isGameSnapshot, verify, type Verify } from "../harness.ts";
import { compress } from "../sweet-sam-bot.ts";

function check(ok: boolean, what: string, got?: unknown): void {
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

function sweetSam(v: Verify): SweetSamSnapshot {
  const g = v.snapshot(isGameSnapshot);
  if (g.software !== "sweetSam" || g.sw === null || !("modeTicks" in g.sw)) throw new Error("not in Sweet Sam");
  return g.sw;
}

const seed = 1;
const tapAhead = 4;

// Plan the run headless: LEFT until the bear is `tapAhead` px short of a junction that opens UP.
rng.seed(seed);
const s = minigame("sweetSam").create({ highScore: 0, prizes: [] });
if (!(s instanceof SweetSamSoftware)) throw new Error("Sweet Sam's create must build a SweetSamSoftware");
const inputs: Input[] = [];
const left = { ...NO_INPUT, left: true };
let corner: { x: number; y: number } | null = null;
let drop = -1;
const dropAt = (c: { x: number; y: number }): number => s.items.findIndex((it) => it?.x === c.x && it.y === c.y);
while (corner === null && inputs.length < 2000) {
  const p = s.player;
  const live = s.stateMachine.currentId() === "PLAY" && p.direction === "LEFT";
  corner = live
    ? (s.corners.find(
        (c) => c.y === p.y && c.x === p.x - tapAhead && c.directions.includes("UP") && dropAt(c) !== -1,
      ) ?? null)
    : null;
  if (corner !== null) drop = dropAt(corner);
  const i = corner === null ? left : { ...NO_INPUT, up: true };
  inputs.push(i);
  s.update(i);
}
if (corner === null) throw new Error("the bear never came 4 px short of a junction opening UP with its drop");
const tapTick = inputs.length + 1;
for (let t = 0; t < 12; t++) {
  inputs.push(NO_INPUT);
  s.update(NO_INPUT);
}
const scoreAfter = s.scoreValue;
if (s.items[drop] !== null) throw new Error("headless: the cornering bear left the junction's drop");
for (let t = 0; t < 28; t++) inputs.push(NO_INPUT);

const script: InputScript = {
  name: "sweet-sam-corner-eat",
  scene: "game",
  software: "sweetSam",
  seed,
  captureTicks: [],
  steps: [{ ticks: 1, input: {} }, ...compress(inputs)],
};
const total = tapTick + 40;

await verify("sweet-sam-corner-eat", (v) => {
  v.openHook("scene=game");
  v.dismissNotice();
  loadFixture(v, script);

  skipTo(v, script, 0, tapTick - 1);
  const before = sweetSam(v).player;
  check(
    before.dir === "LEFT" && before.x === corner.x + tapAhead,
    `${tapAhead} px short of the junction, heading LEFT`,
    before,
  );
  v.frame("before-tap", 4);

  skipTo(v, script, tapTick - 1, tapTick + 1);
  const mid = sweetSam(v).player;
  check(mid.dir === "UP" && mid.x > corner.x && mid.y < corner.y, "the bear cuts the corner diagonally", mid);

  skipTo(v, script, tapTick + 1, tapTick + 12);
  const after = sweetSam(v);
  check(after.player.dir === "UP" && after.player.x === corner.x, "the bear is on the new corridor", after.player);
  check(after.score === scoreAfter, "the junction's drop is eaten: the score matches the headless run", after.score);
  v.frame("after-turn", 4);

  v.record(
    "corner-eats-drop",
    () => {
      v.dismissNotice();
      loadFixture(v, script);
      skipTo(v, script, 0, Math.max(0, tapTick - 40));
      replayLive(v, script, Math.max(0, tapTick - 40), total);
      v.wait(500);
    },
    { scene: "game" },
  );
  v.assertNoErrors();
});
