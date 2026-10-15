// The scoreboard names the prize desk (#136) in a real browser
// (`bun run verify desk-label`). Continue a save at the hub start, walk down
// to the desk (the board reads PRIZE COUNTER and INTERACT), open the menu
// (the board shows the counts), close it (the label is back), then walk
// away (the counts again): state through the hook, stills and a video from
// the real loop. Files go to
// out/verify/desk-label/.

import { saveKey } from "../../src/title/save.ts";
import { isTitleSnapshot, verify, type Verify } from "../harness.ts";

function check(ok: boolean, what: string, got?: unknown): void {
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

function menu(v: Verify): string | null {
  const g = v.snapshot(isTitleSnapshot).game;
  if (g === null) throw new Error("no game running");
  return g.menu;
}

function faced(v: Verify): string | null {
  const g = v.snapshot(isTitleSnapshot).game;
  if (g === null) throw new Error("no game running");
  return g.arcade.faced;
}

/** A save at the hub start position (80, 92), facing down, 2 px short of the desk. */
const save = JSON.stringify({ v: 2, highScore: 0, tokens: 2, tickets: 12, player: { x: 80, y: 92, dir: "DOWN" } });

await verify("desk-label", (v) => {
  v.openHook();
  v.page.eval(`localStorage.setItem(${JSON.stringify(saveKey)}, ${JSON.stringify(save)}); "ok"`);
  v.openHook();
  v.key("ShiftLeft"); // dismisses the keyboard notice if this browser looks touch-first; nothing on the title
  v.tap("space"); // Continue

  v.step(10, { down: true });
  v.step(20);
  check(faced(v) === "prizeCounter", "the board names the prize counter at the desk", faced(v));

  v.tap("space");
  check(menu(v) === "prizeCounter", "the action key opens the prize counter", menu(v));
  check(faced(v) === null, "the board shows the counts with the menu open", faced(v));

  v.tap("escape");
  check(menu(v) === null, "Esc closes it", menu(v));
  check(faced(v) === "prizeCounter", "the label is back after Esc", faced(v));

  v.step(10, { up: true });
  check(faced(v) === null, "the board shows the counts after walking away", faced(v));

  // Stills from the real loop: under the paused hook a touch-first browser's keyboard notice never clears.
  v.open();
  v.page.eval(`localStorage.setItem(${JSON.stringify(saveKey)}, ${JSON.stringify(save)}); "ok"`);
  v.open();
  v.wait(500);
  v.key("ShiftLeft"); // the keyboard notice, if any
  v.key("Space"); // Continue
  v.wait(500);
  v.screenshot("1-start-counts");
  v.key("ArrowDown", 300);
  v.wait(300);
  v.screenshot("2-facing-desk-label");
  v.key("Space");
  v.wait(500);
  v.screenshot("3-menu-open-counts");
  v.key("Escape");
  v.wait(500);
  v.screenshot("4-closed-label-again");
  v.key("ArrowUp", 300);
  v.wait(300);
  v.screenshot("5-walked-away-counts");

  v.record(
    "walkthrough",
    () => {
      v.wait(800);
      v.key("ShiftLeft"); // the keyboard notice, if any
      v.wait(400);
      v.key("Space"); // Continue
      v.wait(800);
      v.key("ArrowDown", 300); // to the desk: PRIZE COUNTER, INTERACT
      v.wait(1500);
      v.key("Space"); // open: the counts
      v.wait(1200);
      v.key("Escape"); // close: the label again
      v.wait(1200);
      v.key("ArrowUp", 400); // away: the counts
      v.wait(1200);
    },
    { storage: { [saveKey]: save } },
  );

  v.assertNoErrors();
});
