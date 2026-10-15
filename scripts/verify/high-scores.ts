// Per-machine high scores (#148), in a real browser (`bun run verify high-scores`).
// Part 1 Continues a save where no machine is beaten (Sweet Sam's best is
// 14000, under its 15000 house high score): no stars in the hub, the
// scoreboard says PRESS SPACE TO PLAY, and Sweet Sam's HI shows the house
// high score. Part 2 Continues one where Sweet Sam is beaten (16000): a gold
// star on its marquee only, the scoreboard shows the star and HI 16000 when
// the player faces it, and Sweet Sam's HI shows the player's 16000; the
// unbeaten Brass Monkey still shows its house high score. Part 3 records
// walking to both cabinets. Files go to out/verify/high-scores/.

import { houseHighScores, type HighScores } from "../../src/arcade/wallet.ts";
import type { GameSnapshot, SoftwareSnapshot } from "../../src/game/snapshot.ts";
import { saveKey } from "../../src/title/save.ts";
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

/** The running minigame's high score, as its HI shows it. */
function shownHi(sw: SoftwareSnapshot | null): number | null {
  return sw !== null && "highScore" in sw ? sw.highScore : null;
}

const unbeaten: HighScores = { sweetSam: 14_000, firefly: 0, brassMonkey: 2_000 };
const sweetSamBeaten: HighScores = { sweetSam: 16_000, firefly: 0, brassMonkey: 2_000 };

/** A v4 save at the hub start position (80, 92), facing down, with 3 tokens. */
function save(highScores: HighScores): string {
  return JSON.stringify({ v: 4, highScores, tokens: 3, tickets: 0, prizes: [], player: { x: 80, y: 92, dir: "DOWN" } });
}

function continueWith(v: Verify, highScores: HighScores): void {
  v.openHook();
  v.page.eval(`localStorage.setItem(${JSON.stringify(saveKey)}, ${JSON.stringify(save(highScores))}); "ok"`);
  v.openHook();
  v.tap("space"); // Continue
}

/** From the start position, face the cabinet `dx` px across (Sweet Sam at 0, Brass Monkey at -40). */
function faceCabinet(v: Verify, dx: number): void {
  v.step(30, { up: true });
  if (dx !== 0) v.step(Math.abs(dx), dx < 0 ? { left: true } : { right: true });
  v.step(10, { up: true });
}

function enter(v: Verify): void {
  v.tap("space");
  v.step(60); // the HI dials settle
}

function beforeBeaten(v: Verify): void {
  console.log("no machine beaten (Sweet Sam best 14000, house 15000):");
  continueWith(v, unbeaten);
  check(
    JSON.stringify(game(v).arcade.highScores) === JSON.stringify(unbeaten),
    "Continue restores each machine's player high score",
    game(v).arcade.highScores,
  );
  v.frame("1-hub-no-stars");
  faceCabinet(v, 0);
  check(game(v).arcade.title === "sweet", "facing Sweet Sam, the scoreboard shows its name", game(v).arcade);
  v.frame("2-sweet-sam-unbeaten-scoreboard");
  enter(v);
  const g = game(v);
  check(g.software === "sweetSam", "Space starts Sweet Sam", g.software);
  check(
    shownHi(g.sw) === houseHighScores.sweetSam,
    "Sweet Sam's HI shows the house high score, 15000, not the player's 14000",
    shownHi(g.sw),
  );
  v.frame("3-sweet-sam-hi-house");
}

function afterBeaten(v: Verify): void {
  console.log("Sweet Sam beaten (best 16000):");
  continueWith(v, sweetSamBeaten);
  v.frame("4-hub-star-on-sweet-sam");
  faceCabinet(v, 0);
  v.frame("5-sweet-sam-beaten-scoreboard");
  enter(v);
  let g = game(v);
  check(
    g.software === "sweetSam" && shownHi(g.sw) === 16_000,
    "Sweet Sam's HI now shows the player's 16000",
    shownHi(g.sw),
  );
  v.frame("6-sweet-sam-hi-player");

  continueWith(v, sweetSamBeaten);
  faceCabinet(v, -40);
  check(game(v).arcade.title === "brassMonkey", "facing Brass Monkey", game(v).arcade);
  v.frame("7-brass-monkey-unbeaten-scoreboard");
  enter(v);
  g = game(v);
  check(
    g.software === "brassMonkey" && shownHi(g.sw) === houseHighScores.brassMonkey,
    "unbeaten Brass Monkey's HI still shows its house high score",
    shownHi(g.sw),
  );
  v.frame("8-brass-monkey-hi-house");
}

function video(v: Verify): void {
  console.log("video:");
  v.record(
    "beaten-cabinet",
    () => {
      v.wait(800);
      v.key("Space"); // Continue
      v.wait(800);
      v.key("ArrowUp", 600); // Sweet Sam: star and HI on the scoreboard
      v.wait(1500);
      v.key("ArrowLeft", 700);
      v.key("ArrowUp", 100); // Brass Monkey: PRESS SPACE TO PLAY
      v.wait(1500);
      v.key("ArrowRight", 700);
      v.key("ArrowUp", 100);
      v.wait(600);
      v.key("Space"); // into Sweet Sam: HI 16000
      v.wait(2500);
    },
    { storage: { [saveKey]: save(sweetSamBeaten) } },
  );
}

await verify("high-scores", (v) => {
  // A browser that reports no pointer kind gets the keyboard notice below a
  // 768 px short side (src/engine/device.ts); 720 px headless would show it.
  v.open();
  v.page.run("set", "viewport", "1280", "800");
  beforeBeaten(v);
  afterBeaten(v);
  video(v);
  v.assertNoErrors();
  console.log(`${checks} checks passed`);
});
