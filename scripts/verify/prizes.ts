// Prizes (#22) in a real browser (`bun run verify prizes`). Part 1 drives the
// `?debug` test hook from the title scene: Continue a save with 60 tickets
// and no prizes (the hub looks as before), buy the honey jar at the prize
// counter (25 tickets, saved at once, then OWNED and not for sale again), see
// its decoration by the Sweet Sam cabinet, and start Sweet Sam with 4 lives.
// Part 2 Continues a save that owns all three prizes: every decoration shows,
// none blocks the player, and Sweet Sam starts with 4 lives, the faster bear
// and longer power pellets. Part 3 records the honey jar purchase and the run
// it helps. Files go to out/verify/prizes/.

import type { GameSnapshot, HiveSnapshot, TitleSnapshot } from "../../src/game/snapshot.ts";
import type { PrizeId } from "../../src/arcade/prizes.ts";
import { saveKey } from "../../src/title/save.ts";
import { verify, type Verify } from "../harness.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

/** The Game inside the title scene. */
function game(v: Verify): GameSnapshot {
  const g = v.snapshot<TitleSnapshot>().game;
  if (g === null) throw new Error("no game running");
  return g;
}

function hive(v: Verify): HiveSnapshot {
  const g = game(v);
  if (g.software !== "hive" || g.sw === null) throw new Error(`not in Sweet Sam: ${g.software}`);
  return g.sw as HiveSnapshot;
}

function stored(v: Verify): { v: number; tickets: number; prizes: PrizeId[] } | null {
  return JSON.parse(v.page.eval(`localStorage.getItem(${JSON.stringify(saveKey)}) ?? "null"`)) as ReturnType<
    typeof stored
  >;
}

function sounds(v: Verify): string[] {
  return JSON.parse(v.page.eval("JSON.stringify(window.__arcade.sounds())")) as string[];
}

/** A v3 save at the hub start position (80, 92), facing down. */
function save(tickets: number, prizes: PrizeId[]): string {
  return JSON.stringify({ v: 3, highScore: 0, tokens: 2, tickets, prizes, player: { x: 80, y: 92, dir: "DOWN" } });
}

/** Open the title scene with this save and Continue. */
function continueWith(v: Verify, tickets: number, prizes: PrizeId[]): void {
  v.openHook();
  v.page.eval(`localStorage.setItem(${JSON.stringify(saveKey)}, ${JSON.stringify(save(tickets, prizes))}); "ok"`);
  v.openHook();
  v.tap("space"); // Continue
}

/** From the start position, walk up to the Sweet Sam cabinet and press Space. */
function startSweetSam(v: Verify): void {
  v.step(40, { up: true });
  v.step(1, { up: true, space: true });
  v.step(1);
}

function buyHoneyJar(v: Verify): void {
  console.log("buy the honey jar (title scene, 60 tickets, no prizes):");
  continueWith(v, 60, []);
  check(
    game(v).arcade.prizes === undefined && game(v).arcade.tickets === 60,
    "Continue restores 60 tickets and no prizes",
    game(v).arcade,
  );
  v.frame("1-hub-no-prizes");

  v.step(4, { down: true });
  v.tap("space");
  check(game(v).menu === "prizeCounter", "Space facing the counter opens the prize counter menu", game(v).menu);
  v.tap("down");
  check(game(v).cursor === 1, "Down selects the honey jar", game(v).cursor);
  v.frame("2-menu-prizes");

  sounds(v);
  v.tap("space");
  let a = game(v).arcade;
  check(
    a.tickets === 35 && JSON.stringify(a.prizes) === '["honeyJar"]',
    "Space buys the honey jar for 25 tickets: 35 left, honey jar owned",
    a,
  );
  check(sounds(v).includes("play:select"), "the purchase chirps");
  const s = stored(v);
  check(
    s?.v === 3 && s.tickets === 35 && JSON.stringify(s.prizes) === '["honeyJar"]',
    "the purchase is saved at once, as a v3 save",
    s,
  );
  v.frame("3-menu-honey-jar-owned");

  v.tap("space");
  a = game(v).arcade;
  check(
    a.tickets === 35 && sounds(v).includes("play:deny"),
    "Space on the owned honey jar plays the no sound and takes nothing",
    a,
  );
  v.tap("down");
  v.tap("space");
  check(
    game(v).arcade.tickets === 35 && sounds(v).includes("play:deny"),
    "running shoes (50) can't be bought with 35 tickets",
    game(v).arcade,
  );

  v.tap("escape");
  check(game(v).menu === null, "Esc closes the menu", game(v).menu);
  v.step(4, { up: true });
  v.frame("4-hub-honey-jar");

  startSweetSam(v);
  check(hive(v).lives === 4, "Sweet Sam starts with 4 lives with the honey jar", hive(v).lives);
  v.step(30);
  v.frame("5-sweet-sam-4-lives");
}

function allPrizes(v: Verify): void {
  console.log("all three prizes (title scene):");
  continueWith(v, 0, ["honeyJar", "runningShoes", "sleepyBees"]);
  check(
    JSON.stringify(game(v).arcade.prizes) === '["honeyJar","runningShoes","sleepyBees"]',
    "Continue restores all three prizes",
    game(v).arcade.prizes,
  );
  v.step(4, { up: true });
  v.frame("6-hub-all-prizes");

  // Walk along the cabinets, over the decorations: nothing stops the player.
  v.step(36, { up: true });
  const y = game(v).arcade.player.y;
  v.step(24, { left: true });
  v.step(48, { right: true });
  const p = game(v).arcade.player;
  check(
    p.x === 104 && p.y === y,
    "the player walks past the jar and the shoe along the cabinets (decorations are not solid)",
    p,
  );
  v.frame("7-hub-walk-over-decorations");
  v.step(24, { left: true });

  v.step(1, { up: true, space: true });
  v.step(1);
  check(hive(v).lives === 4, "Sweet Sam starts with 4 lives", hive(v).lives);
  v.step(125);
  check(
    hive(v).state === "PLAY" && hive(v).player.velocity === 1.125,
    "the bear runs at 1.125 px a tick with the running shoes",
    hive(v).player,
  );
  v.frame("8-sweet-sam-all-prizes");
}

/** Walk down to the counter, buy the honey jar, walk up and start Sweet Sam. */
function buyAndPlay(v: Verify): void {
  v.wait(800);
  v.key("Space"); // Continue
  v.wait(600);
  v.key("ArrowDown", 200); // into the counter
  v.wait(300);
  v.key("Space"); // open
  v.wait(800);
  v.key("ArrowDown"); // honey jar
  v.wait(800);
  v.key("Space"); // buy
  v.wait(1200);
  v.key("Escape");
  v.wait(800);
  v.key("ArrowUp", 900); // to the Sweet Sam cabinet, past the honey jar
  v.wait(1200);
  v.key("Space"); // start Sweet Sam
  v.wait(3500);
}

function videos(v: Verify): void {
  console.log("video:");
  v.record("buy-honey-jar", () => buyAndPlay(v), { storage: { [saveKey]: save(60, []) } });
  const g = game(v);
  check(
    JSON.stringify(g.arcade.prizes) === '["honeyJar"]' && g.arcade.tickets === 35,
    "the video bought the honey jar",
    g.arcade,
  );
  check(g.software === "hive" && (g.sw as HiveSnapshot).lives === 4, "and started Sweet Sam with 4 lives", g.software);
}

await verify("prizes", (v) => {
  buyHoneyJar(v);
  allPrizes(v);
  videos(v);
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
