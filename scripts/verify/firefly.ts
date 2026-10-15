// Firefly as a Galaga-style game (#34) in a real browser (`bun run verify firefly`).
// Part 1 starts a paid run from the hub through the `?debug` test hook and
// plays it with a simple bot (Space held, dodging, steering under the nearest
// enemy once the first formation is complete) until the payout: the STAGE 1 text, the enemies flying in to the formation,
// a dive dropping shots, an Owl hurt by its first spark and killed by its
// second, a lost life, the next stage, and game over opening the payout,
// which pays the score in tickets. Part 2 writes the new sprite sheets (the
// hurt Owl and the enemy shot) scaled up. Part 3 records Firefly played with
// the keyboard. Part 1 also reads the canvas to check that an enemy past the
// screen's edge and the payout never paint over the cabinet outline. Files go to out/verify/firefly/.

import { readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { repoRoot } from "../../test/parity/fixtures.ts";
import { PNG } from "pngjs";
import type { FireflySnapshot, GameSnapshot } from "../../src/game/snapshot.ts";
import type { Input } from "../../src/engine/input.ts";
import { ticketsFor } from "../../src/arcade/wallet.ts";
import { fireflyArtFiles } from "../gen-firefly-art.ts";
import { decodeDataUrl } from "../browser.ts";
import {
  cabinetInsetLeft,
  cabinetInsetTop,
  cabinetPlayfieldHeight,
  cabinetPlayfieldWidth,
} from "../../src/ui/cabinet.ts";
import { evalJson, isStringArray, isTitleSnapshot, upscale, verify, type Verify } from "../harness.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

/** The Game inside the title scene. */
function game(v: Verify): GameSnapshot {
  const g = v.snapshot(isTitleSnapshot).game;
  if (g === null) throw new Error("no game running");
  return g;
}

function firefly(g: GameSnapshot): FireflySnapshot | null {
  return g.software === "firefly" && g.sw !== null && "stageTick" in g.sw ? g.sw : null;
}

const cabinetOutline = PNG.sync.read(
  readFileSync(join(import.meta.dir, "../../src/assets/images/cabinet-firefly.png")),
);

/** Outline pixels in the canvas that differ from the cabinet outline: 0 when nothing is drawn over it. */
function outlinePixelsChanged(v: Verify): number {
  const png = PNG.sync.read(decodeDataUrl(v.page.eval("window.__arcade.frame()")));
  let changed = 0;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const onScreen =
        x >= cabinetInsetLeft &&
        x < cabinetInsetLeft + cabinetPlayfieldWidth &&
        y >= cabinetInsetTop &&
        y < cabinetInsetTop + cabinetPlayfieldHeight;
      if (onScreen) continue;
      const i = (y * png.width + x) * 4;
      for (let c = 0; c < 4; c++) if (png.data[i + c] !== cabinetOutline.data[i + c]) changed++;
    }
  }
  return changed;
}

/** An enemy in play with part of its sprite past the screen's edge. */
function pastEdge(s: FireflySnapshot): boolean {
  return s.enemies.some((e) => {
    if (e.state === "waiting" || e.deadFrames > 0) return false;
    const half = e.kind === "owl" ? 16 : 8;
    return (
      e.x - half < 0 || e.x + half > cabinetPlayfieldWidth || e.y - half < 0 || e.y + half > cabinetPlayfieldHeight
    );
  });
}

/** The bot: Space held, dodging shots and divers close above, else steering under the nearest enemy. */
function botInput(s: FireflySnapshot): Partial<Input> {
  const px = s.player.x;
  const threat = [
    ...s.shots.filter((x) => x.y > s.player.y - 60),
    ...s.enemies.filter((e) => e.state === "diving" && e.deadFrames === 0 && e.y > s.player.y - 70),
  ].find((x) => Math.abs(x.x - px) < 14);
  if (threat !== undefined) return threat.x > px ? { space: true, left: true } : { space: true, right: true };
  const targets = s.enemies.filter((e) => e.deadFrames === 0 && e.state !== "waiting" && e.y < 230);
  const target = targets.toSorted((a, b) => Math.abs(a.x - px) - Math.abs(b.x - px))[0];
  if (target === undefined || Math.abs(target.x - px) <= 2) return { space: true };
  return target.x > px ? { space: true, right: true } : { space: true, left: true };
}

