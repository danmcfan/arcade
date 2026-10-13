// End-to-end check of the three cabinets (#15), in a real browser
// (`bun run verify cabinets`). Part 1 drives the `?debug` test hook: from the
// hub it walks up to each cabinet (Sweet Sam, Firefly, Brass Monkey), shows
// its title, presses Space, and checks that the minigame plays inside a
// 336x428 cabinet whose joystick follows every direction. It writes a frame
// per joystick direction and side-by-side.png: each hub title above the
// cabinet it opens. Part 2 records walking into Firefly and Brass Monkey and
// moving the joystick with the arrow keys. Files go to out/verify/cabinets/.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import type { Input } from "../../src/engine/input.ts";
import type { GameSnapshot } from "../../src/game/snapshot.ts";
import type { SoftwareName } from "../../src/game/software.ts";
import { decodeDataUrl } from "../browser.ts";
import { upscale, verify, type Verify } from "../harness.ts";

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

/** How to walk from the hub spawn to each cabinet (as in the arcade-enter-* fixtures). */
const walks: { name: SoftwareName; label: string; sideways: Partial<Input> | null }[] = [
  { name: "hive", label: "sweet-sam", sideways: null },
  { name: "firefly", label: "firefly", sideways: { right: true } },
  { name: "brassMonkey", label: "brass-monkey", sideways: { left: true } },
];

const directions: [string, Partial<Input>, number][] = [
  ["neutral", {}, 0],
  ["up", { up: true }, 1],
  ["down", { down: true }, 2],
  ["left", { left: true }, 3],
  ["right", { right: true }, 4],
];

interface Shot {
  hub: PNG;
  cabinet: PNG;
}

function enterAndJoystick(v: Verify, w: (typeof walks)[number]): Shot {
  console.log(`${w.label}:`);
  v.openHook("scene=game");
  v.step(1);
  if (w.sideways) v.step(24, w.sideways);
  v.step(32, { up: true });
  let s = v.snapshot<GameSnapshot>();
  check(
    s.software === null && s.arcade.title === (w.name === "hive" ? "sweet" : w.name),
    `facing its hub cabinet shows the ${w.label} title`,
    s.arcade.title,
  );
  const hub = canvas(v);

  v.step(1, { up: true, space: true });
  s = v.snapshot<GameSnapshot>();
  check(s.software === w.name, `Up+Space enters ${w.label}`, s.software);

  for (const [dir, input, frame] of directions) {
    v.step(1, input);
    s = v.snapshot<GameSnapshot>();
    const sw = s.sw as { joystick?: number } | null;
    check(sw?.joystick === frame, `${dir}: joystick frame ${frame}`, sw?.joystick);
    v.frame(`${w.label}-${dir}`, 2);
  }
  v.step(1);
  const cabinet = canvas(v);
  check(cabinet.width === 336 && cabinet.height === 428, `${w.label} draws a 336x428 cabinet`, [
    cabinet.width,
    cabinet.height,
  ]);

  // Esc opens the minigame pause menu; Quit game is its third item.
  v.tap("escape");
  v.tap("down");
  v.tap("down");
  v.tap("space");
  check(v.snapshot<GameSnapshot>().software === null, `Esc, Quit game leaves ${w.label} for the hub`);
  return { hub, cabinet };
}

/** Each hub title (scaled to the cabinet's width) above the cabinet it opens, three columns. */
function sideBySide(shots: Shot[], path: string): void {
  const gap = 16;
  const colW = 336;
  const hubScale = 1;
  const hubH = 176 * hubScale;
  const out = new PNG({ width: shots.length * colW + (shots.length + 1) * gap, height: gap + hubH + gap + 428 + gap });
  for (let i = 0; i < out.data.length; i += 4) out.data.set([0x33, 0x3c, 0x57, 255], i);
  const blit = (src: PNG, ox: number, oy: number) => {
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
  const software = () =>
    (JSON.parse(v.page.eval("JSON.stringify(window.__arcade.snapshot())")) as GameSnapshot).software;
  const seen: (SoftwareName | null)[] = [];
  // Esc opens the minigame pause menu; Quit game is its third item.
  const quitGame = () => {
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
      v.key("ArrowRight", 400);
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
      v.key("ArrowLeft", 800);
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
  const shots = walks.map((w) => enterAndJoystick(v, w));
  sideBySide(shots, join(v.dir, "side-by-side.png"));
  console.log(`  wrote ${join(v.dir, "side-by-side.png")}`);
  recordWalk(v);
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
