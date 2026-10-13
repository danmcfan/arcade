// The redrawn hub (#17) in a real browser (`bun run verify hub`). Part 1
// drives the `?debug` test hook in the hub (`?scene=game`): the player on the
// arcade carpet, each cabinet's title while facing it (with no key cap drawn
// over the hub), the prize counter, and Space at a cabinet starting that
// cabinet. A key cap would show in the frame as its edge colour, which none
// of the hub art uses. Part 2 records a walk past every cabinet to the
// counter in real time. Files go to out/verify/hub/.

import { PNG } from "pngjs";
import type { GameSnapshot } from "../../src/game/snapshot.ts";
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
/** A key cap's edge colour (`drawKey`). */
const keyEdge = "#566c86";

function canvas(v: Verify): PNG {
  return PNG.sync.read(decodeDataUrl(v.page.eval("window.__arcade.frame()")));
}

function pixel(png: PNG, x: number, y: number): string {
  const i = (y * png.width + x) * 4;
  return `#${[0, 1, 2].map((j) => png.data[i + j]!.toString(16).padStart(2, "0")).join("")}`;
}

/** Whether any key-cap edge pixel is on the canvas. */
function keyCapShown(v: Verify): boolean {
  const png = canvas(v);
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) if (pixel(png, x, y) === keyEdge) return true;
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
  return v.snapshot<GameSnapshot>();
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
    pixel(canvas(v), 80 + margin, 26 + margin) === "#73eff7",
    "the neon tube runs along the top of the wall",
    pixel(canvas(v), 80 + margin, 26 + margin),
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

  v.step(24, { left: true }); // x 56
  v.step(2, { up: true });
  check(
    game(v).arcade.title === "brassMonkey",
    "facing up at the left cabinet shows the Brass Monkey title",
    game(v).arcade.title,
  );
  check(!keyCapShown(v), "with no key cap over the hub");
  v.frame("4-at-brass-monkey");

  v.step(48, { right: true }); // x 104
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
  console.log("the prize counter:");
  v.step(40, { down: true }); // (104, 94): on top of the counter's right end
  check(game(v).arcade.player.y === 94, "walking down stops on the counter", game(v).arcade.player);
  check(!keyCapShown(v), "facing it: no key cap over the hub");
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
  check(game(v).software === "hive", "Space at the Sweet Sam cabinet starts Sweet Sam", game(v).software);
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