function playToPayout(v: Verify): void {
  console.log("a paid run, from the hub to the payout:");
  v.openHook();
  v.page.eval("localStorage.clear()");
  v.openHook();
  v.page.eval(`window.__arcade.seed(10); "ok"`);
  v.tap("space"); // New game -> intro
  v.tap("space"); // intro -> hub
  v.step(31, { up: true });
  v.step(40, { right: true });
  v.step(1, { up: true, space: true });
  let g = game(v);
  check(g.software === "firefly" && g.run === "paid", "Space at the Firefly cabinet starts a paid run", g.run);

  const seen = new Set<string>();
  const shoot = (name: string, what: string): void => {
    if (seen.has(name)) return;
    seen.add(name);
    check(true, what);
    v.frame(name, 2);
  };
  let hurtOwl: { row: number; col: number } | null = null;
  let lastScore = 0;
  let lives = 3;

  for (let t = 0; t < 30_000; t++) {
    g = game(v);
    if (g.menu === "payout") break;
    const s = firefly(g);
    if (s === null) throw new Error(`left Firefly without a payout: ${g.software}`);
    lastScore = s.score;

    if (!seen.has("0-enemy-past-edge") && pastEdge(s)) {
      const changed = outlinePixelsChanged(v);
      check(changed === 0, "an enemy past the screen's edge is cut off: the outline stays the cabinet art", changed);
      shoot("0-enemy-past-edge", "saw an enemy past the screen's edge");
    }
    if (s.stage === 1 && s.stageTick === 40) shoot("1-stage-1", "STAGE 1 shows while the enemies wait");
    if (
      s.enemies.length === 40 &&
      s.enemies.filter((e) => e.state === "formation").length >= 36 &&
      s.enemies.every((e) => e.state === "formation" || e.state === "joining")
    )
      shoot("2-formation", `all 40 enemies flew in to the formation (stage ${s.stage})`);
    if (s.shots.length > 0 && s.enemies.some((e) => e.state === "diving"))
      shoot("3-dive-shots", "a diving enemy drops shots at the firefly");
    const hurt = s.enemies.find((e) => e.kind === "owl" && e.hp === 1 && e.deadFrames === 0);
    if (hurt !== undefined && hurtOwl === null) {
      hurtOwl = { row: hurt.row, col: hurt.col };
      shoot("4-owl-hurt", "an Owl's first spark leaves it hurt (blue), not dead");
    }
    if (hurtOwl !== null && !seen.has("5-owl-killed")) {
      const { row, col } = hurtOwl;
      const owl = s.enemies.find((e) => e.row === row && e.col === col);
      if (owl === undefined || owl.deadFrames > 0) shoot("5-owl-killed", "its second spark kills the hurt Owl");
    }
    if (s.lives < lives) {
      lives = s.lives;
      if (s.lives === 2) {
        v.step(20);
        shoot("6-life-lost", "an enemy or a shot costs a life: the firefly bursts");
        continue;
      }
    }
    if (s.stage === 2 && s.stageTick === 40) shoot("7-stage-2", "the next stage starts when every enemy is dead");
    if (s.over) shoot("8-game-over", "the last life ends the run");

    // Hold fire until the first formation is complete; after stage 2 opens,
    // stop shooting so the run ends.
    const idle = (s.stage === 1 && !seen.has("2-formation")) || (s.stage >= 2 && s.stageTick > 200);
    v.step(2, idle ? {} : botInput(s));
  }

  g = game(v);
  for (const name of [
    "0-enemy-past-edge",
    "1-stage-1",
    "2-formation",
    "3-dive-shots",
    "4-owl-hurt",
    "5-owl-killed",
    "6-life-lost",
    "7-stage-2",
  ])
    check(seen.has(name), `saw ${name}`);
  check(g.menu === "payout", "game over opens the payout", g.menu);
  check(
    g.payout?.score === lastScore && g.payout.total === ticketsFor(lastScore) && lastScore > 0,
    `the payout turns the score (${lastScore}) into ${ticketsFor(lastScore)} tickets`,
    g.payout,
  );
  v.frame("9-payout", 2);
  const changed = outlinePixelsChanged(v);
  check(changed === 0, "the payout and its dim stay inside the screen: the outline stays the cabinet art", changed);
  v.tap("space");
  v.step(1);
  v.frame("10-payout-counted", 2);
}

function sheets(v: Verify): void {
  console.log("new sprite sheets:");
  for (const { file: path, render } of fireflyArtFiles.filter((f) =>
    ["owl.png", "owl-hurt.png", "shot.png"].includes(basename(f.file)),
  )) {
    const file = basename(path);
    const png = PNG.sync.write(render());
    writeFileSync(join(v.dir, `sheet-${file}`), upscale(png, 8));
    check(Buffer.compare(readFileSync(join(repoRoot, path)), png) === 0, `${file} is the committed file (8x)`);
  }
}

function video(v: Verify): void {
  console.log("video:");
  v.record(
    "playing",
    () => {
      v.page.eval(`window.__arcade.load("game", { software: "firefly" }); "ok"`);
      v.wait(2500);
      v.hold("Space", () => {
        for (let i = 0; i < 4; i++) {
          v.key("ArrowLeft", 900);
          v.wait(1200);
          v.key("ArrowRight", 1800);
          v.wait(1200);
          v.key("ArrowLeft", 900);
          v.wait(1500);
        }
      });
      v.wait(1000);
    },
    { scene: "game" },
  );
  const sounds = evalJson(v.page, "JSON.stringify(window.__arcade.sounds())", isStringArray);
  check(
    ["play:stage", "play:spark", "play:hit"].every((e) => sounds.includes(e)),
    "the recording played Firefly: the stage fanfare, sparks and hits",
    sounds.filter((e) => e.startsWith("play:")),
  );
  v.screenshot("playing-screenshot");
}

await verify("firefly", (v) => {
  playToPayout(v);
  sheets(v);
  video(v);
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
