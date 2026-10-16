// Sweet Sam's levels (#47) in a real browser (`bun run verify sweet-sam-levels`).
// Replays parity fixtures through the `?debug` test hook and stops where #47
// shows: sweet-sam-levels (the start of level 1, honey drops and a smoke pot
// eaten, the bonus flower and its points, a sleepy bee eaten, the level-clear
// flash, LEVEL 2 and its faster bees), sweet-sam-clear (a lost life with the
// death animation) and sweet-sam-highscore (game over opening the payout).
// At each stop it checks the snapshot and the sounds, and writes the frame.
// Then it records the level-1 flower and clear, and the death, as videos.
// Files go to out/verify/sweet-sam-levels/.

import type { SoundEvent } from "../../src/engine/audio.ts";
import type { InputScript } from "../../src/game/script.ts";
import type { GameSnapshot, SweetSamSnapshot } from "../../src/game/snapshot.ts";
import { flowerPoints, flowerStayMax } from "../../src/sweet-sam/flower.ts";
import { levelValues } from "../../src/sweet-sam/levels.ts";
import { inputPath, loadScript } from "../../test/parity/fixtures.ts";
import { isRecord } from "../browser.ts";
import { loadFixture, replayLive, skipTo } from "../fixture-replay.ts";
import { evalJson, isGameSnapshot, isStringArray, verify, type Verify } from "../harness.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

function isSweetSamSnapshot(x: unknown): x is SweetSamSnapshot {
  return isRecord(x) && typeof x["level"] === "number" && Array.isArray(x["enemies"]);
}

function sweetSam(v: Verify): SweetSamSnapshot {
  const g = v.snapshot(isGameSnapshot);
  if (g.software !== "sweetSam" || !isSweetSamSnapshot(g.sw)) throw new Error(`not in Sweet Sam: ${g.software}`);
  return g.sw;
}

function soundsSince(v: Verify): SoundEvent[] {
  return evalJson(v.page, "window.__arcade.sounds()", isStringArray).filter((e): e is SoundEvent => e.includes(":"));
}

interface Stop {
  tick: number;
  name: string;
  shows: string;
  /** Checks on the snapshot at `tick` and the sounds since the last stop. */
  expect: (s: SweetSamSnapshot, sounds: readonly SoundEvent[], g: GameSnapshot) => void;
}

/** Replay `script` from its start, stopping at each of `stops`. */
function playStops(v: Verify, script: InputScript, stops: readonly Stop[]): void {
  soundsSince(v);
  loadFixture(v, script);
  let at = 0;
  for (const stop of stops) {
    skipTo(v, script, at, stop.tick);
    at = stop.tick;
    const g = v.snapshot(isGameSnapshot);
    console.log(`${stop.name} (${script.name} tick ${stop.tick}): ${stop.shows}`);
    stop.expect(isSweetSamSnapshot(g.sw) ? g.sw : sweetSam(v), soundsSince(v), g);
    v.frame(stop.name, 2);
  }
}

const levels = loadScript(inputPath("sweet-sam-levels"));
const clear = loadScript(inputPath("sweet-sam-clear"));
const highscore = loadScript(inputPath("sweet-sam-highscore"));

