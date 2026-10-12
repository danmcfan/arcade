// End-to-end check of the title screen, intro, pause menu and save, in a
// real browser through agent-browser. Start the dev server first:
//
//   ARCADE_PORT=3002 bun run dev &
//   ARCADE_PORT=3002 bun run check:title
//
// Part 1 drives the `?debug` test hook tick by tick and asserts on the title
// snapshot and on localStorage, including reloads (the real save path) and
// `pagehide`. Part 2 opens the page without `?debug` and plays it with
// keyboard events through the page's own keyboard handling and rAF loop.
// Frames and screenshots go to out/title/ for a person to look at.
// Exits non-zero on the first failed check.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { saveKey } from "../src/title/save.ts";
import type { TitleSnapshot } from "../src/game/snapshot.ts";
import { repoRoot } from "../test/parity/fixtures.ts";
import { browser, decodeDataUrl } from "./browser.ts";
import { ARCADE_PORT, ARCADE_URL } from "./config.ts";

const outDir = join(repoRoot, "out/title");
const page = browser(`arcade-title-${ARCADE_PORT}`);
let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

function open(query: string): void {
  page.run("open", `${ARCADE_URL}/${query}`);
  page.run("wait", "--fn", "document.getElementById('screen').width > 0");
}

/** Open with the test hook and stop the loop so only `step()` advances the game. */
function openHook(): void {
  open("?debug");
  page.run("wait", "--fn", "window.__arcade !== undefined");
  page.eval("window.__arcade.pause()");
}

function snap(): TitleSnapshot {
  return JSON.parse(page.eval("JSON.stringify(window.__arcade.snapshot())")) as TitleSnapshot;
}

/** Hold `key` for one tick, then release it for one tick. */
function tap(key: string): void {
  page.eval(`window.__arcade.step(1, { ${key}: true }); window.__arcade.step(1)`);
}

function hold(key: string, ticks: number): void {
  page.eval(`window.__arcade.step(${ticks}, { ${key}: true })`);
}

function stored(): { highScore: number; player: { x: number; y: number; dir: string } } | null {
  return JSON.parse(page.eval(`localStorage.getItem(${JSON.stringify(saveKey)}) ?? "null"`)) as ReturnType<typeof stored>;
}

function frame(name: string): void {
  writeFileSync(join(outDir, `${name}.png`), decodeDataUrl(page.eval("window.__arcade.frame()")));
}

/** A real keydown, held for `ms` so several ticks see it, then keyup. */
function key(code: string, ms = 120): void {
  page.eval(
    `(async () => {
      window.dispatchEvent(new KeyboardEvent("keydown", { code: ${JSON.stringify(code)} }));
      await new Promise((r) => setTimeout(r, ${ms}));
      window.dispatchEvent(new KeyboardEvent("keyup", { code: ${JSON.stringify(code)} }));
      await new Promise((r) => setTimeout(r, 60));
      return "ok";
    })()`,
  );
}

function screenshot(name: string): void {
  page.run("screenshot", join(outDir, `${name}.png`));
}

function hookChecks(): void {
  console.log("test hook (?debug):");
  openHook();
  page.eval("localStorage.clear()");
  openHook();

  let s = snap();
  check(s.phase === "menu" && s.cursor === 0 && !s.canContinue, "opens on the title menu, New game selected, no Continue", s);
  frame("1-menu-new");
  tap("down");
  check(snap().cursor === 0, "Down cannot select a disabled Continue");

  tap("space");
  check(snap().phase === "intro", "New game shows the intro");
  frame("2-intro");
  hold("space", 30);
  page.eval("window.__arcade.step(1)");
  s = snap();
  check(s.phase === "playing" && s.game?.software === null, "Space on the intro starts the game in the hub", s.phase);
  check(s.game?.arcade.player.x === 80 && s.game.arcade.player.y === 92, "a new game starts at the hub start position");
  check(stored()?.player.x === 80, "starting a game writes a save", stored());

  hold("left", 20);
  tap("escape");
  s = snap();
  check(s.phase === "paused" && s.items.join() === "RESUME,CONTROLS,QUIT TO MENU", "Esc in the hub opens the pause menu", s);
  frame("3-pause");
  const tick = s.game?.tick;
  hold("left", 20);
  check(snap().game?.tick === tick, "the game does not step while paused");

  tap("down");
  tap("space");
  check(snap().phase === "controls", "Controls shows the controls panel");
  frame("4-controls");
  tap("escape");
  s = snap();
  check(s.phase === "paused" && s.cursor === 1, "Esc closes the controls panel, CONTROLS still selected", s);

  tap("down");
  tap("space");
  s = snap();
  check(s.phase === "menu" && s.canContinue && s.cursor === 1, "Quit to menu returns to the title with Continue selected", s);
  check(stored()?.player.x === 60 && stored()?.player.dir === "LEFT", "Quit to menu saves the player position", stored());
  frame("5-menu-continue");

  // Reload: the save must come back from localStorage.
  openHook();
  s = snap();
  check(s.phase === "menu" && s.canContinue && s.cursor === 1, "after a reload, Continue is available and selected", s);
  tap("space");
  s = snap();
  check(s.phase === "playing" && s.game?.arcade.player.x === 60 && s.game.arcade.player.dir === "LEFT", "Continue restores the position", s.game?.arcade.player);

  // Closing the tab saves too.
  hold("right", 10);
  page.eval(`window.dispatchEvent(new Event("pagehide"))`);
  check(stored()?.player.x === 70, "pagehide saves the current position", stored());

  // Into a minigame and out: Esc leaves the minigame and does not open the pause menu.
  hold("right", 10);
  hold("up", 60);
  hold("space", 2);
  page.eval("window.__arcade.step(1)");
  check(snap().game?.software === "hive", "Space at a cabinet starts its minigame");
  frame("6-hive");
  hold("escape", 20);
  page.eval("window.__arcade.step(1)");
  s = snap();
  check(s.phase === "playing" && s.game?.software === null, "Esc in a minigame returns to the hub, not the pause menu", s.phase);
  tap("escape");
  check(snap().phase === "paused", "the next Esc opens the pause menu");
}

function keyboardChecks(): void {
  console.log("keyboard, no test hook:");
  open("");
  page.eval("localStorage.clear()");
  open("");
  check(page.eval("String(window.__arcade === undefined)") === "true", "the test hook is not installed without ?debug");
  screenshot("7-live-menu");
  key("Space");
  screenshot("8-live-intro");
  check(stored() === null, "no save before the game starts");
  key("Space");
  check(stored()?.player.x === 80, "Space, Space starts a new game (a save appears)", stored());
  key("ArrowLeft", 300);
  key("Escape");
  screenshot("9-live-pause");
  key("ArrowUp");
  key("Space");
  const saved = stored();
  check(saved !== null && saved.player.x < 80 && saved.player.dir === "LEFT", "Esc, Up, Space quits to the menu and saves the walk left", saved);
  screenshot("10-live-menu-continue");
}

if (import.meta.main) {
  mkdirSync(outDir, { recursive: true });
  try {
    hookChecks();
    keyboardChecks();
    console.log(`\n${checks} checks passed. Frames: ${outDir}`);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    page.run("close");
  }
}
