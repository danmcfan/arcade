// The redrawn hub and the use prompt (#17) in a real browser
// (`bun run verify hub`). Part 1 drives the `?debug` test hook in the hub
// (`?scene=game`): the player on each colour of the floor, then the SPACE key
// cap above each cabinet while facing it (with its title art), gone when the
// player turns away, bobbing, above the prize counter (or above the player
// standing on it) while facing it, and Space at a cabinet starting that
// cabinet. The key cap is found in the frame by its edge colour, which
// nothing else in the hub uses. Part 2
// records a walk past every cabinet to the counter in real time. Files go to
// out/verify/hub/.

import { PNG } from "pngjs";
import { usePromptBobTicks, usePromptLabel } from "../../src/arcade/draw.ts";
import type { GameSnapshot } from "../../src/game/snapshot.ts";
import { keyHeight, keyWidth } from "../../src/ui/text.ts";
import { decodeDataUrl } from "../browser.ts";
import { verify, type Verify } from "../harness.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

/** The hub image sits 16 px in from the canvas edge. */
const margin = 16;
/** The key cap's edge colour (`drawKey`). */
const keyEdge = "#566c86";

function canvas(v: Verify): PNG {
  return PNG.sync.read(decodeDataUrl(v.page.eval("window.__arcade.frame()")));
}

function pixel(png: PNG, x: number, y: number): string {
  const i = (y * png.width + x) * 4;
  return `#${[0, 1, 2].map((j) => png.data[i + j]!.toString(16).padStart(2, "0")).join("")}`;
}

/** Top-left and width (hub-image coordinates) of the key-cap edge pixels on the canvas, or null if there are none. */
function keyCap(v: Verify): { x: number; y: number; w: number } | null {
  const png = canvas(v);
  let [x0, y0, x1] = [Infinity, Infinity, -Infinity];
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      if (pixel(png, x, y) !== keyEdge) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
    }
  }
  return x0 === Infinity ? null : { x: x0 - margin, y: y0 - margin, w: x1 - x0 + 1 };
}

/** The floor colour beside the player's feet, in the floor square their x starts. */
function floorUnderFeet(v: Verify): string {
  const p = game(v).arcade.player;
  return pixel(canvas(v), p.x + 6 + margin, p.y + 11 + margin);
}

function game(v: Verify): GameSnapshot {
  return v.snapshot<GameSnapshot>();
}

const capWidth = keyWidth(usePromptLabel);
/** 1 while the prompt is at the top of its bob. */
const bob = (v: Verify) => Math.trunc(game(v).tick / usePromptBobTicks) % 2;
/** Where the key cap goes above a cabinet whose rect starts at `x` (16 wide, top at y 40). */
const aboveCabinet = (v: Verify, x: number) => ({ x: x + Math.trunc((16 - capWidth) / 2), y: 40 - keyHeight - 2 - bob(v), w: capWidth });
/** Just above the prize counter (60, 106, 40, 14), as seen from either side of it. */
const aboveCounter = (v: Verify) => ({ x: 60 + Math.trunc((40 - capWidth) / 2), y: 106 - keyHeight - 2 - bob(v), w: capWidth });
/** Above the head of the player (16 x 24) standing on the counter, centred on them. */
const abovePlayer = (v: Verify) => {
  const p = game(v).arcade.player;
  return { x: p.x - capWidth / 2, y: p.y - 12 - keyHeight - 2 - bob(v), w: capWidth };
};
/** The key cap leaves every pixel of the prize counter's art in view. */
const clearOfCounter = (cap: { x: number; y: number; w: number } | null) =>
  cap !== null && (cap.y + keyHeight <= 106 || cap.x + cap.w <= 60 || cap.x >= 100);

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function floorAndPlayer(v: Verify): void {
  console.log("the room and the player on both floor colours:");
  v.openHook("scene=game");
  const p = game(v).arcade.player;
  check(p.x === 80 && p.y === 92 && p.dir === "DOWN", "the hub opens with the player at the start position", p);
  check(floorUnderFeet(v) === "#29366f", "at the start the player stands on a dark blue square", floorUnderFeet(v));
  check(keyCap(v) === null, "no use prompt at the start position", keyCap(v));
  v.frame("1-player-on-dark-blue");

  v.step(8, { right: true });
  check(floorUnderFeet(v) === "#333c57", "8 px right the player stands on a slate square", floorUnderFeet(v));
  check(keyCap(v) === null, "and still no use prompt");
  v.frame("2-player-on-slate");
  v.step(8, { left: true });
}

