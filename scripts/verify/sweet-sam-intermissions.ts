// Sweet Sam's intermissions (#160) in a real browser (`bun run verify sweet-sam-intermissions`).
// The bot plays headless from a seed on which it clears level 9, noting the
// tick each intermission starts. The run is replayed through the `?debug`
// test hook: in each scene it checks the state and music and writes frames
// (Act I: the red bee chases the bear, then the big bear chases a blue bee;
// Act II: the red bee snags partway; Act III: the red bee chases the bear,
// then comes back). Then the action key skips Act I straight to LEVEL 3, and
// each scene is recorded as a video. Files go to out/verify/sweet-sam-intermissions/.

import type { InputScript } from "../../src/game/script.ts";
import type { SweetSamSnapshot } from "../../src/game/snapshot.ts";
import { intermissionAfter } from "../../src/sweet-sam/intermission.ts";
import { loadFixture, replayLive, skipTo } from "../fixture-replay.ts";
import { evalJson, isGameSnapshot, isStringArray, sweetSamIn, verify, type Verify } from "../harness.ts";
import { compress, play } from "../sweet-sam-bot.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

function sweetSam(v: Verify): SweetSamSnapshot {
  return sweetSamIn(v.snapshot(isGameSnapshot));
}

/** A seed on which the bot clears level 9 (found by running seeds 1..80). */
const seed = 27;
/** Script tick of the first INTERMISSION tick, by the level just cleared. */
const starts = new Map<number, number>();
let ticks = 1; // the hub tick
const run = play(seed, 1, (s) => {
  const id = s.stateMachine.currentId();
  if (id === "INTERMISSION" && !starts.has(s.level - 1)) starts.set(s.level - 1, ticks);
  ticks++;
  return s.level >= 10 && id === "PLAY";
});
const script: InputScript = {
  name: "sweet-sam-intermissions",
  scene: "game",
  software: "sweetSam",
  seed,
  captureTicks: [],
  steps: [{ ticks: 1, input: {} }, ...compress(run.inputs)],
};

function start(level: number): number {
  const t = starts.get(level);
  if (t === undefined) throw new Error(`the bot never cleared level ${level}`);
  return t;
}

function length(level: number): number {
  return intermissionAfter(level)?.ticks ?? 0;
}

/** Frames `at` ticks into the scene after `level`. */
const stops: [level: number, at: number, name: string][] = [
  [2, 60, "act-1-1-bee-chases-bear"],
  [2, 300, "act-1-2-big-bear-chases-blue-bee"],
  [5, 60, "act-2-1-bee-follows-bear"],
  [5, 200, "act-2-2-bee-snagged"],
  [9, 60, "act-3-1-bee-chases-bear"],
  [9, 300, "act-3-2-bee-comes-back"],
];

await verify("sweet-sam-intermissions", (v) => {
  v.openHook("scene=game");
  v.dismissNotice();
  console.log(`bot seed ${seed}: intermissions at ${JSON.stringify([...starts])}`);
  check([...starts.keys()].join() === "2,5,9", "the run passes through exactly three intermissions", [...starts]);

  loadFixture(v, script);
  let at = 0;
  for (const [level, into, name] of stops) {
    if (at < start(level)) {
      skipTo(v, script, at, start(level));
      at = start(level);
      const s = sweetSam(v);
      const music = evalJson(v.page, "window.__arcade.sounds()", isStringArray);
      check(s.state === "INTERMISSION" && s.level === level + 1, `level ${level} cleared: its intermission starts`);
      check(music.includes("play:sweetStart"), "with the intermission music", music);
    }
    skipTo(v, script, at, start(level) + into);
    at = start(level) + into;
    check(sweetSam(v).state === "INTERMISSION", `${name}: still in the scene`);
    v.frame(name, 2);
  }
  skipTo(v, script, at, start(9) + length(9) + 2);
  check(sweetSam(v).state === "START" && sweetSam(v).level === 10, "after Act III, LEVEL 10 starts");

  // The action key skips a scene.
  loadFixture(v, script);
  skipTo(v, script, 0, start(2) + 30);
  v.step(1, { space: true });
  const skipped = sweetSam(v);
  check(skipped.state === "START" && skipped.level === 3, "the action key skips Act I to LEVEL 3", skipped.state);
  v.frame("act-1-skipped", 2);

  for (const [level, act] of [
    [2, "act-1"],
    [5, "act-2"],
    [9, "act-3"],
  ] as const) {
    v.record(
      act,
      () => {
        v.dismissNotice();
        loadFixture(v, script);
        skipTo(v, script, 0, start(level) - 30);
        replayLive(v, script, start(level) - 30, start(level) + length(level) + 60);
        v.wait(300);
      },
      { scene: "game" },
    );
  }

  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
