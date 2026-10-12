// Firefly's night-theme art (#33) in a real browser (`bun run verify firefly-art`).
// Part 1 drives the `?debug` test hook through the start of the firefly-play
// fixture (seed 1, Space held while sweeping) and checks the canvas pixel by
// pixel against the generated PNGs: the night background wherever no sprite
// is drawn, the firefly, every spark, every Moth in the frame for its heading
// and the hit effect on a Moth that was just hit. Part 2 writes each
// generated sprite sheet scaled up, the Wasp and Owl included (the game does
// not draw them yet, #34). Part 3 records Firefly played with the keyboard.
// Files go to out/verify/firefly-art/.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import type { FireflySnapshot, GameSnapshot } from "../../src/game/snapshot.ts";
import { angle, frameAngle } from "../../src/firefly/game.ts";
import { snap } from "../../src/engine/surface.ts";
import { cabinetInsetLeft, cabinetInsetTop } from "../../src/ui/cabinet.ts";
import { decodeDataUrl } from "../browser.ts";
import { fireflyArtFiles, fireflyImagesDir } from "../gen-firefly-art.ts";
import { upscale, verify, type Verify } from "../harness.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

const sheet = (file: string): PNG => PNG.sync.read(readFileSync(join(fireflyImagesDir, file)));
const background = sheet("background.png");
const firefly = sheet("firefly.png");
const spark = sheet("spark.png");
const moth = sheet("moth.png");
const hit = sheet("hit.png");

/** The canvas at logical resolution, decoded. */
function canvas(v: Verify): PNG {
  return PNG.sync.read(decodeDataUrl(v.page.eval("window.__arcade.frame()")));
}

function fireflySnapshot(v: Verify): FireflySnapshot {
  const g = v.snapshot<GameSnapshot>();
  if (g.software !== "firefly" || g.sw === null) throw new Error(`not in Firefly: ${g.software}`);
  return g.sw as FireflySnapshot;
}

/** A sprite-sized piece of `src` drawn at canvas (x, y). */
interface Placed {
  src: PNG;
  sx: number;
  sy: number;
  w: number;
  h: number;
  x: number;
  y: number;
}

const px = (png: PNG, x: number, y: number): number => png.data.readUInt32BE((y * png.width + x) * 4);

/** Share of the sprite's opaque pixels that show on the canvas exactly. */
function shown(frame: PNG, p: Placed): number {
  let opaque = 0;
  let same = 0;
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const s = px(p.src, p.sx + x, p.sy + y);
      if ((s & 255) === 0) continue;
      opaque++;
      if (px(frame, p.x + x, p.y + y) === s) same++;
    }
  }
  return opaque === 0 ? 0 : same / opaque;
}

/** Where the game draws every sprite this tick (game.ts `draw`). */
function placements(s: FireflySnapshot): { player: Placed; sparks: Placed[]; moths: Placed[]; hits: Placed[] } {
  const ox = cabinetInsetLeft;
  const oy = cabinetInsetTop;
  const player = { src: firefly, sx: 0, sy: 0, w: 16, h: 16, x: snap(s.player.x + ox - 8), y: snap(s.player.y + oy - 8) };
  const sparks = s.bullets.map((b) => ({ src: spark, sx: 0, sy: 0, w: 8, h: 8, x: snap(b.x + ox), y: snap(b.y + oy) }));
  const moths: Placed[] = [];
  const hits: Placed[] = [];
  for (const b of s.bugs) {
    if (b.x <= 0 || b.x >= 224 || b.y <= 0 || b.y >= 288) continue;
    if (b.deadFrames > 0) {
      const col = 5 - Math.trunc(b.deadFrames / 15);
      if (col < 5) hits.push({ src: hit, sx: col * 32, sy: 0, w: 32, h: 32, x: snap(b.x + ox - 16), y: snap(b.y + oy - 16) });
      continue;
    }
    const [row, col] = frameAngle(angle({ x: b.dx, y: b.dy }));
    moths.push({ src: moth, sx: col * 16, sy: row * 16, w: 16, h: 16, x: snap(b.x + ox - 8), y: snap(b.y + oy - 8) });
  }
  return { player, sparks, moths, hits };
}

