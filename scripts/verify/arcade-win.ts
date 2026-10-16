// The arcade win (#143), in a real browser (`bun run verify arcade-win`).
// Continues a v4 save whose high scores already beat every house high score
// (a save from before the arcade win existed, so it has not had it). The
// next run's payout is the arcade win: Sweet Sam is played until the bees end
// it, and closing the payout brings the hub back with confetti falling, the
// scoreboard's banner, and the placeholder cake and trophy on the prize desk.
// The banner holds, and the player stays put, until Space. Continue then
// restores the cake and trophy with no banner, and another run does not win
// again. A video records the win in real time. Files go to out/verify/arcade-win/.

import { houseHighScores, type HighScores } from "../../src/arcade/wallet.ts";
import type { GameSnapshot } from "../../src/game/snapshot.ts";
import { saveKey } from "../../src/title/save.ts";
import { isRecord } from "../browser.ts";
import { evalJson, isTitleSnapshot, verify, type Verify } from "../harness.ts";

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

type Stored = { v: number; arcadeWon?: unknown } | null;

function isStored(x: unknown): x is Stored {
  return x === null || (isRecord(x) && typeof x["v"] === "number");
}

function stored(v: Verify): Stored {
  return evalJson(v.page, `localStorage.getItem(${JSON.stringify(saveKey)}) ?? "null"`, isStored);
}

/** Every machine just over its house high score. */
const allBeaten: HighScores = {
  sweetSam: houseHighScores.sweetSam + 10,
  firefly: houseHighScores.firefly + 10,
  brassMonkey: houseHighScores.brassMonkey + 10,
};

/** A v4 save at the hub start position (80, 92), facing down, with 3 tokens: no arcade win yet. */
const v4Save = JSON.stringify({
  v: 4,
  highScores: allBeaten,
  tokens: 3,
  tickets: 0,
  prizes: [],
  player: { x: 80, y: 92, dir: "DOWN" },
});

function continueFrom(v: Verify, save: string | null): void {
  v.openHook();
  if (save !== null) v.page.eval(`localStorage.setItem(${JSON.stringify(saveKey)}, ${JSON.stringify(save)}); "ok"`);
  v.openHook();
  v.tap("space"); // Continue
}

/** From the start position: Sweet Sam, standing still until the bees end the run, then close its payout. */
function playSweetSam(v: Verify, won: boolean): void {
  v.step(31, { up: true });
  v.step(1, { up: true, space: true });
  v.step(1);
  check(game(v).software === "sweetSam" && game(v).run === "paid", "Space starts a paid Sweet Sam run", game(v).run);
  let ticks = 0;
  for (; ticks < 6000 && game(v).menu !== "payout"; ticks += 60) v.step(60);
  check(game(v).menu === "payout", `the bees end the run within ${ticks} ticks: its payout opens`, game(v).menu);
  if (!won) check(game(v).arcade.arcadeWin === undefined, "no arcade win during the payout", game(v).arcade);
  v.tap("space"); // skip the count
  v.tap("space"); // close the payout
}

function theWin(v: Verify): void {
  console.log("the arcade win (a v4 save beating every house high score):");
  continueFrom(v, v4Save);
  check(game(v).arcade.arcadeWin === undefined, "a v4 save loads with no arcade win", game(v).arcade);
  check(
    JSON.stringify(game(v).arcade.highScores) === JSON.stringify(allBeaten) && game(v).arcade.tokens === 3,
    "and keeps its high scores and tokens",
    game(v).arcade,
  );
  v.frame("1-hub-before");
  playSweetSam(v, false);
  let g = game(v);
  check(g.software === null && g.arcade.arcadeWin === "banner", "back in the hub: the arcade win, banner up", g);
  check(stored(v)?.arcadeWon === true && stored(v)?.v === 5, "the save records it at once, as v5", stored(v));
  v.frame("2-win-confetti-start");
  v.step(60);
  v.frame("3-win-confetti-falling");
  v.step(120);
  v.frame("4-win-confetti-more");
  const at = game(v).arcade.player;
  v.step(240, { down: true });
  g = game(v);
  check(
    g.arcade.arcadeWin === "banner" && g.arcade.player.x === at.x && g.arcade.player.y === at.y,
    "the banner holds and the player stays put while the arrows are held",
    g.arcade,
  );
  v.frame("5-banner-holds-confetti-gone");
  v.tap("space");
  check(game(v).arcade.arcadeWin === "won", "Space closes the banner", game(v).arcade.arcadeWin);
  v.step(40, { down: true });
  check(game(v).arcade.player.y > at.y, "and the player walks again", game(v).arcade.player);
  v.frame("6-after-banner");
}

function afterwards(v: Verify): void {
  console.log("Continue after the win:");
  continueFrom(v, null);
  check(game(v).arcade.arcadeWin === "won", "Continue restores the arcade win, with no banner", game(v).arcade);
  v.frame("7-continue-cake-trophy");
  continueFrom(v, JSON.stringify({ ...JSON.parse(v4Save), v: 5, arcadeWon: true }));
  playSweetSam(v, true);
  check(game(v).arcade.arcadeWin === "won", "another run does not win again: no banner", game(v).arcade);
}

function video(v: Verify): void {
  console.log("video:");
  v.record(
    "arcade-win",
    () => {
      v.wait(800);
      v.key("Space"); // Continue
      v.wait(600);
      v.key("ArrowUp", 700);
      v.key("Space"); // Sweet Sam: stand still until the bees end it
      v.wait(1000);
      for (let n = 0; n < 60 && game(v).menu !== "payout"; n++) v.wait(1000);
      v.wait(2500); // the count (a ticket or two) finishes
      v.key("Space"); // close the payout: the arcade win
      v.wait(5000);
      v.key("ArrowDown", 600); // the banner holds
      v.wait(1500);
      v.key("Space"); // closes it
      v.wait(500);
      v.key("ArrowLeft", 500);
      v.wait(1000);
    },
    { storage: { [saveKey]: v4Save } },
  );
}

await verify("arcade-win", (v) => {
  // A browser that reports no pointer kind gets the keyboard notice below a
  // 768 px short side (src/engine/device.ts); 720 px headless would show it.
  v.open();
  v.page.run("set", "viewport", "1280", "800");
  theWin(v);
  afterwards(v);
  video(v);
  v.assertNoErrors();
  console.log(`${checks} checks passed`);
});
