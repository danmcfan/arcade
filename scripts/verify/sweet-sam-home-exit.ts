// Bees in the home as in Pac-Man (#226) in a real browser
// (`bun run verify sweet-sam-home-exit`). The bear holds Down from the start,
// as in sweet-sam-bee-release; played headless first to find its ticks, then
// replayed through the `?debug` test hook:
//
// - teal and orange bob up and down in the home while they wait, x fixed;
// - pink, freed at once, leaves LEFT;
// - teal and orange leave LEFT, or RIGHT if scatter/chase switched while they
//   waited, and a bee that leaves RIGHT does not turn back.
//
// Writes a frame at each stop and a video to out/verify/sweet-sam-home-exit/.

import { NO_INPUT, type Input } from "../../src/engine/input.ts";
import * as rng from "../../src/engine/rng.ts";
import { addSoundListener } from "../../src/engine/audio.ts";
import type { InputScript } from "../../src/game/script.ts";
import type { SweetSamSnapshot } from "../../src/game/snapshot.ts";
import { SweetSamSoftware } from "../../src/sweet-sam/software.ts";
import { loadFixture, replayLive, skipTo } from "../fixture-replay.ts";
import { check, isGameSnapshot, sweetSamIn, verify } from "../harness.ts";
import { compress } from "../sweet-sam-bot.ts";

function bee(s: SweetSamSnapshot, kind: string): SweetSamSnapshot["enemies"][number] {
  const e = s.enemies.find((b) => b.kind === kind);
  if (e === undefined) throw new Error(`no ${kind} bee`);
  return e;
}

const kinds = ["pink", "teal", "orange"] as const;
type Kind = (typeof kinds)[number];

/** Per bee: its first tick out of the home and whether the mode changed while it was in. */
const exits = new Map<Kind, { tick: number; changed: boolean }>();
const down: Input = { ...NO_INPUT, down: true };
const inputs: Input[] = [];
{
  const off = addSoundListener(() => {});
  rng.seed(1);
  const s = new SweetSamSoftware(0);
  const changed = new Set<Kind>();
  // Script tick 1 is a hub tick; game update n runs on script tick n + 1.
  for (let t = 2; exits.size < kinds.length && t < 3000; t++) {
    const mode = s.modeIndex;
    s.update(down);
    inputs.push(down);
    for (const kind of kinds) {
      const e = s.enemies.find((b) => b.kind === kind);
      if (e === undefined || exits.has(kind)) continue;
      if (mode > 0 && s.modeIndex > mode && e.home) changed.add(kind);
      if (!e.home) exits.set(kind, { tick: t, changed: changed.has(kind) });
    }
  }
  for (let k = 0; k < 120; k++) inputs.push(down);
  off();
}
const last = Math.max(...[...exits.values()].map((x) => x.tick));
const script: InputScript = {
  name: "sweet-sam-home-exit",
  scene: "game",
  software: "sweetSam",
  seed: 1,
  captureTicks: [],
  steps: [{ ticks: 1, input: {} }, ...compress(inputs)],
};

function exitOf(kind: Kind): { tick: number; changed: boolean } {
  const x = exits.get(kind);
  if (x === undefined) throw new Error(`${kind} never left`);
  return x;
}

await verify("sweet-sam-home-exit", (v) => {
  v.openHook("scene=game");
  v.dismissNotice();
  loadFixture(v, script);
  console.log("exits:", JSON.stringify(Object.fromEntries(exits)));

  // Teal bobs while it waits.
  let at = 0;
  const watchTick = 140;
  skipTo(v, script, at, watchTick);
  at = watchTick;
  const xs = new Set<number>();
  const ys = new Set<number>();
  for (let k = 0; k < 20; k++) {
    skipTo(v, script, at, at + 1);
    at++;
    const t = bee(sweetSamIn(v.snapshot(isGameSnapshot)), "teal");
    check(t.home && t.dotMin > 0, `tick ${at}: teal waits in the home`);
    xs.add(t.x);
    ys.add(t.y);
    if (k === 4 || k === 12) v.frame(`1-teal-bobs-${k}`, 2);
  }
  check(xs.size === 1 && ys.size > 4, "teal bobs up and down while its x stays put", { xs: [...xs], ys: [...ys] });

  for (const [n, kind] of kinds.entries()) {
    const { tick, changed } = exitOf(kind);
    skipTo(v, script, at, tick - 1);
    at = tick - 1;
    check(
      bee(sweetSamIn(v.snapshot(isGameSnapshot)), kind).leaveRight === changed,
      `${kind} is set to leave ${changed ? "RIGHT" : "LEFT"} before it goes`,
    );
    skipTo(v, script, at, tick);
    at = tick;
    const e = bee(sweetSamIn(v.snapshot(isGameSnapshot)), kind);
    const want = changed ? "RIGHT" : "LEFT";
    check(
      !e.home && e.dir === want,
      `tick ${tick}: ${kind} leaves ${want}${changed ? " (the mode changed while it waited)" : ""}`,
      e,
    );
    v.frame(`${n + 2}-${kind}-leaves-${want.toLowerCase()}`, 2);
    skipTo(v, script, at, at + 6);
    at += 6;
    const after = bee(sweetSamIn(v.snapshot(isGameSnapshot)), kind);
    check(!after.reverse && after.dir === want, `and is still heading ${want} 6 ticks later`, after);
  }
  check(
    kinds.some((k) => !exitOf(k).changed),
    "at least one bee left with no mode change in between",
  );

  v.record(
    "home-exit",
    () => {
      v.dismissNotice();
      loadFixture(v, script);
      replayLive(v, script, 0, last + 60);
      v.wait(500);
    },
    { scene: "game" },
  );
  v.assertNoErrors();
});
