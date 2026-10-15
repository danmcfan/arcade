// The prize counter (#21) in a real browser (`bun run verify prize-counter`).
// Part 1 drives the `?debug` test hook from the title scene: Continue a save
// with 2 tokens and 12 tickets, check that the prize desk is solid and that
// Space only opens its menu when facing it, buy a token at the normal price
// (the scoreboard and the save update at once), close the menu and Continue again. Part 2
// Continues a save with 0 tokens and 3 tickets, buys the last-chance token and
// then finds the next token greyed out with the "no" sound. Part 3 records
// both purchases in real time. Files go to out/verify/prize-counter/.

import type { GameSnapshot } from "../../src/game/snapshot.ts";
import { saveKey } from "../../src/title/save.ts";
import { isRecord } from "../browser.ts";
import { evalJson, isStringArray, isTitleSnapshot, verify, type Verify } from "../harness.ts";

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

function wallet(v: Verify): { tokens: number; tickets: number } {
  const a = game(v).arcade;
  return { tokens: a.tokens, tickets: a.tickets };
}

type Stored = { tokens: number; tickets: number } | null;

function isStored(x: unknown): x is Stored {
  return x === null || (isRecord(x) && typeof x["tokens"] === "number" && typeof x["tickets"] === "number");
}

function stored(v: Verify): Stored {
  return evalJson(v.page, `localStorage.getItem(${JSON.stringify(saveKey)}) ?? "null"`, isStored);
}

/** A save at the hub start position (80, 92), facing down. */
function save(tokens: number, tickets: number): string {
  return JSON.stringify({ v: 2, highScore: 0, tokens, tickets, player: { x: 80, y: 92, dir: "DOWN" } });
}

/** Open the title scene with this save and Continue. */
function continueWith(v: Verify, tokens: number, tickets: number): void {
  v.openHook();
  v.page.eval(`localStorage.setItem(${JSON.stringify(saveKey)}, ${JSON.stringify(save(tokens, tickets))}); "ok"`);
  v.openHook();
  v.tap("space"); // Continue
}

function sounds(v: Verify): string[] {
  return evalJson(v.page, "JSON.stringify(window.__arcade.sounds())", isStringArray);
}

function normalPrice(v: Verify): void {
  console.log("a token at the normal price (title scene, 2 tokens, 12 tickets):");
  continueWith(v, 2, 12);
  check(
    game(v).menu === null && JSON.stringify(wallet(v)) === '{"tokens":2,"tickets":12}',
    "Continue restores 2 tokens and 12 tickets",
    wallet(v),
  );
  v.frame("1-hub-counter");

  v.tap("space");
  check(game(v).menu === null, "Space at the start position (not at the counter) opens nothing", game(v).menu);

  v.step(30, { down: true });
  check(game(v).arcade.player.y === 95, "walking down stops at the prize desk: it is solid", game(v).arcade.player);
  v.step(60, { left: true });
  v.step(20, { down: true });
  check(
    game(v).arcade.player.x === 32 && game(v).arcade.player.y === 95,
    "the desk spans the floor to the left wall: there is no way round it",
    game(v).arcade.player,
  );
  v.step(48, { right: true }); // x 80
  v.step(10, { down: true }); // y 95
  check(
    game(v).arcade.player.x === 80 && game(v).arcade.player.y === 95,
    "back above the middle of the desk, facing it",
    game(v).arcade.player,
  );

  v.tap("space");
  let g = game(v);
  check(
    g.menu === "prizeCounter" && g.cursor === 9 && g.software === null,
    "Space facing the counter opens the prize counter menu",
    g,
  );
  v.frame("2-menu-normal-price");

  sounds(v);
  v.tap("space");
  check(
    JSON.stringify(wallet(v)) === '{"tokens":3,"tickets":7}',
    "Space buys a token for 5 tickets: 3 tokens, 7 tickets",
    wallet(v),
  );
  check(sounds(v).includes("play:select"), "the purchase chirps");
  check(stored(v)?.tokens === 3 && stored(v)?.tickets === 7, "the purchase is saved at once", stored(v));
  v.frame("3-bought-normal-price");

  v.tap("escape");
  g = game(v);
  check(
    g.menu === null && v.snapshot(isTitleSnapshot).phase === "playing",
    "Esc closes the menu (not the hub pause menu)",
    g.menu,
  );
  v.tap("escape");
  check(v.snapshot(isTitleSnapshot).phase === "paused", "the next Esc opens the hub pause menu");

  v.openHook();
  v.tap("space"); // Continue
  check(
    JSON.stringify(wallet(v)) === '{"tokens":3,"tickets":7}',
    "Continue after a reload shows 3 tokens and 7 tickets",
    wallet(v),
  );
}

function lastChance(v: Verify): void {
  console.log("the last-chance token (title scene, 0 tokens, 3 tickets):");
  continueWith(v, 0, 3);
  v.step(4, { down: true });
  v.tap("space");
  check(game(v).menu === "prizeCounter", "the menu opens", game(v).menu);
  v.frame("4-menu-last-chance");
  v.tap("space");
  check(
    JSON.stringify(wallet(v)) === '{"tokens":1,"tickets":0}',
    "the last-chance token takes all 3 tickets: 1 token, 0 tickets",
    wallet(v),
  );
  v.frame("5-bought-last-chance");

  sounds(v);
  v.tap("space");
  check(
    JSON.stringify(wallet(v)) === '{"tokens":1,"tickets":0}',
    "with a token and 0 tickets the next one can't be bought",
    wallet(v),
  );
  check(sounds(v).includes("play:deny"), "and Space on it plays the no sound");
  v.tap("right"); // BUY TOKEN to CLOSE
  v.tap("space");
  check(game(v).menu === null, "CLOSE closes the menu", game(v).menu);
  check(stored(v)?.tokens === 1 && stored(v)?.tickets === 0, "the save holds 1 token and 0 tickets", stored(v));
}

/** Walk down to the counter, open it, buy, then close with CLOSE (Right from BUY TOKEN). */
function buyOnVideo(v: Verify): void {
  v.wait(800);
  v.key("Space"); // Continue
  v.wait(600);
  v.key("ArrowDown", 400); // into the counter
  v.wait(400);
  v.key("Space"); // open
  v.wait(1200);
  v.key("Space"); // buy
  v.wait(1500);
  v.key("Space"); // a second try: another token, or the no sound
  v.wait(1200);
  v.key("ArrowRight"); // BUY TOKEN to CLOSE
  v.wait(400);
  v.key("Space"); // CLOSE
  v.wait(1000);
}

function videos(v: Verify): void {
  console.log("videos:");
  v.record(
    "normal-price",
    () => {
      buyOnVideo(v);
    },
    { storage: { [saveKey]: save(2, 12) } },
  );
  check(
    JSON.stringify(wallet(v)) === '{"tokens":4,"tickets":2}',
    "the normal-price video bought two tokens: 4 tokens, 2 tickets",
    wallet(v),
  );
  v.record(
    "last-chance",
    () => {
      buyOnVideo(v);
    },
    { storage: { [saveKey]: save(0, 3) } },
  );
  check(
    JSON.stringify(wallet(v)) === '{"tokens":1,"tickets":0}',
    "the last-chance video bought one token for all 3 tickets",
    wallet(v),
  );
}

await verify("prize-counter", (v) => {
  normalPrice(v);
  lastChance(v);
  videos(v);
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
