// The hub room filling the Game Boy frame (#72) with the prize desk and its
// employee (#75), in a real browser (`bun run verify hub-room`).
// Part 1 drives the `?debug` test hook from the title scene: Continue a save
// with 3 tokens, 1250 tickets and all nine prizes; the room, the LED
// scoreboard and the wall prizes, all inside the 160x144 frame (the 16 px
// margin round it stays empty); the desk is solid along its whole length and
// Space facing it opens the prize counter menu under the scoreboard, which
// scrolls; each cabinet, 40 px apart, shows its name on the scoreboard and
// starts its minigame. Part 2 Continues with 0 tokens and 99999 tickets:
// FREE PLAY and a large count. Part 3 records walking round the room and
// using the desk. Files go to out/verify/hub-room/.

import { PNG } from "pngjs";
import type { GameSnapshot } from "../../src/game/snapshot.ts";
import type { PrizeId } from "../../src/arcade/prizes.ts";
import { saveKey } from "../../src/title/save.ts";
import { decodeDataUrl } from "../browser.ts";
import { isTitleSnapshot, verify, type Verify } from "../harness.ts";

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

const allPrizes: PrizeId[] = [
  "honeyJar",
  "runningShoes",
  "sleepyBees",
  "lantern",
  "glowStick",
  "wings",
  "oilCan",
  "springBoots",
  "pocketWatch",
];

/** A v3 save at the hub start position (80, 92), facing down. */
function save(tokens: number, tickets: number, prizes: PrizeId[]): string {
  return JSON.stringify({ v: 3, highScore: 0, tokens, tickets, prizes, player: { x: 80, y: 92, dir: "DOWN" } });
}

function continueWith(v: Verify, tokens: number, tickets: number, prizes: PrizeId[]): void {
  v.openHook();
  v.page.eval(
    `localStorage.setItem(${JSON.stringify(saveKey)}, ${JSON.stringify(save(tokens, tickets, prizes))}); "ok"`,
  );
  v.openHook();
  v.tap("space"); // Continue
}

/** Opaque pixels in the 16 px margin round the hub image, and the margin's size, in a fresh frame at logical resolution. */
function marginPixels(v: Verify): [lit: number, total: number] {
  const png = PNG.sync.read(decodeDataUrl(v.page.eval("window.__arcade.frame()")));
  let lit = 0;
  let total = 0;
  for (let y = 0; y < png.height; y++)
    for (let x = 0; x < png.width; x++) {
      if (x >= 16 && x < 176 && y >= 16 && y < 160) continue;
      total++;
      if ((png.data[(y * png.width + x) * 4 + 3] ?? 0) > 0) lit++;
    }
  return [lit, total];
}

function room(v: Verify): void {
  console.log("the room (title scene, 3 tokens, 1250 tickets, all nine prizes):");
  continueWith(v, 3, 1250, allPrizes);
  const g = game(v);
  check(
    g.arcade.tokens === 3 && g.arcade.tickets === 1250 && g.arcade.prizes?.length === 9,
    "Continue restores the counts and all nine prizes",
    g.arcade,
  );
  v.frame("1-hub");
  const [lit, total] = marginPixels(v);
  check(total > 0 && lit === 0, "nothing is drawn in the 16 px margin round the 160x144 frame", { lit, total });

  v.step(30, { down: true });
  check(game(v).arcade.player.y === 95, "walking down stops at the desk: it is solid", game(v).arcade.player);
  v.step(60, { left: true });
  v.step(10, { down: true });
  check(
    game(v).arcade.player.x === 32 && game(v).arcade.player.y === 95,
    "the desk runs to the left wall: no way round it",
    game(v).arcade.player,
  );
  v.step(100, { right: true });
  v.step(10, { down: true });
  check(
    game(v).arcade.player.x === 128 && game(v).arcade.player.y === 95,
    "and to the right wall",
    game(v).arcade.player,
  );
  v.step(48, { left: true }); // x 80
  v.step(2, { down: true }); // face the desk
  v.tap("space");
  check(game(v).menu === "prizeCounter", "Space facing the desk opens the prize counter menu", game(v).menu);
  v.frame("2-desk-menu");
  check(marginPixels(v)[0] === 0, "the menu stays inside the frame, under the scoreboard");
  for (let i = 0; i < 10; i++) v.tap("down");
  check(game(v).cursor === 10, "Down scrolls the menu to CLOSE", game(v).cursor);
  v.frame("3-desk-menu-scrolled");
  v.tap("escape");
  check(game(v).menu === null, "Esc closes it", game(v).menu);

  for (const [dx, title, shot] of [
    [-40, "brassMonkey", "4-brass-monkey-cabinet"],
    [0, "sweet", "5-sweet-sam-cabinet"],
    [40, "firefly", "6-firefly-cabinet"],
  ] as const) {
    v.step(30, { up: true }); // y 64
    if (dx !== 0) v.step(Math.abs(dx), dx < 0 ? { left: true } : { right: true });
    v.step(10, { up: true });
    const a = game(v).arcade;
    check(a.melodyPlaying && a.title === title, `${title}'s cabinet lights up and the scoreboard shows its name`, a);
    v.frame(shot);
    if (dx !== 0) v.step(Math.abs(dx), dx < 0 ? { right: true } : { left: true });
    v.step(40, { down: true }); // back to the desk
  }
  v.step(30, { up: true });
  v.step(40, { right: true });
  v.step(10, { up: true });
  v.tap("space");
  check(game(v).software === "firefly", "Space at the Firefly cabinet (x 112) starts Firefly", game(v).software);
}

function freePlay(v: Verify): void {
  console.log("FREE PLAY and a large ticket count (0 tokens, 99999 tickets):");
  continueWith(v, 0, 99_999, ["honeyJar", "runningShoes", "sleepyBees"]);
  check(
    game(v).arcade.tokens === 0 && game(v).arcade.tickets === 99_999,
    "Continue restores 0 tokens and 99999 tickets",
  );
  v.frame("7-free-play-large-count");
  v.open();
  v.wait(800);
  v.key("Space"); // Continue, real loop
  v.wait(800);
  v.screenshot("8-page");
}

function video(v: Verify): void {
  console.log("video:");
  v.record(
    "walkaround",
    () => {
      v.wait(800);
      v.key("Space"); // Continue
      v.wait(800);
      v.key("ArrowLeft", 700);
      v.key("ArrowUp", 600); // the Brass Monkey cabinet
      v.wait(1200);
      v.key("ArrowRight", 1350); // past Sweet Sam to Firefly
      v.key("ArrowUp", 100); // face it
      v.wait(1200);
      v.key("ArrowDown", 900); // down to the desk
      v.key("ArrowLeft", 600);
      v.key("ArrowDown", 200);
      v.wait(600);
      v.key("Space"); // open the menu
      v.wait(900);
      for (let i = 0; i < 8; i++) {
        v.key("ArrowDown");
        v.wait(250);
      }
      v.wait(800);
      v.key("Escape");
      v.wait(1500); // the employee idles
    },
    { storage: { [saveKey]: save(3, 1250, allPrizes) } },
  );
}

await verify("hub-room", (v) => {
  room(v);
  freePlay(v);
  video(v);
  v.assertNoErrors();
  console.log(`${checks} checks passed`);
});
