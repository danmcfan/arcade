// The hub's cabinet screens and sounds in a real browser (`bun run verify
// hub-screens`). Part 1 drives the `?debug` test hook: every screen is dark
// glass until the player faces its cabinet, then it switches on like a CRT
// (frames of each step), its light pools on the carpet, and it collapses back
// to dark when they turn away. The sound events show the hub song starting,
// the cabinet's attract loop and the screen-on sound, and the song pausing in
// a minigame. Part 2 records a walk past every cabinet in real time. Files go
// to out/verify/hub-screens/.

import { PNG } from "pngjs";
import type { GameSnapshot } from "../../src/game/snapshot.ts";
import { decodeDataUrl } from "../browser.ts";
import { evalJson, isGameSnapshot, isStringArray, verify, type Verify } from "../harness.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

/** The hub image sits 16 px in from the canvas edge. */
const margin = 16;
/** Sweet Sam's screen, in hub-image coordinates: 8x5 from (76, 47). */
const sweetScreen = { x: 76, y: 47 };

function pixel(v: Verify, x: number, y: number): string {
  const png = PNG.sync.read(decodeDataUrl(v.page.eval("window.__arcade.frame()")));
  const i = ((y + margin) * png.width + x + margin) * 4;
  const hex = [0, 1, 2].map((j) => {
    const c = png.data[i + j];
    if (c === undefined) throw new Error(`pixel (${String(x)}, ${String(y)}) is outside the canvas`);
    return c.toString(16).padStart(2, "0");
  });
  return `#${hex.join("")}`;
}

/** Whether any carpet pixel in front of Sweet Sam (beside the player) is lit blue. */
function lightOnCarpet(v: Verify): boolean {
  for (let y = 64; y < 74; y++)
    for (const x of [66, 67, 68, 69, 91, 92, 93, 94]) if (pixel(v, x, y) === "#3b5dc9") return true;
  return false;
}

function game(v: Verify): GameSnapshot {
  return v.snapshot(isGameSnapshot);
}

function screens(v: Verify): void {
  console.log("Sweet Sam's screen switching on and off:");
  v.openHook("scene=game");
  const heard = evalJson(v.page, "JSON.stringify(window.__arcade.sounds())", isStringArray);
  check(heard.includes("play:hub"), "the hub song starts when the hub does", heard);
  check(pixel(v, sweetScreen.x + 4, sweetScreen.y + 2) === "#1a1c2c", "an unfaced screen is dark glass");
  check(pixel(v, sweetScreen.x + 1, sweetScreen.y) === "#333c57", "with a glint in its corner");
  v.frame("1-screens-dark");

  v.step(25, { up: true }); // y 67: facing Sweet Sam from this tick
  check(
    (["play:attractSweet", "rewind:screenOn", "play:screenOn"] as const).every((e) => game(v).sounds.includes(e)),
    "facing it starts its attract loop and the screen-on sound",
    game(v).sounds,
  );
  check(pixel(v, sweetScreen.x + 4, sweetScreen.y + 2) === "#f4f4f4", "tick 0: a white dot in the middle of the tube");
  v.frame("2-on-t00-dot", 6);
  const steps: [ticks: number, name: string][] = [
    [3, "3-on-t03-line"],
    [2, "4-on-t05-line-wider"],
    [3, "5-on-t08-band"],
    [3, "6-on-t11-bright"],
    [5, "7-on-t16-picture"],
  ];
  for (const [ticks, name] of steps) {
    v.step(ticks);
    v.frame(name, 6);
  }
  check(
    pixel(v, sweetScreen.x + 4, sweetScreen.y + 2) === "#ef7d57",
    "the picture holds: the honey drop's orange",
    pixel(v, sweetScreen.x + 4, sweetScreen.y + 2),
  );
  check(lightOnCarpet(v), "its light falls on the carpet in front of it");

  v.step(1, { down: true });
  check(game(v).sounds.includes("pause:attractSweet"), "turning away stops its attract loop", game(v).sounds);
  v.step(4);
  v.frame("8-off-t05-line", 6);
  v.step(8);
  check(pixel(v, sweetScreen.x + 4, sweetScreen.y + 2) === "#1a1c2c", "and it goes back to dark glass");
  check(!lightOnCarpet(v), "its light goes too");
  v.frame("9-off-dark", 6);
}

function minigame(v: Verify): void {
  console.log("the hub song in a minigame:");
  v.openHook("scene=game");
  v.step(25, { up: true });
  v.step(1, { up: true, space: true });
  check(game(v).software === "hive", "Space at Sweet Sam starts it");
  check(game(v).sounds.includes("pause:hub"), "the hub song pauses for the minigame", game(v).sounds);
}

function video(v: Verify): void {
  console.log("video:");
  v.record(
    "walk",
    () => {
      v.key("Space", 100); // a real key unlocks audio
      v.wait(800);
      v.key("ArrowUp", 600); // to Sweet Sam: its screen warms up
      v.wait(1500);
      v.key("ArrowDown", 150); // turn away: it collapses
      v.wait(600);
      v.key("ArrowLeft", 420); // below Brass Monkey
      v.key("ArrowUp", 150);
      v.wait(1500);
      v.key("ArrowRight", 820); // below Firefly
      v.key("ArrowUp", 150);
      v.wait(1500);
      v.key("ArrowDown", 400);
      v.wait(800);
    },
    { scene: "game" },
  );
}

await verify("hub-screens", (v) => {
  screens(v);
  minigame(v);
  video(v);
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
