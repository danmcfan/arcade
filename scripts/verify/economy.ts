// Tokens, tickets, free play, the minigame pause menu and the payout, in a
// real browser (`bun run verify economy`). Part 1 plays from the title scene
// through the `?debug` test hook: a New game's counts, a cabinet start, the
// minigame pause menu and Quit game. Part 2 replays the sweet-sam-highscore
// fixture's run (seed 21, 560 points) to its payout and checks the count,
// Space to skip and Space to close. Part 3 continues a save with 0 tokens
// and lets the bees end a free play. Part 4 records a full Sweet Sam payout
// in real time. Frames and the video go to out/verify/economy/.

import type { GameSnapshot } from "../../src/game/snapshot.ts";
import type { InputScript } from "../../src/game/script.ts";
import { saveKey } from "../../src/title/save.ts";
import { inputPath, loadScript } from "../../test/parity/fixtures.ts";
import { isRecord } from "../browser.ts";
import { evalJson, isGameSnapshot, isStringArray, isTitleSnapshot, verify, type Verify } from "../harness.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

/** The Game inside the title scene. */
function game(v: Verify): GameSnapshot {
  const g = v.snapshot(isTitleSnapshot).game;
  if (g === null) throw new Error("no game running");
  return g;
}

type Stored = { v: number; tokens: number; tickets: number } | null;

function isStored(x: unknown): x is Stored {
  return (
    x === null ||
    (isRecord(x) && typeof x["v"] === "number" && typeof x["tokens"] === "number" && typeof x["tickets"] === "number")
  );
}

function stored(v: Verify): Stored {
  return evalJson(v.page, `localStorage.getItem(${JSON.stringify(saveKey)}) ?? "null"`, isStored);
}

/** From the hub start position: walk up to the Sweet Sam cabinet and press Space. */
function startSweetSam(v: Verify): void {
  v.step(31, { up: true });
  v.step(1, { up: true, space: true });
  v.step(1);
}

function pauseMenu(v: Verify): void {
  console.log("hub counts and the minigame pause menu (title scene):");
  v.openHook();
  v.page.eval("localStorage.clear()");
  v.openHook();
  v.tap("space"); // New game -> intro
  v.tap("space"); // intro -> hub
  let g = game(v);
  check(
    g.software === null && g.arcade.tokens === 5 && g.arcade.tickets === 0,
    "a New game shows 5 tokens and 0 tickets in the hub",
    g.arcade,
  );
  v.frame("1-hub-new-game");

  startSweetSam(v);
  g = game(v);
  check(
    g.software === "sweetSam" && g.run === "paid" && g.arcade.tokens === 4,
    "starting Sweet Sam spends exactly 1 token",
    g.arcade,
  );
  check(stored(v)?.v === 4 && stored(v)?.tokens === 4, "the spent token is saved at once (save v: 4)", stored(v));
  v.step(150, { left: true });

  v.tap("escape");
  const t = v.snapshot(isTitleSnapshot);
  g = game(v);
  check(
    t.phase === "playing" && g.menu === "paused" && g.cursor === 0,
    "Esc in Sweet Sam opens the minigame pause menu (not the hub pause menu)",
    { phase: t.phase, menu: g.menu },
  );
  v.frame("2-minigame-pause");
  const frozen = JSON.stringify(g.sw);
  v.step(60, { left: true });
  check(JSON.stringify(game(v).sw) === frozen, "the minigame does not advance while the menu is open");

  v.tap("down");
  v.tap("space");
  check(game(v).menu === "controls", "Controls shows the minigame's controls");
  v.frame("3-minigame-controls");
  v.tap("escape");
  g = game(v);
  check(g.menu === "paused" && g.cursor === 1, "Esc backs out of Controls to the pause menu", g);
  v.tap("up");
  v.tap("space");
  check(game(v).menu === null, "Resume closes the menu");
  v.step(1, { left: true });
  const afterResume = game(v).sw;
  check(JSON.stringify(afterResume) !== frozen, "after Resume the minigame carries on");

  v.tap("escape");
  v.tap("escape");
  check(game(v).menu === null, "a second Esc resumes too");

  v.tap("escape");
  v.tap("down");
  v.tap("down");
  v.frame("4-quit-game-no-tickets");
  v.tap("space");
  g = game(v);
  check(g.software === null && g.menu === null && g.payout === null, "Quit game returns to the hub with no payout", g);
  check(
    g.arcade.tokens === 4 && g.arcade.tickets === 0,
    "after Quit game the token stays spent and no tickets are paid",
    g.arcade,
  );
  check(stored(v)?.tokens === 4 && stored(v)?.tickets === 0, "Quit game saves");
  v.frame("5-hub-after-quit");
  v.tap("escape");
  check(v.snapshot(isTitleSnapshot).phase === "paused", "back in the hub, Esc opens the hub pause menu");
}

/** The sweet-sam-highscore fixture up to `tick` (its run ends at 2871 with 560 points). */
function highscoreScript(tick: number): InputScript {
  const script = loadScript(inputPath("sweet-sam-highscore"));
  const steps: InputScript["steps"] = [];
  let left = tick;
  for (const s of script.steps) {
    if (left <= 0) break;
    const n = Math.min(s.ticks, left);
    steps.push({ ...s, ticks: n });
    left -= n;
  }
  return { ...script, steps, captureTicks: [] };
}

function loadHighscore(v: Verify, tick: number): void {
  v.page.eval(
    `(() => { const a = window.__arcade; a.pause(); a.seed(21); a.load("game"); a.runScript(${JSON.stringify(highscoreScript(tick))}); return "ok"; })()`,
  );
}

