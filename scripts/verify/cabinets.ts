// End-to-end check of the three cabinets (#15; the thin outline since #113),
// in a real browser (`bun run verify cabinets`). Part 1 drives the `?debug`
// test hook: from the hub it walks up to each cabinet (Sweet Sam, Firefly,
// Brass Monkey), shows its title, presses Space, and checks that the
// minigame plays inside its 240x304 cabinet outline, pixel for pixel the
// generated art, at 2x in a 1280x720 window and 3x in a 1920x1080 one. It
// writes a screenshot per game and window and side-by-side.png: each hub
// title above the cabinet it opens. Part 2 records walking into Firefly and
// Brass Monkey and playing a moment of each. Files go to out/verify/cabinets/.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import type { Input } from "../../src/engine/input.ts";
import {
  cabinetHeight,
  cabinetInsetLeft,
  cabinetInsetTop,
  cabinetPlayfieldHeight,
  cabinetPlayfieldWidth,
  cabinetWidth,
} from "../../src/ui/cabinet.ts";
import type { SoftwareName } from "../../src/game/software.ts";
import { decodeDataUrl } from "../browser.ts";
import { isGameSnapshot, upscale, verify, type Verify } from "../harness.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

/** The canvas at logical resolution, decoded. */
function canvas(v: Verify): PNG {
  return PNG.sync.read(decodeDataUrl(v.page.eval("window.__arcade.frame()")));
}

/** How to walk from the hub spawn to each cabinet (as in the arcade-enter-* fixtures), and its outline art. */
const walks: { name: SoftwareName; label: string; sideways: Partial<Input> | null; outline: string }[] = [
  { name: "sweetSam", label: "sweet-sam", sideways: null, outline: "cabinet.png" },
  { name: "firefly", label: "firefly", sideways: { right: true }, outline: "cabinet-firefly.png" },
  { name: "brassMonkey", label: "brass-monkey", sideways: { left: true }, outline: "cabinet-brass-monkey.png" },
];

/** Windows to play in, and the whole-number scale the cabinet gets in each. */
const windows: [number, number, number][] = [
  [1280, 720, 2],
  [1920, 1080, 3],
];

/** Pixels (channels) of the frame outside the screen that differ from the outline art. */
function outlineChanged(frame: PNG, outline: PNG): number {
  let changed = 0;
  for (let y = 0; y < frame.height; y++) {
    for (let x = 0; x < frame.width; x++) {
      const onScreen =
        x >= cabinetInsetLeft &&
        x < cabinetInsetLeft + cabinetPlayfieldWidth &&
        y >= cabinetInsetTop &&
        y < cabinetInsetTop + cabinetPlayfieldHeight;
      if (onScreen) continue;
      const i = (y * frame.width + x) * 4;
      for (let c = 0; c < 4; c++) if (frame.data[i + c] !== outline.data[i + c]) changed++;
    }
  }
  return changed;
}

/** The canvas's on-screen size in device pixels over its logical size. */
function shownScale(v: Verify): number {
  return Number(
    v.page.eval(
      `(() => { const c = document.querySelector("canvas"); return String(c.getBoundingClientRect().width * devicePixelRatio / c.width); })()`,
    ),
  );
}

interface Shot {
  hub: PNG;
  cabinet: PNG;
}

