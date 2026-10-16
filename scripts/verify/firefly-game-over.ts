// The firefly is not drawn after the last life (#163) in a real browser
// (`bun run verify firefly-game-over`). Plays a seeded paid run of Firefly
// without moving or firing until the last life is lost and the game is over,
// then frames the payout: GAME OVER and the payout box over a field with no
// firefly. Frames go to out/verify/firefly-game-over/.

import type { FireflySnapshot } from "../../src/game/snapshot.ts";
import { check, isTitleSnapshot, verify, type Verify } from "../harness.ts";

function firefly(v: Verify): FireflySnapshot | null {
  const g = v.snapshot(isTitleSnapshot).game;
  return g !== null && g.software === "firefly" && g.sw !== null && "stageTick" in g.sw ? g.sw : null;
}

await verify("firefly-game-over", (v) => {
  v.openHook();
  v.page.eval("localStorage.clear()");
  v.openHook();
  v.page.eval(`window.__arcade.seed(1); "ok"`);
  v.tap("space"); // New game -> intro
  v.tap("space"); // intro -> hub
  v.step(31, { up: true });
  v.step(40, { right: true });
  v.step(1, { up: true, space: true });

  let s = firefly(v);
  check(s !== null, "a Firefly run started");
  let lastLife = false;
  for (let t = 0; t < 30_000 && s !== null && !s.over; t++) {
    if (!lastLife && s.lives === 0 && s.respawn > 0) {
      lastLife = true;
      v.frame("1-last-life-burst", 3);
    }
    v.step(1);
    s = firefly(v);
  }
  check(s?.over === true, "the idle firefly loses every life and the game ends", s);
  check(s?.respawn === 0, "the death pause is over", s?.respawn);
  v.dismissNotice();
  v.frame("2-game-over", 3);
  v.step(120);
  v.frame("3-payout", 3);
  v.assertNoErrors();
});