function cabinets(v: Verify): void {
  console.log("the use prompt at each cabinet:");
  v.step(31, { up: true }); // (80, 61): at the Sweet Sam cabinet
  check(game(v).arcade.title === "sweet", "facing up at the middle cabinet shows the Sweet Sam title", game(v).arcade.title);
  check(same(keyCap(v), aboveCabinet(v, 72)), "and a SPACE key cap above that cabinet", keyCap(v));
  v.frame("3-prompt-sweet-sam");

  v.step(1, { down: true });
  check(keyCap(v) === null && game(v).arcade.title === null, "turning round hides the prompt (and the title)", keyCap(v));

  v.step(24, { left: true }); // x 56
  check(keyCap(v) === null, "facing left below the Brass Monkey cabinet: no prompt", keyCap(v));
  v.step(2, { up: true });
  check(same(keyCap(v), aboveCabinet(v, 48)), "facing up at it: the key cap above the Brass Monkey cabinet", keyCap(v));
  v.frame("4-prompt-brass-monkey");

  v.step(48, { right: true }); // x 104
  v.step(1, { up: true });
  check(same(keyCap(v), aboveCabinet(v, 96)), "facing up at the Firefly cabinet: the key cap above it", keyCap(v));
  v.frame("5-prompt-firefly");

  const before = keyCap(v)!;
  v.step(usePromptBobTicks);
  const after = keyCap(v)!;
  check(Math.abs(after.y - before.y) === 1 && after.x === before.x, `it bobs 1 px every ${usePromptBobTicks} ticks`, [before, after]);
}

function counter(v: Verify): void {
  console.log("the use prompt at the prize counter:");
  v.step(40, { down: true }); // (104, 94): above the counter's right end
  check(game(v).arcade.player.y === 94, "walking down stops on the counter", game(v).arcade.player);
  check(same(keyCap(v), abovePlayer(v)), "facing it from on top: the key cap above the player's head", keyCap(v));
  check(clearOfCounter(keyCap(v)), "and clear of the counter's art", keyCap(v));
  v.frame("6-prompt-prize-counter");

  v.step(1, { up: true });
  check(keyCap(v) === null, "facing away from it: no prompt", keyCap(v));
  v.step(40, { right: true }); // x 128: beside the counter
  v.step(20, { down: true }); // y 108, against the bottom wall
  v.step(30, { left: true }); // stops at the counter's right side
  check(same(keyCap(v), aboveCounter(v)), "facing it from the side: the key cap above the counter", keyCap(v));
  check(clearOfCounter(keyCap(v)), "and clear of the counter's art", keyCap(v));
  v.frame("7-prompt-prize-counter-side");

  v.tap("space");
  check(game(v).menu === "prizeCounter", "and Space opens the prize counter menu", game(v).menu);
  v.frame("8-prize-counter-menu");
}

function spaceUsesTheCabinet(v: Verify): void {
  console.log("Space at a prompted cabinet starts it:");
  v.openHook("scene=game");
  v.step(31, { up: true });
  check(keyCap(v) !== null, "the prompt shows at Sweet Sam");
  v.step(1, { up: true, space: true });
  check(game(v).software === "hive", "Space starts Sweet Sam", game(v).software);
}

function video(v: Verify): void {
  console.log("video:");
  v.record(
    "walk",
    () => {
      v.wait(1000); // the room, the player idle on the floor
      v.key("ArrowUp", 600); // to the Sweet Sam cabinet: title and prompt
      v.wait(1500);
      v.key("ArrowDown", 150); // turn away: both go
      v.wait(500);
      v.key("ArrowLeft", 420); // below Brass Monkey
      v.key("ArrowUp", 150);
      v.wait(1500);
      v.key("ArrowRight", 820); // below Firefly
      v.key("ArrowUp", 150);
      v.wait(1500);
      v.key("ArrowDown", 700); // down to the prize counter
      v.wait(2000);
    },
    { scene: "game" },
  );
}

await verify("hub", (v) => {
  floorAndPlayer(v);
  cabinets(v);
  counter(v);
  spaceUsesTheCabinet(v);
  video(v);
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