function enterCabinet(v: Verify, w: (typeof walks)[number]): Shot {
  console.log(`${w.label}:`);
  v.openHook("scene=game");
  v.step(1);
  if (w.sideways) v.step(40, w.sideways);
  v.step(32, { up: true });
  let s = v.snapshot(isGameSnapshot);
  check(
    s.software === null && s.arcade.title === (w.name === "sweetSam" ? "sweet" : w.name),
    `facing its hub cabinet shows the ${w.label} title`,
    s.arcade.title,
  );
  const hub = canvas(v);

  v.step(1, { up: true, space: true });
  s = v.snapshot(isGameSnapshot);
  check(s.software === w.name, `Up+Space enters ${w.label}`, s.software);

  v.step(120, { right: true, space: true });
  const cabinet = canvas(v);
  check(
    cabinet.width === cabinetWidth && cabinet.height === cabinetHeight,
    `${w.label} draws a ${cabinetWidth}x${cabinetHeight} cabinet`,
    [cabinet.width, cabinet.height],
  );
  const outline = PNG.sync.read(readFileSync(join(import.meta.dir, "../../src/assets/images", w.outline)));
  const changed = outlineChanged(cabinet, outline);
  check(changed === 0, `${w.label}: everything outside the screen is the ${w.outline} outline`, changed);
  for (const [ww, wh, want] of windows) {
    v.page.run("set", "viewport", String(ww), String(wh));
    v.wait(200);
    const got = shownScale(v);
    check(got === want, `${w.label} shows at ${want}x in a ${ww}x${wh} window`, got);
    v.screenshot(`${w.label}-${ww}x${wh}`);
  }

  // Esc opens the minigame pause menu; Quit game is its third item.
  v.tap("escape");
  v.tap("down");
  v.tap("down");
  v.tap("space");
  check(v.snapshot(isGameSnapshot).software === null, `Esc, Quit game leaves ${w.label} for the hub`);
  return { hub, cabinet };
}

/** Each hub title (scaled to the cabinet's width) above the cabinet it opens, three columns. */
function sideBySide(shots: Shot[], path: string): void {
  const gap = 16;
  const colW = cabinetWidth;
  const hubScale = 1;
  const hubH = 176 * hubScale;
  const out = new PNG({
    width: shots.length * colW + (shots.length + 1) * gap,
    height: gap + hubH + gap + cabinetHeight + gap,
  });
  for (let i = 0; i < out.data.length; i += 4) out.data.set([0x33, 0x3c, 0x57, 255], i);
  const blit = (src: PNG, ox: number, oy: number): void => {
    for (let y = 0; y < src.height; y++) {
      for (let x = 0; x < src.width; x++) {
        const s = (y * src.width + x) * 4;
        if (src.data[s + 3] === 0) continue;
        src.data.copy(out.data, ((oy + y) * out.width + ox + x) * 4, s, s + 4);
      }
    }
  };
  shots.forEach((shot, i) => {
    const x = gap + i * (colW + gap);
    blit(shot.hub, x + Math.trunc((colW - shot.hub.width) / 2), gap);
    blit(shot.cabinet, x, gap + hubH + gap);
  });
  writeFileSync(path, upscale(PNG.sync.write(out), 2));
}

function recordWalk(v: Verify): void {
  console.log("video:");
  const software = (): SoftwareName | null => v.snapshot(isGameSnapshot).software;
  const seen: (SoftwareName | null)[] = [];
  // Esc opens the minigame pause menu; Quit game is its third item.
  const quitGame = (): void => {
    v.key("Escape");
    v.wait(250);
    v.key("ArrowDown");
    v.key("ArrowDown");
    v.key("Space");
  };
  v.record(
    "walkthrough",
    () => {
      v.wait(600);
      // Firefly: right of the spawn.
      v.key("ArrowRight", 720);
      v.key("ArrowUp", 700);
      v.key("Space");
      v.wait(400);
      seen.push(software());
      for (const code of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight"]) {
        v.key(code, 450);
        v.wait(250);
      }
      quitGame();
      v.wait(500);
      // Brass Monkey: left of the spawn.
      v.key("ArrowLeft", 1400);
      v.key("ArrowUp", 300);
      v.key("Space");
      v.wait(400);
      seen.push(software());
      for (const code of ["ArrowUp", "ArrowDown", "ArrowRight", "ArrowLeft", "ArrowRight", "ArrowLeft"]) {
        v.key(code, 450);
        v.wait(250);
      }
      quitGame();
      v.wait(600);
    },
    { scene: "game" },
  );
  check(seen.join() === "firefly,brassMonkey", "the recording walks into Firefly, then Brass Monkey", seen);
}

await verify("cabinets", (v) => {
  const shots = walks.map((w) => enterCabinet(v, w));
  sideBySide(shots, join(v.dir, "side-by-side.png"));
  console.log(`  wrote ${join(v.dir, "side-by-side.png")}`);
  recordWalk(v);
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
