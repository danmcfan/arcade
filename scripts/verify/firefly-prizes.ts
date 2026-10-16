// Firefly prizes (#35) in a real browser (`bun run verify firefly-prizes`).
// Part 1 drives the `?debug` test hook from the title scene: Continue a save
// with 60 tickets and no prizes, buy the lantern at the prize counter (25
// tickets, saved at once), see it hang on the wall by the Firefly cabinet,
// and start Firefly with 4 lives. Part 2 Continues a save that owns all three
// Firefly prizes: every decoration hangs on the wall, and Firefly starts with
// 4 lives, 3 sparks at once and the faster firefly. Part 3 records the
// lantern purchase and the run it helps. Files go to out/verify/firefly-prizes/.

import type { FireflySnapshot, GameSnapshot } from "../../src/game/snapshot.ts";
import { wingsPlayerSpeed } from "../../src/firefly/advantages.ts";
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

function isFireflySnapshot(x: unknown): x is FireflySnapshot {
  return isRecord(x) && typeof x["lives"] === "number" && Array.isArray(x["sparks"]) && isRecord(x["player"]);
}

function firefly(v: Verify): FireflySnapshot {
  const g = game(v);
  if (g.software !== "firefly" || !isFireflySnapshot(g.sw)) throw new Error(`not in Firefly: ${g.software}`);
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

/** From the start position, walk up and right to the Firefly cabinet and press Space. */
function startFirefly(v: Verify): void {
  v.step(40, { up: true });
  v.step(40, { right: true });
  v.step(1, { up: true, space: true });
  v.step(1);
}

function buyLantern(v: Verify): void {
  console.log("buy the lantern (title scene, 60 tickets, no prizes):");
  continueWith(v, 60, []);
  check(game(v).arcade.tickets === 60 && game(v).arcade.prizes === undefined, "Continue: 60 tickets, no prizes");
  v.step(4, { up: true });
  v.frame("1-hub-no-prizes");
  v.step(4, { down: true });

  v.step(4, { down: true });
  v.tap("space");
  check(game(v).menu === "prizeCounter", "Space facing the counter opens the prize counter menu", game(v).menu);
  v.tap("up");
  check(game(v).cursor === 8, "Up from CLOSE selects the lantern, bottom of the right column", game(v).cursor);
  v.frame("2-menu-firefly-prizes");

  v.tap("space");
  const a = game(v).arcade;
  check(
    a.tickets === 35 && JSON.stringify(a.prizes) === '["lantern"]',
    "Space buys the lantern for 25 tickets: 35 left",
    a,
  );
  const s = stored(v);
  check(s?.tickets === 35 && JSON.stringify(s.prizes) === '["lantern"]', "the purchase is saved at once", s);
  v.frame("3-menu-lantern-owned");

  v.tap("escape");
  v.step(4, { up: true });
  v.frame("4-hub-lantern");

  startFirefly(v);
  check(firefly(v).lives === 4, "Firefly starts with 4 lives with the lantern", firefly(v).lives);
  v.step(30);
  v.frame("5-firefly-4-lives");
}

function allPrizes(v: Verify): void {
  console.log("all three Firefly prizes (title scene):");
  continueWith(v, 0, ["lantern", "glowStick", "wings"]);
  check(
    JSON.stringify(game(v).arcade.prizes) === '["lantern","glowStick","wings"]',
    "Continue restores all three Firefly prizes",
    game(v).arcade.prizes,
  );
  v.step(4, { up: true });
  v.frame("6-hub-firefly-prizes");

  startFirefly(v);
  check(firefly(v).lives === 4, "Firefly starts with 4 lives", firefly(v).lives);
  let most = 0;
  for (let k = 0; k < 40; k++) {
    v.step(1, { space: true });
    most = Math.max(most, firefly(v).sparks.length);
    if (k === 20) v.frame("7-firefly-three-sparks");
  }
  check(most === 3, "the glow stick lets 3 sparks fly at once", most);
  const x = firefly(v).player.x;
  v.step(10, { left: true });
  const dx = x - firefly(v).player.x;
  check(dx === 10 * wingsPlayerSpeed, `the wings move the firefly ${wingsPlayerSpeed} px a tick`, dx);
  v.frame("8-firefly-all-prizes");
}

/** Walk down to the counter, buy the lantern, walk to Firefly and start it. */
function buyAndPlay(v: Verify): void {
  v.wait(800);
  v.key("KeyQ"); // dismiss the keyboard notice, if the browser shows it (a key the game ignores)
  v.wait(400);
  v.key("Space"); // Continue
  v.wait(600);
  v.key("ArrowDown", 200);
  v.wait(300);
  v.key("Space"); // open
  v.wait(600);
  for (const key of ["ArrowUp"]) {
    v.key(key);
    v.wait(300);
  }
  v.wait(500);
  v.key("Space"); // buy
  v.wait(1200);
  v.key("Escape");
  v.wait(600);
  v.key("ArrowUp", 900);
  v.key("ArrowRight", 750);
  v.wait(1500); // see the lantern on the wall
  v.key("ArrowUp", 100);
  v.key("Space"); // start Firefly
  v.wait(4000);
}

function videos(v: Verify): void {
  console.log("video:");
  v.record(
    "buy-lantern",
    () => {
      buyAndPlay(v);
    },
    { storage: { [saveKey]: save(60, []) } },
  );
  const g = game(v);
  check(JSON.stringify(g.arcade.prizes) === '["lantern"]', "the video bought the lantern", g.arcade);
  check(
    g.software === "firefly" && isFireflySnapshot(g.sw) && g.sw.lives === 4,
    "and started Firefly with 4 lives",
    g.software,
  );
}

await verify("firefly-prizes", (v) => {
  buyLantern(v);
  allPrizes(v);
  videos(v);
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
