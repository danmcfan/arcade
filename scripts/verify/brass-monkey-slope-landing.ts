// Brass Monkey lands a jump on a slope's step-up (#171): `bun run verify brass-monkey-slope-landing`.
// Walks the monkey right to x 113, onto the bottom girder's rising slope and
// jumps right, which used to fall through the girder and lose a life, through
// the `?debug` test hook; checks it lands back on the girder with every life,
// and writes frames of the jump and its landing and a video of it.
// Files go to out/verify/brass-monkey-slope-landing/.

import type { BrassMonkeySnapshot, GameSnapshot } from "../../src/game/snapshot.ts";
import { isGameSnapshot, verify } from "../harness.ts";

const seed = 1;
/** Where a jump right used to step through the slope (#171). */
const jumpAt = 113;

const monkeyX = (s: GameSnapshot): number =>
  s.software === "brassMonkey" && s.sw !== null && "moving" in s.sw ? s.sw.x : -1;

const bm = (s: GameSnapshot): BrassMonkeySnapshot => {
  if (s.software !== "brassMonkey" || s.sw === null || !("moving" in s.sw)) throw new Error("not in Brass Monkey");
  return s.sw;
};

await verify("brass-monkey-slope-landing", (v) => {
  v.openHook("scene=game");
  // A short viewport reads as touch-first: dismiss the "needs a keyboard" notice first.
  v.key("Space");
  v.page.eval("window.__arcade.resume()");
  v.wait(300);
  v.page.eval("window.__arcade.pause()");
  v.page.eval(`window.__arcade.seed(${seed}); window.__arcade.load("game", { software: "brassMonkey" }); "ok"`);
  let walk = 0;
  for (; walk < 200 && monkeyX(v.snapshot(isGameSnapshot)) < jumpAt; walk++) v.step(1, { right: true });
  const before = bm(v.snapshot(isGameSnapshot));
  if (before.x !== jumpAt) throw new Error(`the monkey walked to x ${before.x}, not ${jumpAt}`);
  console.log("before the jump:", before.x, before.y, before.lives);
  v.step(1, { right: true, space: true });
  v.step(14, { right: true });
  v.frame("1-mid-jump", 2);
  let m = bm(v.snapshot(isGameSnapshot));
  for (let n = 0; n < 60 && m.footing === "air"; n++) {
    v.step(1, { right: true });
    m = bm(v.snapshot(isGameSnapshot));
  }
  console.log("landed:", m.x, m.y, m.footing, m.phase, m.lives);
  if (m.phase !== "play" || m.lives !== before.lives || m.footing !== "ground" || m.y > 248) {
    throw new Error(`the jump did not land on the slope: ${JSON.stringify({ x: m.x, y: m.y, phase: m.phase })}`);
  }
  v.step(10);
  v.frame("2-landed", 2);

  v.record(
    "jump",
    () => {
      v.page.eval(
        `window.__arcade.pause(); window.__arcade.seed(${seed}); window.__arcade.load("game", { software: "brassMonkey" });
         window.__at = 0;
         window.__timer = setInterval(() => {
           const n = window.__at++;
           if (n > ${walk + 90}) return;
           window.__arcade.step(1, { right: n <= ${walk + 40}, space: n === ${walk} });
         }, 33); "ok"`,
      );
      v.wait((walk + 100) * 34);
    },
    { scene: "game" },
  );
  v.assertNoErrors();
});
