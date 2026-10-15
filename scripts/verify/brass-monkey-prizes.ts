// Brass Monkey prizes (#40) in a real browser (`bun run verify brass-monkey-prizes`).
// Part 1 drives the `?debug` test hook from the title scene: Continue a save
// with 175 tickets and no prizes, buy the oil can, spring boots and pocket
// watch at the prize counter (saved at once), see their decorations on the
// wall around the Brass Monkey cabinet, then walk past them (not solid) and
// start Brass Monkey: 4 lives, a 19.125 px jump and a bonus that drops every
// 180 ticks. Part 2 starts Brass Monkey with no prizes: 3 lives, a 15 px
// jump, a step every 120 ticks. Part 3 records buying the oil can and the run
// it helps. Files go to out/verify/brass-monkey-prizes/.

import type { BrassMonkeySnapshot, GameSnapshot } from "../../src/game/snapshot.ts";
import { isPrizeId, type PrizeId } from "../../src/arcade/prizes.ts";
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

function isBrassMonkeySnapshot(x: unknown): x is BrassMonkeySnapshot {
  return isRecord(x) && typeof x["lives"] === "number" && typeof x["bonus"] === "number" && Array.isArray(x["bolts"]);
}

function monkey(v: Verify): BrassMonkeySnapshot {
  const g = game(v);
  if (g.software !== "brassMonkey" || !isBrassMonkeySnapshot(g.sw))
    throw new Error(`not in Brass Monkey: ${g.software}`);
  return g.sw;
}

type Stored = { tickets: number; prizes: PrizeId[] } | null;

function isStored(x: unknown): x is Stored {
  if (x === null) return true;
  if (!isRecord(x) || typeof x["tickets"] !== "number") return false;
  const prizes = x["prizes"];
  return Array.isArray(prizes) && prizes.every((p) => isPrizeId(p));
}

function stored(v: Verify): Stored {
  return evalJson(v.page, `localStorage.getItem(${JSON.stringify(saveKey)}) ?? "null"`, isStored);
}

/** A v3 save at the hub start position (80, 92), facing down. */
function save(tickets: number, prizes: PrizeId[]): string {
  return JSON.stringify({ v: 3, highScore: 0, tokens: 2, tickets, prizes, player: { x: 80, y: 92, dir: "DOWN" } });
}

function continueWith(v: Verify, tickets: number, prizes: PrizeId[]): void {
  v.openHook();
  v.page.eval(`localStorage.setItem(${JSON.stringify(saveKey)}, ${JSON.stringify(save(tickets, prizes))}); "ok"`);
  v.openHook();
  v.tap("space"); // Continue
}

/** From the start position, walk left to the Brass Monkey cabinet, up to it and press Space. */
function startBrassMonkey(v: Verify): void {
  v.step(40, { left: true });
  v.step(40, { up: true });
  v.step(1, { up: true, space: true });
  v.step(1);
}

/** Jump on the flat bottom girder: how far the monkey rises, and its lives after landing. */
function jump(v: Verify, shot: string): { rise: number; lives: number } {
  const y0 = monkey(v).y;
  let top = y0;
  v.step(1, { space: true });
  for (let n = 0; n < 60 && monkey(v).footing === "air"; n++) {
    top = Math.min(top, monkey(v).y);
    if (n === 15) v.frame(shot);
    v.step(1);
  }
  return { rise: y0 - top, lives: monkey(v).lives };
}

/** Ticks between two steps down of the bonus. */
function bonusStepTicks(v: Verify): number {
  const until = (): number => {
    const start = monkey(v).bonus;
    let n = 0;
    while (monkey(v).bonus === start && n < 400) {
      v.step(1);
      n++;
    }
    return n;
  };
  until();
  return until();
}

