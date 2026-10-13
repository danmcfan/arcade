// End-to-end check of the title screen, intro, pause menu and save, in a
// real browser (`bun run verify title`). Part 1 drives the `?debug` test hook
// tick by tick and asserts on the title snapshot and on localStorage,
// including reloads (the real save path) and `pagehide`. Part 2 opens the
// page without `?debug` and plays it with keyboard events through the page's
// own keyboard handling and rAF loop. Part 3 records Continue from a save.
// Frames, screenshots and the video go to out/verify/title/.

import { saveKey } from "../../src/title/save.ts";
import { isRecord } from "../browser.ts";
import { evalJson, isTitleSnapshot, verify, type Verify } from "../harness.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

type Stored = { highScore: number; player: { x: number; y: number; dir: string } } | null;

function isStored(x: unknown): x is Stored {
  if (x === null) return true;
  if (!isRecord(x) || typeof x["highScore"] !== "number") return false;
  const p = x["player"];
  return isRecord(p) && typeof p["x"] === "number" && typeof p["y"] === "number" && typeof p["dir"] === "string";
}

function stored(v: Verify): Stored {
  return evalJson(v.page, `localStorage.getItem(${JSON.stringify(saveKey)}) ?? "null"`, isStored);
}

function hookChecks(v: Verify): void {
  console.log("test hook (?debug):");
  v.openHook();
  v.page.eval("localStorage.clear()");
  v.openHook();

  let s = v.snapshot(isTitleSnapshot);
  check(
    s.phase === "menu" && s.items.join() === "NEW GAME" && s.cursor === 0 && !s.canContinue,
    "opens on the title menu with only New game, selected",
    s,
  );
  v.frame("1-menu-new");
  v.tap("up");
  check(v.snapshot(isTitleSnapshot).cursor === 0, "Up stays on New game");

  v.tap("space");
  check(v.snapshot(isTitleSnapshot).phase === "intro", "New game shows the intro");
  v.frame("2-intro");
  v.step(30, { space: true });
  v.page.eval("window.__arcade.step(1)");
  s = v.snapshot(isTitleSnapshot);
  check(s.phase === "playing" && s.game?.software === null, "Space on the intro starts the game in the hub", s.phase);
  check(s.game?.arcade.player.x === 80 && s.game.arcade.player.y === 92, "a new game starts at the hub start position");
  check(stored(v)?.player.x === 80, "starting a game writes a save", stored(v));

  v.step(20, { left: true });
  v.tap("escape");
  s = v.snapshot(isTitleSnapshot);
  check(
    s.phase === "paused" && s.items.join() === "RESUME,CONTROLS,QUIT TO MENU",
    "Esc in the hub opens the pause menu",
    s,
  );
  v.frame("3-pause");
  const tick = s.game?.tick;
  v.step(20, { left: true });
  check(v.snapshot(isTitleSnapshot).game?.tick === tick, "the game does not step while paused");

  v.tap("down");
  v.tap("space");
  check(v.snapshot(isTitleSnapshot).phase === "controls", "Controls shows the controls panel");
  v.frame("4-controls");
  v.tap("escape");
  s = v.snapshot(isTitleSnapshot);
  check(s.phase === "paused" && s.cursor === 1, "Esc closes the controls panel, CONTROLS still selected", s);

  v.tap("down");
  v.tap("space");
  s = v.snapshot(isTitleSnapshot);
  check(
    s.phase === "menu" && s.canContinue && s.cursor === 0,
    "Quit to menu returns to the title with Continue selected",
    s,
  );
  check(
    stored(v)?.player.x === 60 && stored(v)?.player.dir === "LEFT",
    "Quit to menu saves the player position",
    stored(v),
  );
  v.frame("5-menu-continue");

  // New game over a save asks first; No keeps the save.
  v.tap("down");
  v.tap("space");
  s = v.snapshot(isTitleSnapshot);
  check(
    s.phase === "confirm" && s.items.join() === "NO,YES" && s.cursor === 0,
    "New game with a save asks to confirm, No selected",
    s,
  );
  v.frame("5b-confirm");
  v.tap("space");
  s = v.snapshot(isTitleSnapshot);
  check(
    s.phase === "menu" && s.cursor === 1 && stored(v)?.player.x === 60,
    "No returns to the menu and keeps the save",
    s,
  );
  v.tap("up");

  // Reload: the save must come back from localStorage.
  v.openHook();
  s = v.snapshot(isTitleSnapshot);
  check(s.phase === "menu" && s.canContinue && s.cursor === 0, "after a reload, Continue is available and selected", s);
  v.tap("space");
  s = v.snapshot(isTitleSnapshot);
  check(
    s.phase === "playing" && s.game?.arcade.player.x === 60 && s.game.arcade.player.dir === "LEFT",
    "Continue restores the position",
    s.game?.arcade.player,
  );

  // Closing the tab saves too.
  v.step(10, { right: true });
  v.page.eval(`window.dispatchEvent(new Event("pagehide"))`);
  check(stored(v)?.player.x === 70, "pagehide saves the current position", stored(v));

  // Into a minigame and out: Esc opens the minigame pause menu, not the hub one.
  v.step(10, { right: true });
  v.step(60, { up: true });
  v.step(2, { space: true });
  v.page.eval("window.__arcade.step(1)");
  check(v.snapshot(isTitleSnapshot).game?.software === "sweetSam", "Space at a cabinet starts its minigame");
  v.frame("6-sweet-sam");
  v.tap("escape");
  s = v.snapshot(isTitleSnapshot);
  check(
    s.phase === "playing" && s.game?.menu === "paused",
    "Esc in a minigame opens the minigame pause menu, not the hub pause menu",
    s.phase,
  );
  v.tap("down");
  v.tap("down");
  v.tap("space");
  s = v.snapshot(isTitleSnapshot);
  check(s.phase === "playing" && s.game?.software === null, "Quit game returns to the hub", s.game?.software);
  v.tap("escape");
  check(v.snapshot(isTitleSnapshot).phase === "paused", "the next Esc opens the hub pause menu");
}

