// Brass Monkey's HUD in Sweet Sam's style (#212): `bun run verify brass-monkey-hud`.
// Opens both cabinets through the `?debug` test hook and writes their frames
// side by side (1UP and HIGH SCORE, the rolling dials, spare lives), then
// replays the bot's seed-163 run (scripts/gen-brass-monkey-play.ts) to frame the
// dials after points and a lost life, and records it. Files go to
// out/verify/brass-monkey-hud/.

import { readFileSync, writeFileSync } from "node:fs";
import { PNG } from "pngjs";
import type { BrassMonkeySnapshot, GameSnapshot } from "../../src/game/snapshot.ts";
import { play } from "../gen-brass-monkey-play.ts";
import { isGameSnapshot, packInputs, replayPage, stepPage, sweetSamIn, verify, type Verify } from "../harness.ts";

const seed = 163;
const run = play(seed);
const packed = packInputs(run.inputs);

const bm = (s: GameSnapshot): BrassMonkeySnapshot => {
  if (s.software !== "brassMonkey" || s.sw === null || !("moving" in s.sw)) throw new Error("not in Brass Monkey");
  return s.sw;
};

function check(ok: boolean, what: string, got?: unknown): void {
  console.log(`  ${ok ? "ok" : "FAIL"}: ${what}${ok ? "" : ` (got ${JSON.stringify(got)})`}`);
  if (!ok) throw new Error(what);
}

function load(v: Verify, software: "sweetSam" | "brassMonkey"): void {
  v.page.eval(`window.__arcade.seed(${seed}); window.__arcade.load("game", { software: "${software}" }); "ok"`);
}

/** The two frames side by side, 16 px apart. */
function sideBySide(v: Verify, left: string, right: string): void {
  const a = PNG.sync.read(readFileSync(left));
  const b = PNG.sync.read(readFileSync(right));
  const gap = 16;
  const out = new PNG({ width: a.width + gap + b.width, height: Math.max(a.height, b.height) });
  PNG.bitblt(a, out, 0, 0, a.width, a.height, 0, 0);
  PNG.bitblt(b, out, 0, 0, b.width, b.height, a.width + gap, 0);
  writeFileSync(`${v.dir}/1-side-by-side.png`, PNG.sync.write(out));
}

await verify("brass-monkey-hud", (v) => {
  v.openHook("scene=game");
  v.dismissNotice();

  console.log("both cabinets at the start:");
  load(v, "sweetSam");
  v.step(1);
  check(sweetSamIn(v.snapshot(isGameSnapshot)).lives === 3, "Sweet Sam starts with 3 lives");
  const sam = v.frame("1-sweet-sam", 2);
  load(v, "brassMonkey");
  v.step(1);
  const start = bm(v.snapshot(isGameSnapshot));
  check(start.lives === 3, "Brass Monkey starts with 3 lives", start);
  const monkey = v.frame("1-brass-monkey", 2);
  sideBySide(v, sam, monkey);

  console.log("Brass Monkey after points and a lost life:");
  let at = 0;
  for (; at < packed.length; at += 60) {
    v.page.eval(stepPage(packed, at, at + 60));
    const m = bm(v.snapshot(isGameSnapshot));
    if (m.lives === 2 && m.phase === "play" && m.score > 0) break;
  }
  const later = bm(v.snapshot(isGameSnapshot));
  check(later.lives === 2 && later.score > 0, "a life lost with points scored", later);
  v.frame("2-brass-monkey-later", 2);

  console.log("video:");
  v.record(
    "hud",
    () => {
      v.page.eval(
        `window.__arcade.pause(); window.__arcade.seed(${seed});
         window.__arcade.load("game", { software: "brassMonkey" });
         ${replayPage(packed.slice(0, at), 2)}`,
      );
      v.wait(Math.ceil(at / 2) * 17 + 1000);
    },
    { scene: "game" },
  );
  v.assertNoErrors();
});