/** Playfield pixels outside every sprite box that differ from background.png. */
function backgroundMisses(frame: PNG, boxes: Placed[]): number {
  let misses = 0;
  for (let y = 0; y < background.height; y++) {
    for (let x = 0; x < background.width; x++) {
      const cx = x + cabinetInsetLeft;
      const cy = y + cabinetInsetTop;
      if (boxes.some((b) => cx >= b.x && cx < b.x + b.w && cy >= b.y && cy < b.y + b.h)) continue;
      if (px(frame, cx, cy) !== px(background, x, y)) misses++;
    }
  }
  return misses;
}

/** At least `share` of each sprite's pixels show (later sprites may overlap earlier ones). */
function checkSprites(frame: PNG, what: string, placed: Placed[], share = 0.9): void {
  const worst = placed.map((p) => shown(frame, p));
  check(worst.every((w) => w >= share), `${placed.length} ${what} drawn from the generated sheet`, worst.map((w) => w.toFixed(2)));
}

function checkFrame(v: Verify, name: string, want: { sparks: boolean; moths: number; hit: boolean }): void {
  const s = fireflySnapshot(v);
  const frame = canvas(v);
  const p = placements(s);
  console.log(`${name} (tick ${v.snapshot<GameSnapshot>().tick}):`);
  check(backgroundMisses(frame, [p.player, ...p.sparks, ...p.moths, ...p.hits]) === 0, "everywhere else the playfield is the night background (sky, stars, grass)");
  check(shown(frame, p.player) === 1, "the firefly is drawn exactly", s.player);
  if (want.sparks) {
    check(p.sparks.length > 0, "sparks are in flight", s.bullets.length);
    checkSprites(frame, "sparks", p.sparks);
  }
  if (want.moths > 0) {
    check(p.moths.length >= want.moths, `at least ${want.moths} Moths on screen`, p.moths.length);
    checkSprites(frame, "Moths", p.moths);
  }
  if (want.hit) {
    check(p.hits.length > 0, "a Moth was hit", s.bugs.map((b) => b.deadFrames));
    checkSprites(frame, "hit effects", p.hits, 0.8);
  }
  v.frame(name, 2);
}

function play(v: Verify): void {
  v.openHook("scene=game");
  v.page.eval(`window.__arcade.seed(1); window.__arcade.load("game", { software: "firefly" }); "ok"`);
  // The firefly-play fixture's first steps.
  v.step(1);
  checkFrame(v, "1-start", { sparks: false, moths: 0, hit: false });
  v.step(59, { left: true, space: true });
  checkFrame(v, "2-sparks-and-a-hit", { sparks: true, moths: 3, hit: true });
  v.step(120, { right: true, space: true });
  v.step(60, { left: true, space: true });
  v.step(90, { space: true });
  v.step(30, { left: true, space: true });
  checkFrame(v, "3-more-hits", { sparks: true, moths: 1, hit: true });
}

function sheets(v: Verify): void {
  console.log("sprite sheets:");
  for (const { file, render } of fireflyArtFiles) {
    const png = PNG.sync.write(render());
    const scale = file === "background.png" ? 2 : 8;
    writeFileSync(join(v.dir, `sheet-${file}`), upscale(png, scale));
    check(Buffer.compare(readFileSync(join(fireflyImagesDir, file)), png) === 0, `${file} is the committed file (written ${scale}x)`);
  }
}

function video(v: Verify): void {
  console.log("video:");
  v.record(
    "playing",
    () => {
      v.page.eval(`window.__arcade.load("game", { software: "firefly" }); "ok"`);
      v.wait(1200);
      v.hold("Space", () => {
        v.key("ArrowLeft", 900);
        v.key("ArrowRight", 1800);
        v.wait(800);
        v.key("ArrowLeft", 1400);
        v.wait(1500);
        v.key("ArrowRight", 700);
        v.wait(1200);
      });
      v.wait(1000);
    },
    { scene: "game" },
  );
  const sounds = JSON.parse(v.page.eval("JSON.stringify(window.__arcade.sounds())")) as string[];
  check(fireflySnapshot(v).bugs.length > 0 && sounds.includes("play:laser") && sounds.includes("play:boom"), "the recording played Firefly: sparks fired and a Moth hit", sounds.filter((e) => e.startsWith("play:")));
  v.screenshot("playing-screenshot");
}

await verify("firefly-art", (v) => {
  play(v);
  sheets(v);
  video(v);
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