function keyboardChecks(v: Verify): void {
  console.log("keyboard, no test hook:");
  v.open();
  v.page.eval("localStorage.clear()");
  v.open();
  check(
    v.page.eval("String(window.__arcade === undefined)") === "true",
    "the test hook is not installed without ?debug",
  );
  v.screenshot("7-live-menu");
  v.key("Space");
  v.screenshot("8-live-intro");
  check(stored(v) === null, "no save before the game starts");
  v.key("Space");
  check(stored(v)?.player.x === 80, "Space, Space starts a new game (a save appears)", stored(v));
  v.key("ArrowLeft", 300);
  v.key("Escape");
  v.screenshot("9-live-pause");
  v.key("ArrowUp");
  v.key("Space");
  const saved = stored(v);
  check(
    saved !== null && saved.player.x < 80 && saved.player.dir === "LEFT",
    "Esc, Up, Space quits to the menu and saves the walk left",
    saved,
  );
  v.screenshot("10-live-menu-continue");
  v.key("ArrowDown");
  v.key("Space");
  v.screenshot("11-live-confirm");
  v.key("ArrowDown");
  v.key("Space");
  check(
    JSON.stringify(stored(v)) === JSON.stringify(saved),
    "Down, Space, Down, Space (Yes) opens the intro; the save stays until play starts",
  );
  v.key("Space");
  check(stored(v)?.player.x === 80, "Space on the intro starts a new game over the old save", stored(v));
}

function recordContinue(v: Verify): void {
  console.log("video:");
  const save = { v: 1, highScore: 0, player: { x: 60, y: 92, dir: "LEFT" } };
  v.record(
    "continue",
    () => {
      v.wait(1000);
      v.key("Space");
      v.wait(800);
      v.key("ArrowRight", 600);
      v.key("Escape");
      v.wait(1000);
    },
    { storage: { [saveKey]: JSON.stringify(save) } },
  );
  v.page.eval(`window.dispatchEvent(new Event("pagehide")); "ok"`);
  check(stored(v)?.player.dir === "RIGHT", "the recording continued the seeded save and walked right", stored(v));
}

await verify("title", (v) => {
  hookChecks(v);
  keyboardChecks(v);
  recordContinue(v);
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
