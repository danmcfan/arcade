// The title menu with a save that holds a high score (`bun run verify
// title-hints`): no high score is drawn, and the menu hints list arrows and
// WASD for CHOOSE and E / SPACE / ENTER for OK, on two rows at 192 px. Frames
// of the title menu, the New game check and the hub pause menu, plus a live
// screenshot and a short video, go to out/verify/title-hints/.

import { saveKey } from "../../src/title/save.ts";
import { isTitleSnapshot, verify, type Verify } from "../harness.ts";

const save = {
  v: 3,
  highScore: 1230,
  tokens: 5,
  tickets: 0,
  prizes: [],
  player: { x: 80, y: 92, dir: "UP" },
};
const storage = { [saveKey]: JSON.stringify(save) };

/**
 * A headless browser can look touch-first (no pointer, small viewport), which
 * puts up the "needs a keyboard" notice; any keydown dismisses it, unseen by
 * the title. Under the hook the loop is paused, and only a real loop tick
 * clears a dismissed notice, so run the loop for a moment.
 */
function dismissNotice(v: Verify): void {
  v.page.eval(`window.dispatchEvent(new KeyboardEvent("keydown", { code: "ShiftLeft", key: "Shift" })); "ok"`);
  v.page.eval(`window.dispatchEvent(new KeyboardEvent("keyup", { code: "ShiftLeft", key: "Shift" })); "ok"`);
  v.page.eval("window.__arcade.resume(); 'ok'");
  v.wait(200);
  v.page.eval("window.__arcade.pause(); 'ok'");
}

await verify("title-hints", (v) => {
  v.openHook();
  v.page.eval(`localStorage.setItem(${JSON.stringify(saveKey)}, ${JSON.stringify(storage[saveKey])}); "ok"`);
  v.openHook();
  dismissNotice(v);
  let s = v.snapshot(isTitleSnapshot);
  if (s.phase !== "menu" || !s.canContinue)
    throw new Error(`expected the title menu with Continue: ${JSON.stringify(s)}`);
  v.frame("1-menu");

  v.tap("down");
  v.tap("space");
  s = v.snapshot(isTitleSnapshot);
  if (s.phase !== "confirm") throw new Error(`expected the New game check: ${s.phase}`);
  v.frame("2-confirm");
  v.tap("space");

  v.tap("up");
  v.tap("space");
  v.tap("escape");
  s = v.snapshot(isTitleSnapshot);
  if (s.phase !== "paused") throw new Error(`expected the hub pause menu: ${s.phase}`);
  v.frame("3-pause");

  v.open();
  v.key("ShiftLeft");
  v.screenshot("4-live-menu");

  v.record(
    "menu",
    () => {
      v.key("ShiftLeft");
      v.wait(800);
      v.key("KeyS");
      v.wait(500);
      v.key("KeyW");
      v.wait(500);
      v.key("KeyE");
      v.wait(800);
      v.key("Escape");
      v.wait(800);
    },
    { storage },
  );
  v.assertNoErrors();
});