function buyAll(v: Verify): void {
  console.log("buy the Brass Monkey prizes (title scene, 175 tickets, no prizes):");
  continueWith(v, 175, []);
  v.frame("1-hub-no-prizes");
  v.step(4, { down: true });
  v.tap("space");
  check(game(v).menu === "prizeCounter", "Space facing the desk opens the prize counter menu", game(v).menu);
  v.tap("up");
  check(game(v).cursor === 6, "Up from BUY TOKEN selects the oil can, bottom of the left column", game(v).cursor);
  v.frame("2-menu-oil-can");
  v.tap("space");
  v.tap("up");
  v.tap("space");
  v.tap("up");
  v.tap("space");
  const a = game(v).arcade;
  check(
    a.tickets === 0 && JSON.stringify(a.prizes) === '["oilCan","springBoots","pocketWatch"]',
    "the oil can (25), spring boots (50) and pocket watch (100) are bought: 0 tickets left",
    a,
  );
  const s = stored(v);
  check(JSON.stringify(s?.prizes) === '["oilCan","springBoots","pocketWatch"]', "and saved at once", s);
  v.frame("3-menu-all-owned");
  v.tap("escape");
  v.step(4, { up: true });
  v.frame("4-hub-brass-monkey-prizes");

  // Walk along the cabinets past the oil can's shelf: nothing stops the player.
  v.step(36, { up: true });
  const y = game(v).arcade.player.y;
  v.step(48, { left: true });
  v.step(48, { right: true });
  const p = game(v).arcade.player;
  check(p.x === 80 && p.y === y, "the player walks along the cabinets under the decorations (not solid)", p);
  v.step(36, { down: true });

  startBrassMonkey(v);
  check(monkey(v).lives === 4, "Brass Monkey starts with 4 lives with the oil can", monkey(v).lives);
  v.frame("5-brass-monkey-4-lives");
  check(bonusStepTicks(v) === 180, "the bonus drops a step every 180 ticks with the pocket watch", monkey(v).bonus);
  const j = jump(v, "6-brass-monkey-spring-jump");
  check(j.rise === 19.125 && j.lives === 4, "the spring boots jump rises 19.125 px and lands safely", j);
}

function noPrizes(v: Verify): void {
  console.log("no prizes (title scene):");
  continueWith(v, 0, []);
  startBrassMonkey(v);
  check(monkey(v).lives === 3, "Brass Monkey starts with 3 lives", monkey(v).lives);
  check(bonusStepTicks(v) === 120, "the bonus drops a step every 120 ticks", monkey(v).bonus);
  const j = jump(v, "7-brass-monkey-plain-jump");
  check(j.rise === 15 && j.lives === 3, "a plain jump rises 15 px", j);
}

/** Walk down to the counter, buy the oil can, walk over and start Brass Monkey. */
function buyAndPlay(v: Verify): void {
  v.wait(800);
  v.key("Space"); // Continue
  v.wait(600);
  v.key("ArrowDown", 200); // into the counter
  v.wait(300);
  v.key("Space"); // open
  v.wait(600);
  v.key("ArrowUp"); // to the oil can
  v.wait(500);
  v.key("Space"); // buy
  v.wait(1200);
  v.key("Escape");
  v.wait(600);
  v.key("ArrowLeft", 750);
  v.key("ArrowUp", 900); // to the Brass Monkey cabinet, under the oil can
  v.wait(1200);
  v.key("Space"); // start Brass Monkey
  v.wait(1500);
  v.key("Space"); // jump
  v.wait(2000);
}

function videos(v: Verify): void {
  console.log("video:");
  v.record(
    "buy-oil-can",
    () => {
      buyAndPlay(v);
    },
    { storage: { [saveKey]: save(60, []) } },
  );
  const g = game(v);
  check(JSON.stringify(g.arcade.prizes) === '["oilCan"]', "the video bought the oil can", g.arcade);
  check(
    g.software === "brassMonkey" && isBrassMonkeySnapshot(g.sw) && g.sw.lives === 4,
    "and started Brass Monkey with 4 lives",
    g.software,
  );
}

await verify("brass-monkey-prizes", (v) => {
  buyAll(v);
  noPrizes(v);
  videos(v);
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
