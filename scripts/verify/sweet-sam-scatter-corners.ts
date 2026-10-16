// Scatter corners as in Pac-Man (#225) in a real browser
// (`bun run verify sweet-sam-scatter-corners`). The bear holds Down from the
// start, played headless first, then replayed through the `?debug` test hook:
//
// - red's scatter target is the top right (25, 0), pink's the top left (2, 0),
//   teal's the bottom right (27, 35) and orange's the bottom left (0, 35);
// - at the end of the first scatter red circles the top right block and pink
//   the top left one.
//
// Writes a frame at the end of the first scatter and a video of it to
// out/verify/sweet-sam-scatter-corners/.

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

const corners = { red: [25, 0], pink: [2, 0], teal: [27, 35], orange: [0, 35] };
const down: Input = { ...NO_INPUT, down: true };
const inputs: Input[] = [];
const targets: Record<string, number[]> = {};
/** The script tick of the last scatter tick before the first chase. */
let scatterEnd = 0;
{
  const off = addSoundListener(() => {});
  rng.seed(1);
  const s = new SweetSamSoftware(0);
  for (const e of s.enemies) if (e.kind !== null) targets[e.kind] = [e.target.x, e.target.y];
  // Script tick 1 is a hub tick; game update n runs on script tick n + 1.
  for (let t = 2; scatterEnd === 0 && t < 3000; t++) {
    const mode = s.modeIndex;
    s.update(down);
    inputs.push(down);
    if (mode === 1 && s.modeIndex === 2) scatterEnd = t - 1;
  }
  off();
}
const script: InputScript = {
  name: "sweet-sam-scatter-corners",
  scene: "game",
  software: "sweetSam",
  seed: 1,
  captureTicks: [],
  steps: [{ ticks: 1, input: {} }, ...compress(inputs)],
};

await verify("sweet-sam-scatter-corners", (v) => {
  check(
    JSON.stringify(targets) === JSON.stringify(corners),
    "each bee's scatter target is its Pac-Man corner",
    targets,
  );
  check(scatterEnd > 0, `the first scatter ends at tick ${scatterEnd}`);

  v.openHook("scene=game");
  v.dismissNotice();
  loadFixture(v, script);
  skipTo(v, script, 0, scatterEnd);
  const s = sweetSamIn(v.snapshot(isGameSnapshot));
  const red = bee(s, "red");
  const pink = bee(s, "pink");
  check(red.x > 112 && red.y < 80, "red circles the top right block", red);
  check(pink.x < 112 && pink.y < 80, "pink circles the top left block", pink);
  v.frame("end-of-first-scatter", 2);

  v.record(
    "first-scatter",
    () => {
      v.dismissNotice();
      loadFixture(v, script);
      replayLive(v, script, 0, scatterEnd);
      v.wait(500);
    },
    { scene: "game" },
  );
  v.assertNoErrors();
});
