// The prize shelf (#70) in a real browser (`bun run verify prize-shelf`).
// Continues a save with 60 tickets that owns the honey jar and the oil can,
// opens the prize counter and checks the 3x3 shelf: the cursor opens on
// CLOSE, moves up and down a cabinet's column and across the columns, an owned
// prize can't be chosen (no sound), a 100-ticket prize plays the no sound, and an
// affordable one is bought. Frames show the shelf at each step; the video walks
// the same path in real time. Files go to out/verify/prize-shelf/.

import type { GameSnapshot } from "../../src/game/snapshot.ts";
import { saveKey } from "../../src/title/save.ts";
import { evalJson, isStringArray, isTitleSnapshot, verify, type Verify } from "../harness.ts";

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

function sounds(v: Verify): string[] {
  return evalJson(v.page, "JSON.stringify(window.__arcade.sounds())", isStringArray);
}

/** A v3 save just above the prize desk, owning the honey jar and the oil can. */
const save = JSON.stringify({
  v: 3,
  highScore: 0,
  tokens: 2,
  tickets: 60,
  prizes: ["honeyJar", "oilCan"],
  player: { x: 80, y: 95, dir: "DOWN" },
});

function shelf(v: Verify): void {
  // A desktop viewport: a headless browser that reports no pointer would otherwise get the keyboard notice.
  v.page.run("set", "viewport", "1280", "900");
  v.openHook();
  v.page.eval(`localStorage.setItem(${JSON.stringify(saveKey)}, ${JSON.stringify(save)}); "ok"`);
  v.openHook();
  v.tap("space"); // Continue
  v.tap("space"); // facing the desk: open the prize counter
  let g = game(v);
  check(g.menu === "prizeCounter" && g.cursor === 9, "the prize counter opens with CLOSE selected", g);
  v.frame("1-shelf-close-selected");

  v.tap("up");
  check(game(v).cursor === 8, "Up from CLOSE: the bottom of the right column", game(v).cursor);
  v.tap("right");
  check(game(v).cursor === 6, "Right wraps round the row: the oil can, bottom of the left column", game(v).cursor);
  sounds(v);
  v.tap("space");
  check(
    !sounds(v).some((s) => s.startsWith("play:")) && game(v).arcade.tickets === 60,
    "the owned oil can can't be chosen: no sound, nothing taken",
    game(v).arcade,
  );
  v.frame("2-shelf-oil-can-owned");

  v.tap("right");
  v.tap("up");
  v.tap("up");
  check(game(v).cursor === 1, "Right then Up twice: the sleepy bees, top of the middle column", game(v).cursor);
  v.tap("space");
  check(
    sounds(v).includes("play:deny") && game(v).arcade.tickets === 60,
    "the sleepy bees (100) can't be afforded with 60 tickets: the no sound",
    game(v).arcade,
  );
  v.frame("3-shelf-sleepy-bees-unaffordable");

  v.tap("down");
  v.tap("right");
  check(game(v).cursor === 5, "Down then Right: the glow stick", game(v).cursor);
  v.tap("space");
  g = game(v);
  check(
    sounds(v).includes("play:select") &&
      g.arcade.tickets === 10 &&
      JSON.stringify(g.arcade.prizes) === '["honeyJar","glowStick","oilCan"]',
    "Space buys the glow stick for 50 tickets: 10 left",
    g.arcade,
  );
  v.frame("4-shelf-glow-stick-bought");

  v.tap("down");
  v.tap("down");
  check(game(v).cursor === 9, "Down from the right column's foot reaches CLOSE", game(v).cursor);
  v.frame("5-shelf-close");
  v.tap("space");
  check(game(v).menu === null, "CLOSE closes the prize counter", game(v).menu);
}

function video(v: Verify): void {
  v.record(
    "shelf",
    () => {
      v.wait(800);
      v.key("KeyQ"); // dismiss the keyboard notice, if the browser shows it (a key the game ignores)
      v.wait(400);
      v.key("Space"); // Continue
      v.wait(600);
      v.key("Space"); // open
      v.wait(900);
      for (const key of ["ArrowUp", "ArrowRight", "Space", "ArrowRight", "ArrowUp", "ArrowUp", "Space"]) {
        v.key(key);
        v.wait(600);
      }
      for (const key of ["ArrowDown", "ArrowRight", "Space", "ArrowLeft", "ArrowUp", "ArrowDown"]) {
        v.key(key);
        v.wait(600);
      }
      v.key("ArrowRight"); // back to the right column
      v.wait(600);
      v.key("ArrowDown"); // CLOSE
      v.wait(600);
      v.key("Space");
      v.wait(1000);
    },
    { storage: { [saveKey]: save } },
  );
  check(
    JSON.stringify(game(v).arcade.prizes) === '["honeyJar","glowStick","oilCan"]',
    "the video bought the glow stick",
    game(v).arcade,
  );
}

await verify("prize-shelf", (v) => {
  shelf(v);
  video(v);
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
