// Firefly shows the hub high score (#165) in a real browser (`bun run verify firefly-high-score`).
// A New game walks to the Firefly cabinet and starts a paid run; its top row
// shows the score (top left), the house high score of 40000 centred, and the
// spare lives (top right). Files go to out/verify/firefly-high-score/.

import { houseHighScores } from "../../src/arcade/wallet.ts";
import { isTitleSnapshot, verify } from "../harness.ts";

await verify("firefly-high-score", (v) => {
  // A desktop-sized window: a short headless one reads as touch-first and shows the keyboard notice.
  v.page.run("set", "viewport", "1280", "900");
  v.openHook();
  v.page.eval("localStorage.clear()");
  v.openHook();
  v.tap("space"); // New game -> intro
  v.tap("space"); // intro -> hub
  v.step(31, { up: true });
  v.step(40, { right: true });
  v.step(1, { up: true, space: true });
  const g = v.snapshot(isTitleSnapshot).game;
  if (g?.software !== "firefly") throw new Error(`no Firefly run: ${g?.software}`);
  console.log(`  ok  a Firefly run chasing the house high score ${houseHighScores.firefly}`);
  v.frame("1-stage-opens", 3);
  v.step(300, { space: true });
  v.frame("2-playing", 3);
  v.assertNoErrors();
});
