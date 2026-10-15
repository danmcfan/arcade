// How to Play and the Q key (`bun run verify how-to-play`): the intro lists
// every binding with the win condition and a key-agnostic INTERACT TO START
// that blinks on a 2 s cycle; the hub controls panel shows the same table; the
// scoreboard reads INTERACT TO PLAY at a cabinet; and a real Q keydown pauses (screenshots)
// the hub and backs out of the pause menu, as Esc does. Frames, screenshots
// and the video go to out/verify/how-to-play/.

import { isTitleSnapshot, verify, type Verify } from "../harness.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

/**
 * A headless browser that reports neither hover nor a fine pointer gets the
 * "needs a keyboard" notice; a key press dismisses it and does nothing else.
 */
function dismissNotice(v: Verify): void {
  v.key("KeyX");
}

function hookChecks(v: Verify): void {
  console.log("test hook (?debug):");
  v.openHook();
  v.page.eval("localStorage.clear()");
  v.openHook();
  v.page.eval("window.__arcade.resume()");
  dismissNotice(v);
  v.wait(200);
  v.page.eval("window.__arcade.pause()");
  v.tap("space");
  check(v.snapshot(isTitleSnapshot).phase === "intro", "New game shows How to Play");
  v.frame("1-intro-prompt-on");
  v.step(95);
  v.frame("2-intro-prompt-off");
  v.step(30);
  v.step(30, { space: true });
  v.page.eval("window.__arcade.step(1)");
  check(v.snapshot(isTitleSnapshot).phase === "playing", "Space on How to Play starts the game");
  v.step(25, { up: true });
  v.frame("3-scoreboard-interact");
  v.tap("escape");
  v.tap("down");
  v.tap("space");
  check(v.snapshot(isTitleSnapshot).phase === "controls", "the pause menu opens the controls panel");
  v.frame("4-controls-panel");
}

function liveQ(v: Verify): void {
  console.log("real Q key (screenshots):");
  v.open();
  v.page.eval("localStorage.clear()");
  v.open();
  dismissNotice(v);
  v.key("Space");
  v.screenshot("5-live-intro");
  v.key("Space");
  v.key("KeyQ");
  v.screenshot("6-live-q-pause");
  v.key("KeyQ");
  v.screenshot("7-live-q-resume");
}

await verify("how-to-play", (v) => {
  hookChecks(v);
  liveQ(v);
  v.record("intro-blink", () => {
    v.wait(800);
    dismissNotice(v);
    v.key("Space");
    v.wait(6000);
    v.key("Space");
    v.wait(800);
    v.key("KeyQ");
    v.wait(1000);
    v.key("KeyQ");
    v.wait(600);
  });
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
