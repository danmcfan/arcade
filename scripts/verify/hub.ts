// The redrawn hub (#17) in a real browser (`bun run verify hub`). Part 1
// drives the `?debug` test hook in the hub (`?scene=game`): the player on the
// arcade carpet, each cabinet's title while facing it (with no key cap drawn
// over the hub), the prize desk, and Space at a cabinet starting that
// cabinet. A key cap would show in the frame as its edge colour, which none
// of the hub art below the scoreboard uses outside the prize desk (its lip
// is the same grey). Part 2 records a walk past every cabinet to the
// prize desk in real time. Files go to out/verify/hub/.

import { PNG } from "pngjs";
import { decodeDataUrl } from "../browser.ts";
import type { GameSnapshot } from "../../src/game/snapshot.ts";
import { isGameSnapshot, verify, type Verify } from "../harness.ts";
import { tickerRect } from "../../src/ui/tickerArt.ts";
import { deskRect } from "../../src/arcade/desk.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

/** The hub image sits 16 px in from the canvas edge. */
const margin = 16;
/** A key cap's edge colour (`drawKey`). */
const keyEdge = "#566c86";

function canvas(v: Verify): PNG {
  return PNG.sync.read(decodeDataUrl(v.page.eval("window.__arcade.frame()")));
}

function pixel(png: PNG, x: number, y: number): string {
  const i = (y * png.width + x) * 4;
  const hex = [0, 1, 2].map((j) => {
    const c = png.data[i + j];
    if (c === undefined) throw new Error(`pixel (${x}, ${y}) is outside the ${png.width}x${png.height} canvas`);
    return c.toString(16).padStart(2, "0");
  });
  return `#${hex.join("")}`;
}

/** Whether (x, y) of the canvas is on the prize desk, whose lip is the key cap's grey. */
function onDesk(x: number, y: number): boolean {
  const d = deskRect;
  return x >= margin + d.x && x < margin + d.x + d.w && y >= margin + d.y && y < margin + d.y + d.h;
}

/** Whether any key-cap edge pixel is on the canvas, below the scoreboard (its frame is the same grey) and off the desk. */
function keyCapShown(v: Verify): boolean {
  const png = canvas(v);
  for (let y = margin + tickerRect.y + tickerRect.h; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) if (!onDesk(x, y) && pixel(png, x, y) === keyEdge) return true;
  }
  return false;
}

/** The floor colour beside the player's feet. */
function floorUnderFeet(v: Verify): string {
  const p = game(v).arcade.player;
  return pixel(canvas(v), p.x + 6 + margin, p.y + 11 + margin);
}

/** The colour at (dx, dy) in the player's 16x24 frame, as drawn on the canvas. */
function playerPixel(v: Verify, dx: number, dy: number): string {
  const p = game(v).arcade.player;
  return pixel(canvas(v), p.x - 8 + dx + margin, p.y - 12 + dy + margin);
}

function game(v: Verify): GameSnapshot {
  return v.snapshot(isGameSnapshot);
}

function floorAndPlayer(v: Verify): void {
  console.log("the room and the player on the carpet:");
  v.openHook("scene=game");
  const p = game(v).arcade.player;
  check(p.x === 80 && p.y === 92 && p.dir === "DOWN", "the hub opens with the player at the start position", p);
  check(floorUnderFeet(v) === "#29366f", "the player stands on the navy carpet", floorUnderFeet(v));
  check(
    playerPixel(v, 5, 5) === "#73eff7",
    "in the new sprite: the cyan headphone band across the hair",
    playerPixel(v, 5, 5),
  );
  check(
    pixel(canvas(v), 80 + margin, 2 + margin) === "#73eff7",
    "the neon tube runs along the ceiling, at the top of the frame",
    pixel(canvas(v), 80 + margin, 2 + margin),
  );
  v.frame("1-player-on-carpet");

  v.step(32, { left: true });
  v.frame("2-player-walking-left");
  v.step(32, { right: true });
}

function cabinets(v: Verify): void {
  console.log("each cabinet's title, and no key cap:");
  v.step(31, { up: true }); // (80, 61): at the Sweet Sam cabinet
  check(
    game(v).arcade.title === "sweet",
    "facing up at the middle cabinet shows the Sweet Sam title",
    game(v).arcade.title,
  );
  check(!keyCapShown(v), "with no key cap over the hub");
  v.frame("3-at-sweet-sam");

  v.step(1, { down: true });
  check(game(v).arcade.title === null, "turning round hides the title", game(v).arcade.title);

  v.step(40, { left: true }); // x 40
  v.step(2, { up: true });
  check(
    game(v).arcade.title === "brassMonkey",
    "facing up at the left cabinet shows the Brass Monkey title",
    game(v).arcade.title,
  );
  check(!keyCapShown(v), "with no key cap over the hub");
  v.frame("4-at-brass-monkey");

  v.step(80, { right: true }); // x 120
  v.step(1, { up: true });
  check(
    game(v).arcade.title === "firefly",
    "facing up at the right cabinet shows the Firefly title",
    game(v).arcade.title,
  );
  check(!keyCapShown(v), "with no key cap over the hub");
  v.frame("5-at-firefly");
}

function counter(v: Verify): void {
  console.log("the prize desk:");
  v.step(40, { down: true }); // (120, 95): above the desk's right end
  check(game(v).arcade.player.y === 95, "walking down stops at the desk", game(v).arcade.player);
  check(!keyCapShown(v), "facing it: no key cap over the hub");
  const png = canvas(v);
  const at = (x: number, y: number): string => pixel(png, margin + deskRect.x + x, margin + deskRect.y + y);
  check(at(44, 6) === "#ffcd75", "the desk's placemat is yellow, in the middle of its back run", at(44, 6));
  check(at(18, 18) === "#73eff7", "the band under the back run is cyan, inside the U", at(18, 18));
  check(at(1, 10) === "#566c86" && at(2, 10) === "#333c57", "the top is charcoal with a grey lip down its side", [
    at(1, 10),
    at(2, 10),
  ]);
  check(at(7, 35) === "#41a6f6", "the left arm ends in the rounded cyan foot on the bottom row", at(7, 35));
  v.frame("6-at-prize-counter");

  v.tap("space");
  check(game(v).menu === "prizeCounter", "Space opens the prize counter menu", game(v).menu);
  v.frame("7-prize-counter-menu");
}

function spaceUsesTheCabinet(v: Verify): void {
  console.log("Space at a cabinet starts it:");
  v.openHook("scene=game");
  v.step(31, { up: true });
  v.step(1, { up: true, space: true });
  check(game(v).software === "sweetSam", "Space at the Sweet Sam cabinet starts Sweet Sam", game(v).software);
}

function video(v: Verify): void {
  console.log("video:");
  v.record(
    "walk",
    () => {
      v.wait(1000); // the room, the player idle on the carpet
      v.key("ArrowUp", 600); // to the Sweet Sam cabinet: its title
      v.wait(1500);
      v.key("ArrowDown", 150); // turn away: the title goes
      v.wait(500);
      v.key("ArrowLeft", 700); // below Brass Monkey
      v.key("ArrowUp", 150);
      v.wait(1500);
      v.key("ArrowRight", 1370); // below Firefly
      v.key("ArrowUp", 150);
      v.wait(1500);
      v.key("ArrowDown", 700); // down to the prize desk
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
