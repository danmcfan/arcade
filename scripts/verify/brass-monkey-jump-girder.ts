// Brass Monkey scores a jump only over a hazard on the monkey's own girder (#172):
// `bun run verify brass-monkey-jump-girder`.
// Plans the inputs in-process: the monkey climbs to the girder at y 187 and
// waits there (jumping what comes along its own girder) until a gear rolls
// along the girder at y 208 just under it, then jumps in place, which used to
// score 100 for that gear. It takes the first seed where the monkey lives. The check replays the
// inputs in the page through the `?debug` test hook, checks the score stays 0
// through the jump, and writes frames of the jump and a video of it.
// Files go to out/verify/brass-monkey-jump-girder/.

import { NO_INPUT, type Input } from "../../src/engine/input.ts";
import * as rng from "../../src/engine/rng.ts";
import { createScene } from "../../src/game/registry.ts";
import type { BrassMonkeySnapshot } from "../../src/game/snapshot.ts";
import { isGameSnapshot, verify } from "../harness.ts";

const bm = (g: unknown): BrassMonkeySnapshot => {
  if (!isGameSnapshot(g) || g.software !== "brassMonkey" || g.sw === null || !("moving" in g.sw))
    throw new Error("not in Brass Monkey");
  return g.sw;
};

/** A gear on the girder below, just under the monkey's feet and rolling in. */
const under = (s: BrassMonkeySnapshot): boolean =>
  s.hazards.some(
    (h) =>
      h.kind === "gear" &&
      h.footing === "ground" &&
      h.y - s.y > 20 &&
      h.y - s.y <= 30 &&
      s.x - h.x > 0 &&
      s.x - h.x < 4,
  );

/** Something coming along the monkey's own girder, to jump while it waits. */
const coming = (s: BrassMonkeySnapshot): boolean =>
  s.hazards.some((h) => Math.abs(h.y - s.y) <= 4 && Math.abs(h.x - s.x) < 18);

/**
 * The inputs up to the jump, and the tick (1-based) the jump starts on, or
 * null if the monkey dies on the way.
 */
function plan(seed: number): { inputs: Input[]; jumpAt: number } | null {
  rng.seed(seed);
  const scene = createScene("game", { software: "brassMonkey" });
  const inputs: Input[] = [];
  const press = (i: Partial<Input>): BrassMonkeySnapshot => {
    const input = { ...NO_INPUT, ...i };
    inputs.push(input);
    scene.step(input);
    return bm(scene.snapshot());
  };
  // The first tick starts the run.
  let m = press({});
  const go = (i: Partial<Input>, done: (m: BrassMonkeySnapshot) => boolean): boolean => {
    for (let n = 0; n < 2000 && !done(m); n++) {
      m = press(i);
      if (m.phase !== "play") return false;
    }
    return done(m);
  };
  // Right to the ladder at x 184, up to the girder at y 208, left to the ladder at x 32, up to y 187.
  const there =
    go({ right: true }, (s) => s.x >= 188) &&
    go({ up: true }, (s) => s.footing === "ground" && s.y < 230) &&
    go({ left: true }, (s) => s.x <= 36) &&
    go({ up: true }, (s) => s.footing === "ground" && s.y < 190) &&
    go({ right: true }, (s) => s.x >= 56);
  if (!there) return null;
  for (let n = 0; n < 3000 && !(m.footing === "ground" && under(m)); n++) {
    const prev = inputs.at(-1);
    m = press({ space: m.footing === "ground" && coming(m) && prev?.space !== true });
    if (m.phase !== "play") return null;
  }
  if (!under(m)) return null;
  const jumpAt = inputs.length + 1;
  m = press({ space: true });
  const ok = go({}, (s) => s.footing === "ground");
  scene.dispose?.();
  return ok ? { inputs: inputs.slice(0, jumpAt), jumpAt } : null;
}

let seed = 1;
let planned = plan(seed);
for (; planned === null && seed < 500;) planned = plan(++seed);
if (planned === null) throw new Error("no seed under 500 gets the monkey over a gear on the girder below");
const { inputs, jumpAt } = planned;
console.log("seed", seed, "jump at tick", jumpAt);

await verify("brass-monkey-jump-girder", (v) => {
  v.openHook("scene=game");
  // A short viewport reads as touch-first: dismiss the "needs a keyboard" notice first.
  v.key("Space");
  v.page.eval("window.__arcade.resume()");
  v.wait(300);
  v.page.eval("window.__arcade.pause()");
  v.page.eval(`window.__arcade.seed(${seed}); window.__arcade.load("game", { software: "brassMonkey" }); "ok"`);
  for (const i of inputs.slice(0, -1)) v.step(1, i);
  const before = bm(v.snapshot(isGameSnapshot));
  console.log("before the jump:", before.x, before.y, before.score, before.hazards);
  v.frame("1-before-jump", 2);
  v.step(1, { space: true });
  v.step(6);
  v.frame("2-mid-jump", 2);
  let m = bm(v.snapshot(isGameSnapshot));
  for (let n = 0; n < 60 && m.footing === "air"; n++) {
    v.step(1);
    m = bm(v.snapshot(isGameSnapshot));
  }
  console.log("landed:", m.x, m.y, m.footing, m.phase, m.score);
  if (m.phase !== "play" || m.footing !== "ground") throw new Error(`the jump went wrong: ${m.phase} ${m.footing}`);
  if (m.score !== before.score) throw new Error(`the gear on the girder below scored: ${before.score} -> ${m.score}`);
  v.frame("3-landed", 2);

  v.record(
    "jump",
    () => {
      v.page.eval(
        `window.__arcade.pause(); window.__arcade.seed(${seed}); window.__arcade.load("game", { software: "brassMonkey" });
         const inputs = ${JSON.stringify(inputs)};
         window.__at = 0;
         window.__timer = setInterval(() => {
           const n = window.__at++;
           if (n < inputs.length) window.__arcade.step(1, inputs[n]);
           else if (n < inputs.length + 60) window.__arcade.step(1);
         }, 33); "ok"`,
      );
      v.wait((jumpAt + 70) * 34);
    },
    { scene: "game" },
  );
  v.assertNoErrors();
});
