// Brass Monkey shows its lap (#175): `bun run verify brass-monkey-loop`.
// Replays the bot's seed-163 run (scripts/gen-brass-monkey-play.ts), started in the
// cabinet, which
// escapes once, through the `?debug` test hook, and writes a frame of the HUD
// on the first lap (LOOP 1), the escaped scene (LOOP 2 coming) and the start
// of the second lap (LOOP 2 in the HUD and over the floor).
// Files go to out/verify/brass-monkey-loop/.

import type { Input } from "../../src/engine/input.ts";
import type { BrassMonkeySnapshot, GameSnapshot } from "../../src/game/snapshot.ts";
import type { InputScript } from "../../src/game/script.ts";
import { play } from "../gen-brass-monkey-play.ts";
import { isGameSnapshot, verify } from "../harness.ts";

const seed = 163;
const run = play(seed);
if (!run.escaped) throw new Error(`seed ${seed} no longer escapes: re-pick it with the bot`);
const inputs: Input[] = run.inputs;

const bm = (s: GameSnapshot): BrassMonkeySnapshot | null =>
  s.software === "brassMonkey" && s.sw !== null && "moving" in s.sw ? s.sw : null;

const script = (from: number, to: number): InputScript => ({
  name: "brass-monkey-loop-verify",
  scene: "game",
  seed,
  captureTicks: [],
  steps: inputs.slice(from, to).map((input) => ({ ticks: 1, input })),
});

await verify("brass-monkey-loop", (v) => {
  v.openHook("scene=game");
  // A short viewport reads as touch-first: dismiss the "needs a keyboard" notice,
  // and let the loop run a moment so it goes, before the run is loaded.
  v.key("Space");
  v.page.eval("window.__arcade.resume()");
  v.wait(300);
  v.page.eval("window.__arcade.pause()");
  v.page.eval(`window.__arcade.seed(${seed}); window.__arcade.load("game", { software: "brassMonkey" }); "ok"`);
  let at = 0;
  const until = (what: string, ok: (m: BrassMonkeySnapshot) => boolean): BrassMonkeySnapshot => {
    for (; at < inputs.length;) {
      v.page.eval(`window.__arcade.runScript(${JSON.stringify(script(at, at + 1))}); "ok"`);
      at++;
      const m = bm(v.snapshot(isGameSnapshot));
      if (m !== null && ok(m)) return m;
    }
    throw new Error(`never reached: ${what}`);
  };
  const advance = (ticks: number): void => {
    v.page.eval(`window.__arcade.runScript(${JSON.stringify(script(at, at + ticks))}); "ok"`);
    at += ticks;
  };

  until("the first floor", (m) => m.phase === "play");
  advance(30);
  v.frame("1-hud-loop-1", 2);
  until("the escaped scene", (m) => m.phase === "escape");
  advance(90);
  v.frame("2-escaped-loop-2", 2);
  const m = until("the second lap", (s) => s.phase === "play" && s.loop === 1);
  if (m.floor !== 0) throw new Error(`the second lap opened on floor ${m.floor}`);
  advance(30);
  v.frame("3-new-lap-loop-2", 2);
  v.assertNoErrors();
});