const levelStops: Stop[] = [
  {
    tick: 1,
    name: "01-level-1-start",
    shows: "level 1: READY!, the violet in the level counter at the bottom right, the start jingle",
    expect: (s, sounds) => {
      check(s.level === 1 && s.state === "START" && s.levelBannerTicks === 0, "level 1 starts with READY, no banner");
      check(sounds.includes("play:sweetStart"), "the start jingle plays", sounds);
    },
  },
  {
    tick: 160,
    name: "02-honey-drops",
    shows: "honey drops eaten, each with a chomp",
    expect: (s, sounds) => {
      check(s.items < 244, "honey drops are gone", s.items);
      check(
        sounds.includes("play:sweetChompHigh") && sounds.includes("play:sweetChompLow"),
        "the chomp alternates its two notes",
        sounds,
      );
    },
  },
  {
    tick: 772,
    name: "03-smoke-pot",
    shows: "a smoke pot eaten: every bee falls asleep, home ones too, with a puff",
    expect: (s, sounds) => {
      check(sounds.includes("play:sweetSmoke"), "the smoke pot puffs", sounds);
      check(
        s.enemies.some((e) => e.home) && s.enemies.every((e) => e.blue === levelValues(1).sleepyFrames),
        "every bee, the ones in the home too, is sleepy for level 1's 10 s",
      );
    },
  },
  {
    tick: 900,
    name: "04-bonus-flower",
    shows: "the bonus flower below the bee home",
    expect: (s) => {
      check(s.flower.shown === 1 && s.flower.ticks > 0, "the first flower is out", s.flower);
      check(s.flower.ticks <= flowerStayMax, "for at most 10 s", s.flower);
    },
  },
  {
    tick: 1177,
    name: "05-sleepy-bee-eaten",
    shows: "a sleepy bee eaten: its points and a burst",
    expect: (s, sounds) => {
      check(s.state === "PAUSE" && s.popups.length > 0, "the bee's points float above it");
      check(sounds.includes("play:sweetBee"), "the sleepy bee sound plays", sounds);
    },
  },
  {
    tick: 1277,
    name: "06-flower-eaten",
    shows: "the first flower eaten: 100 (Pac-Man's cherry points) in the pixel font where it stood",
    expect: (s, sounds) => {
      check(s.flowerPopup?.points === flowerPoints(1), "it scores level 1's points", s.flowerPopup);
      check(s.flower.ticks === 0, "and is gone");
      check(sounds.includes("play:sweetFlower"), "with its sparkle", sounds);
    },
  },
  {
    tick: 4677,
    name: "07-level-clear-flash",
    shows: "the last honey drop eaten: everything stops, the bees leave and the maze flashes",
    expect: (s, sounds) => {
      check(s.state === "LEVELCLEAR" && s.items === 0, "level 1 is clear");
      check(s.mazeFlash, "the maze is in its flash colours");
      check(sounds.includes("play:sweetClear"), "the fanfare plays", sounds);
    },
  },
  {
    tick: 4793,
    name: "08-level-2-banner",
    shows: "LEVEL 2 before READY, the maze full again, everyone home",
    expect: (s) => {
      check(s.level === 2 && s.levelBannerTicks > 0 && s.items === 244, "LEVEL 2 with a full maze", s.level);
      check(s.player.x === 112 && s.player.y === 212, "the bear back at its start");
    },
  },
  {
    tick: 4993,
    name: "09-level-2-faster-bees",
    shows: "level 2 playing: the bees fly faster than on level 1",
    expect: (s) => {
      const awake = s.enemies.filter((e) => !e.home && e.blue === 0 && e.velocity > 0.5);
      check(
        awake.length > 0 && awake.every((e) => e.velocity === levelValues(2).beeVelocity),
        `awake bees fly at ${levelValues(2).beeVelocity} px a tick (level 1: ${levelValues(1).beeVelocity})`,
        awake.map((e) => e.velocity),
      );
    },
  },
];

const deathStops: Stop[] = [
  {
    tick: 4817,
    name: "10-life-lost-dazed",
    shows: "a bee catches the bear: dazed",
    expect: (s, sounds) => {
      check(s.state === "DEATHWAIT" && s.deathFrame === 0, "the death animation starts dazed", s.deathFrame);
      check(sounds.includes("play:sweetDeath"), "the lost-life slide plays", sounds);
    },
  },
  {
    tick: 4860,
    name: "11-life-lost-sinking",
    shows: "the bear sinking",
    expect: (s) => {
      check(s.deathFrame === 1, "then sinks", s.deathFrame);
    },
  },
  {
    tick: 4930,
    name: "12-life-lost-puddle",
    shows: "a puddle with stars, still inside the 2 s death wait",
    expect: (s) => {
      check(s.state === "DEATHWAIT" && s.deathFrame === 3, "and ends as a puddle before the wait is over", s);
    },
  },
  {
    tick: 4938,
    name: "13-after-death",
    shows: "the round restarts on time: 2 s after the catch",
    expect: (s) => {
      check(s.state === "START" && s.deathFrame === null && s.lives === 2, "START on the same tick as before #47");
    },
  },
];

const payoutStops: Stop[] = [
  {
    tick: 2871,
    name: "14-game-over-payout",
    shows: "the last life lost: game over opens the payout, points to tickets",
    expect: (s, _sounds, g) => {
      check(s.state === "GAMEOVER" && s.lives === 0, "game over", s.state);
      check(g.payout !== null, "the payout is open", g.payout);
    },
  },
];

function video(v: Verify): void {
  console.log("videos:");
  v.record(
    "level-1-flower-and-clear",
    () => {
      loadFixture(v, levels);
      skipTo(v, levels, 0, 1150);
      replayLive(v, levels, 1150, 1400);
      skipTo(v, levels, 1400, 4550);
      replayLive(v, levels, 4550, 5080);
      v.wait(500);
    },
    { scene: "game" },
  );
  check(sweetSam(v).level === 2, "the recording reached level 2");
  v.record(
    "life-lost",
    () => {
      loadFixture(v, clear);
      skipTo(v, clear, 0, 4760);
      replayLive(v, clear, 4760, 5000);
      v.wait(500);
    },
    { scene: "game" },
  );
  check(sweetSam(v).lives === 2, "the recording lost a life");
}

await verify("sweet-sam-levels", (v) => {
  v.openHook("scene=game");
  playStops(v, levels, levelStops);
  playStops(v, clear, deathStops);
  playStops(v, highscore, payoutStops);
  video(v);
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