function payout(v: Verify): void {
  console.log("payout (sweet-sam-highscore run, 560 points):");
  v.openHook("scene=game");
  loadHighscore(v, 2870);
  let g = v.snapshot(isGameSnapshot);
  check(
    g.software === "sweetSam" && g.menu === null && g.arcade.tokens === 4 && g.arcade.tickets === 0,
    "one tick before the run ends: a paid Sweet Sam run",
    g.arcade,
  );
  v.step(1, { up: true });
  g = v.snapshot(isGameSnapshot);
  check(g.menu === "payout" && g.software === "sweetSam", "game over opens the payout over the last frame", g.menu);
  check(g.arcade.highScores.sweetSam === 560, "Sweet Sam's player high score is updated", g.arcade.highScores);
  check(
    g.payout?.score === 560 && g.payout.tickets === 0 && g.payout.total === 5 && g.payout.counting,
    "the payout starts at 560 points and 0 tickets, 5 to pay",
    g.payout,
  );
  v.frame("6-payout-open");
  v.step(25);
  g = v.snapshot(isGameSnapshot);
  check(
    g.payout?.score === 460 && g.payout.tickets === 1,
    "the score spins down by 100 as the tickets spin up by 1",
    g.payout,
  );
  v.frame("7-payout-mid-spin");
  v.page.eval("window.__arcade.sounds()");
  v.step(20);
  check(
    evalJson(v.page, "JSON.stringify(window.__arcade.sounds())", isStringArray).includes("play:ticket"),
    "each ticket plays the ticket sound",
  );
  v.tap("space");
  g = v.snapshot(isGameSnapshot);
  check(
    g.menu === "payout" && g.payout?.score === 0 && g.payout.tickets === 5 && !g.payout.counting,
    "Space skips to the totals",
    g.payout,
  );
  v.frame("8-payout-totals");
  v.tap("space");
  g = v.snapshot(isGameSnapshot);
  check(g.software === null && g.menu === null, "Space again returns to the hub");
  check(
    g.arcade.tickets === 5 && g.arcade.tokens === 4,
    "the hub shows the new ticket total (560 points: 5 tickets)",
    g.arcade,
  );
  v.frame("9-hub-tickets");
}

function upgradeV1(v: Verify): void {
  console.log("a v: 1 save:");
  v.openHook();
  const old = { v: 1, highScore: 300, player: { x: 60, y: 92, dir: "LEFT" } };
  v.page.eval(`localStorage.setItem(${JSON.stringify(saveKey)}, ${JSON.stringify(JSON.stringify(old))}); "ok"`);
  v.openHook();
  v.tap("space"); // Continue
  const g = game(v);
  check(
    Object.values(g.arcade.highScores).every((s) => s === 0) &&
      g.arcade.player.x === 60 &&
      g.arcade.player.dir === "LEFT",
    "Continue from a v: 1 save keeps its position; its one shared high score is dropped (every machine resets to 0)",
    g.arcade,
  );
  check(g.arcade.tokens === 5 && g.arcade.tickets === 0, "and adds 5 tokens and 0 tickets", g.arcade);
  check(stored(v)?.v === 4, "the save is rewritten as v: 4", stored(v));
}

function freePlay(v: Verify): void {
  console.log("free play (title scene, a save with 0 tokens):");
  v.openHook();
  const save = { v: 2, highScore: 0, tokens: 0, tickets: 7, player: { x: 80, y: 92, dir: "DOWN" } };
  v.page.eval(`localStorage.setItem(${JSON.stringify(saveKey)}, ${JSON.stringify(JSON.stringify(save))}); "ok"`);
  v.openHook();
  v.tap("space"); // Continue
  let g = game(v);
  check(g.arcade.tokens === 0 && g.arcade.tickets === 7, "Continue restores 0 tokens and 7 tickets", g.arcade);
  v.frame("10-hub-free-play");
  startSweetSam(v);
  g = game(v);
  check(
    g.software === "sweetSam" && g.run === "free" && g.arcade.tokens === 0,
    "with 0 tokens Sweet Sam still starts, as free play",
    g,
  );
  // Stand still and let the bees end the run.
  for (let n = 0; n < 100 && game(v).menu !== "payout"; n++) v.step(60);
  g = game(v);
  check(
    g.menu === "payout" && g.payout?.freePlay === true && g.payout.total === 0,
    "the free play ends in a payout that pays nothing",
    g.payout,
  );
  check(g.arcade.tickets === 7, "free play adds no tickets", g.arcade);
  v.frame("11-payout-free-play");
  v.tap("space");
  g = game(v);
  check(g.software === null && g.arcade.tickets === 7, "one Space closes the free play payout", g.arcade);
}

function recordPayout(v: Verify): void {
  console.log("video:");
  v.record(
    "sweet-sam-payout",
    () => {
      // Jump to the last life's death animation, then let the page run in real time.
      loadHighscore(v, 2760);
      v.page.eval("window.__arcade.resume(); 'ok'");
      v.wait(2000); // the death animation ends; the payout opens
      v.wait(3000); // 5 tickets count up
      v.key("Space"); // close
      v.wait(1500); // the hub, with 5 tickets
    },
    { scene: "game" },
  );
  const g = v.snapshot(isGameSnapshot);
  check(
    g.software === null && g.arcade.tickets === 5,
    "the recording ran the payout to the hub with 5 tickets",
    g.arcade,
  );
}

await verify("economy", (v) => {
  pauseMenu(v);
  payout(v);
  upgradeV1(v);
  freePlay(v);
  recordPayout(v);
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
