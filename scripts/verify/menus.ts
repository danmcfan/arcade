// The five menus built on Menu (#54) in a real browser (`bun run verify menus`):
// the title menu, the New game check, the hub pause menu, the minigame pause
// menu and the prize counter. Each is framed at a few cursor positions, and
// the sounds every key press makes are written to sounds.json, so a run on
// main and a run on this branch can be compared frame for frame and sound for
// sound. A video walks through the menus in real time. Files go to out/verify/menus/.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { GameSnapshot } from "../../src/game/snapshot.ts";
import { saveKey } from "../../src/title/save.ts";
import { evalJson, isStringArray, isTitleSnapshot, verify, type Verify } from "../harness.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

function game(v: Verify): GameSnapshot {
  const g = v.snapshot(isTitleSnapshot).game;
  if (g === null) throw new Error("no game running");
  return g;
}

/** A save at the hub start position with 60 tickets and the honey jar owned. */
const save = JSON.stringify({
  v: 3,
  highScore: 1200,
  tokens: 2,
  tickets: 60,
  prizes: ["honeyJar"],
  player: { x: 80, y: 92, dir: "DOWN" },
});

/** Each key press and the sounds it made, in order. */
const heard: { key: string; sounds: string[] }[] = [];

function press(v: Verify, key: Parameters<Verify["tap"]>[0]): void {
  evalJson(v.page, "JSON.stringify(window.__arcade.sounds())", isStringArray);
  v.tap(key);
  heard.push({ key, sounds: evalJson(v.page, "JSON.stringify(window.__arcade.sounds())", isStringArray) });
}

function titleMenus(v: Verify): void {
  console.log("title menu and New game check:");
  v.openHook();
  // A headless browser that reports no pointer falls back on the viewport
  // size, and a short one gets the "needs a keyboard" notice instead of the game.
  v.page.run("set", "viewport", "1280", "900");
  v.page.eval("localStorage.clear()");
  v.openHook();
  check(v.snapshot(isTitleSnapshot).items.join() === "NEW GAME", "without a save only New game is listed");
  v.frame("01-title-no-save");
  v.page.eval(`localStorage.setItem(${JSON.stringify(saveKey)}, ${JSON.stringify(save)}); "ok"`);
  v.openHook();
  let s = v.snapshot(isTitleSnapshot);
  check(s.items.join() === "CONTINUE,NEW GAME" && s.cursor === 0, "with a save, Continue is listed first", s);
  v.frame("02-title-continue");
  press(v, "down");
  v.frame("03-title-new-game");
  press(v, "down");
  check(v.snapshot(isTitleSnapshot).cursor === 0, "Down wraps from New game to Continue");
  press(v, "up");
  press(v, "space");
  s = v.snapshot(isTitleSnapshot);
  check(s.phase === "confirm" && s.cursor === 0, "New game over a save asks first, No selected", s);
  v.frame("04-confirm-no");
  press(v, "down");
  v.frame("05-confirm-yes");
  press(v, "escape");
  s = v.snapshot(isTitleSnapshot);
  check(s.phase === "menu" && s.cursor === 1, "Esc goes back with New game still selected", s);
  press(v, "escape");
  check(v.snapshot(isTitleSnapshot).phase === "menu", "Esc on the title menu does nothing");
  press(v, "up");
  press(v, "space");
  check(v.snapshot(isTitleSnapshot).phase === "playing", "Continue starts the game");
}

function hubPause(v: Verify): void {
  console.log("hub pause menu:");
  press(v, "escape");
  check(v.snapshot(isTitleSnapshot).phase === "paused", "Esc in the hub pauses");
  v.frame("06-hub-pause");
  press(v, "up");
  check(v.snapshot(isTitleSnapshot).cursor === 2, "Up wraps to Quit to menu");
  v.frame("07-hub-pause-quit");
  press(v, "up");
  press(v, "space");
  check(v.snapshot(isTitleSnapshot).phase === "controls", "Controls opens the controls panel");
  press(v, "escape");
  check(v.snapshot(isTitleSnapshot).cursor === 1, "back on the pause menu, Controls still selected");
  press(v, "escape");
  check(v.snapshot(isTitleSnapshot).phase === "playing", "Esc resumes");
}

function prizeCounter(v: Verify): void {
  console.log("prize counter:");
  v.step(4, { down: true });
  press(v, "space");
  check(game(v).menu === "prizeCounter", "Space at the desk opens the prize counter");
  check(game(v).cursor === 9, "the prize counter opens on CLOSE");
  v.frame("08-counter-close-selected");
  press(v, "up");
  press(v, "left");
  press(v, "space");
  check(game(v).arcade.tickets === 60, "the owned honey jar can't be bought");
  v.frame("09-counter-owned");
  press(v, "up");
  press(v, "space");
  check(game(v).arcade.tickets === 10, "the running shoes cost 50 tickets");
  v.frame("10-counter-bought");
  press(v, "right");
  press(v, "down");
  press(v, "down");
  check(game(v).cursor === 9, "Down from the foot of the right column reaches CLOSE");
  v.frame("11-counter-close");
  press(v, "space");
  check(game(v).menu === null, "CLOSE goes back to the hub");
}

function minigamePause(v: Verify): void {
  console.log("minigame pause menu:");
  v.step(4, { up: true }); // back to the start position, off the desk
  v.step(31, { up: true });
  v.step(1, { up: true, space: true });
  v.step(1);
  check(game(v).software === "sweetSam", "Sweet Sam starts");
  v.step(60);
  press(v, "escape");
  check(game(v).menu === "paused", "Esc pauses the minigame");
  v.frame("12-minigame-pause");
  press(v, "up");
  check(game(v).cursor === 2, "Up wraps to Quit game");
  v.frame("13-minigame-pause-quit");
  press(v, "up");
  press(v, "space");
  check(game(v).menu === "controls", "Controls shows the minigame's controls");
  press(v, "escape");
  check(game(v).menu === "paused" && game(v).cursor === 1, "back on the pause menu, Controls still selected");
  press(v, "down");
  press(v, "space");
  check(game(v).software === null, "Quit game goes back to the hub");
}

function video(v: Verify): void {
  console.log("video:");
  v.record(
    "walkthrough",
    () => {
      v.wait(600);
      for (const k of ["ArrowDown", "ArrowDown", "ArrowUp", "Space"]) {
        v.key(k);
        v.wait(250);
      }
      v.wait(800);
      v.key("Escape");
      v.wait(800);
      for (const k of ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "Escape"]) {
        v.key(k);
        v.wait(250);
      }
      v.key("ArrowDown", 300);
      v.key("Space");
      v.wait(600);
      for (const k of ["ArrowUp", "ArrowLeft", "ArrowUp", "Space", "ArrowRight", "ArrowDown", "ArrowDown"]) {
        v.key(k);
        v.wait(300);
      }
      v.key("Space");
      v.wait(800);
    },
    { storage: { [saveKey]: save } },
  );
}

await verify("menus", (v) => {
  titleMenus(v);
  hubPause(v);
  prizeCounter(v);
  minigamePause(v);
  writeFileSync(join(v.dir, "sounds.json"), `${JSON.stringify(heard, null, 2)}\n`);
  video(v);
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
