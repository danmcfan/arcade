// The change machine (#144) in a real browser (`bun run verify change-machine`).
// Part 1 drives the `?debug` test hook from the title scene: Continue a save
// with 2 tokens and 12 tickets just under the machine, check that it is solid
// and that the board reads CHANGE MACHINE and its price while the player
// faces it, trade twice (the scoreboard and the save update at once), then
// find the third press denied with the "no" sound and the price blinking.
// Part 2 Continues a save with 0 tokens and 3 tickets and takes the
// last-chance token (the board reads LAST CHANCE). Part 3 checks the prize
// counter no longer sells tokens. Part 4 takes stills and records both in real
// time. Files go
// to out/verify/change-machine/.

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

function wallet(v: Verify): string {
  const a = game(v).arcade;
  return JSON.stringify({ tokens: a.tokens, tickets: a.tickets });
}

type Stored = { tokens: number; tickets: number } | null;

function isStored(x: unknown): x is Stored {
  return x === null || (isRecord(x) && typeof x["tokens"] === "number" && typeof x["tickets"] === "number");
}

function stored(v: Verify): Stored {
  return evalJson(v.page, `localStorage.getItem(${JSON.stringify(saveKey)}) ?? "null"`, isStored);
}

/** A save a few steps under the change machine (x 144-160, y 40-56), facing up. */
function save(tokens: number, tickets: number): string {
  return JSON.stringify({ v: 2, highScore: 0, tokens, tickets, player: { x: 152, y: 80, dir: "UP" } });
}

/** Open the title scene with this save, Continue, and walk up to the machine. */
function continueWith(v: Verify, tokens: number, tickets: number): void {
  v.openHook();
  v.page.eval(`localStorage.setItem(${JSON.stringify(saveKey)}, ${JSON.stringify(save(tokens, tickets))}); "ok"`);
  v.openHook();
  v.key("ShiftLeft"); // dismisses the keyboard notice if this browser looks touch-first; nothing on the title
  v.tap("space"); // Continue
  v.step(30, { up: true });
  v.step(2);
}

function sounds(v: Verify): string[] {
  return evalJson(v.page, "JSON.stringify(window.__arcade.sounds())", isStringArray);
}

function trades(v: Verify): void {
  console.log("trades and a denied trade (2 tokens, 12 tickets):");
  continueWith(v, 2, 12);
  const p = game(v).arcade.player;
  check(p.x === 152 && p.y === 68, "walking up stops under the change machine: it is solid", p);
  check(game(v).arcade.faced === "changeMachine", "facing it, the board names the change machine", game(v).arcade);

  sounds(v);
  v.tap("space");
  check(
    wallet(v) === '{"tokens":3,"tickets":7}',
    "a press trades 5 tickets for a token: 3 tokens, 7 tickets",
    wallet(v),
  );
  check(sounds(v).includes("play:select"), "the trade chirps");
  check(game(v).menu === null, "there is no menu");
  check(stored(v)?.tokens === 3 && stored(v)?.tickets === 7, "the trade is saved at once", stored(v));
  v.tap("space");
  check(wallet(v) === '{"tokens":4,"tickets":2}', "a second press trades again: 4 tokens, 2 tickets", wallet(v));

  sounds(v);
  v.tap("space");
  check(wallet(v) === '{"tokens":4,"tickets":2}', "with 2 tickets and tokens left, a press trades nothing", wallet(v));
  check(sounds(v).includes("play:deny"), "and plays the no sound");
  check(game(v).arcade.notice === "price", "the price blinks on the board", game(v).arcade);
  v.step(8);

  v.step(10, { down: true });
  check(game(v).arcade.faced === null, "walking away, the board shows the counts again", game(v).arcade);
}

function lastChance(v: Verify): void {
  console.log("the last-chance token (0 tokens, 3 tickets):");
  continueWith(v, 0, 3);
  v.tap("space");
  check(
    wallet(v) === '{"tokens":1,"tickets":0}',
    "the last-chance token takes all 3 tickets: 1 token, 0 tickets",
    wallet(v),
  );
  check(game(v).arcade.notice === "lastChance", "the board reads LAST CHANCE", game(v).arcade);
  sounds(v);
  v.tap("space");
  check(wallet(v) === '{"tokens":1,"tickets":0}', "with a token and 0 tickets the next press is denied", wallet(v));
  check(sounds(v).includes("play:deny"), "with the no sound");
  check(stored(v)?.tokens === 1 && stored(v)?.tickets === 0, "the save holds 1 token and 0 tickets", stored(v));
}

function noTokenAtCounter(v: Verify): void {
  console.log("the prize counter sells no token:");
  continueWith(v, 2, 12);
  v.step(40, { left: true });
  v.step(40, { down: true });
  v.step(2);
  check(game(v).arcade.faced === "prizeCounter", "at the prize desk", game(v).arcade);
  v.tap("space");
  check(game(v).menu === "prizeCounter" && game(v).cursor === 9, "the menu opens on CLOSE", game(v));
  v.tap("space");
  check(
    game(v).menu === null && wallet(v) === '{"tokens":2,"tickets":12}',
    "CLOSE closes it; nothing bought",
    wallet(v),
  );
}

/** Stills from the real loop: under the paused hook a touch-first browser's keyboard notice never clears. */
function stills(v: Verify, name: string, tokens: number, tickets: number): void {
  v.open();
  v.page.eval(`localStorage.setItem(${JSON.stringify(saveKey)}, ${JSON.stringify(save(tokens, tickets))}); "ok"`);
  v.open();
  v.wait(500);
  v.key("ShiftLeft"); // the keyboard notice, if any
  v.key("Space"); // Continue
  v.wait(500);
  v.key("ArrowUp", 400);
  v.wait(300);
  v.screenshot(`${name}-1-facing`);
  v.key("Space");
  v.wait(100);
  v.screenshot(`${name}-2-pressed`);
  v.key("Space");
  v.wait(100);
  v.screenshot(`${name}-3-pressed-again`);
}

/** Continue, walk up to the machine, and press it three times. */
function pressOnVideo(v: Verify): void {
  v.wait(800);
  v.key("ShiftLeft"); // the keyboard notice, if any
  v.wait(400);
  v.key("Space"); // Continue
  v.wait(600);
  v.key("ArrowUp", 400); // face the machine: CHANGE MACHINE, 5 TICKETS = 1 TOKEN
  v.wait(1200);
  for (let i = 0; i < 3; i++) {
    v.key("Space"); // a trade, LAST CHANCE, or denied with the price blinking
    v.wait(1500);
  }
  v.key("ArrowDown", 300); // away: the counts
  v.wait(1000);
}

function videos(v: Verify): void {
  console.log("videos:");
  v.record(
    "trade-and-denied",
    () => {
      pressOnVideo(v);
    },
    { storage: { [saveKey]: save(2, 12) } },
  );
  check(wallet(v) === '{"tokens":4,"tickets":2}', "the trade video traded twice, then was denied", wallet(v));
  v.record(
    "last-chance",
    () => {
      pressOnVideo(v);
    },
    { storage: { [saveKey]: save(0, 3) } },
  );
  check(wallet(v) === '{"tokens":1,"tickets":0}', "the last-chance video took one token for all 3 tickets", wallet(v));
}

await verify("change-machine", (v) => {
  trades(v);
  lastChance(v);
  noTokenAtCounter(v);
  stills(v, "trade", 1, 7); // a trade, then denied with the price blinking
  stills(v, "last-chance", 0, 3);
  videos(v);
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
