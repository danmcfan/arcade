// Playing a prototype option in the real game (#107, `bun run verify
// pixel-play`). It writes a variants file with two options for the prize desk
// (as it is, and all red), serves it with `bun run pixel play`, and checks that
// the preview page has a Play link per option. Each link builds its option and
// opens the hub's title screen with the test hook; Continue stands the player
// at the prize desk, and Space opens the prize counter. The red option's desk is
// red in the game, the other's is not, and the repo's art source and assets
// are the same afterwards. Files go to out/verify/pixel-play/.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { decodeDataUrl } from "../browser.ts";
import { deskRect } from "../../src/arcade/desk.ts";
import { deskRows } from "../../src/ui/deskArt.ts";
import { sweetie } from "../../src/ui/sweetie16.ts";
import { repoRoot } from "../../test/parity/fixtures.ts";
import { evalJson, isTitleSnapshot, verify, type Verify } from "../harness.ts";
import { sceneFor } from "../pixel-scenes.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

const variantsFile = join(repoRoot, "out/pixel/variants/pixel-play-verify.json");
mkdirSync(join(repoRoot, "out/pixel/variants"), { recursive: true });
writeFileSync(
  variantsFile,
  JSON.stringify({
    "src/ui/deskArt.ts:deskRows": { "as is": deskRows, red: deskRows.map((r) => r.replaceAll(/[^.]/gu, "r")) },
  }),
);

/** The repo's art: what `bun run pixel play` must leave as it was. */
function artState(): string {
  const r = Bun.spawnSync(["git", "status", "--porcelain", "--", "src", "art"], { cwd: repoRoot });
  const diff = Bun.spawnSync(["git", "diff", "--", "src", "art"], { cwd: repoRoot });
  return r.stdout.toString() + diff.stdout.toString();
}

function isNumber(x: unknown): x is number {
  return typeof x === "number";
}

/** How many of the desk's pixels in the game frame are Sweetie 16 red. */
function redDeskPixels(v: Verify): number {
  const png = PNG.sync.read(decodeDataUrl(v.page.eval("window.__arcade.frame()")));
  const red = [1, 3, 5].map((i) => Number.parseInt(sweetie.r.slice(i, i + 2), 16));
  let n = 0;
  for (let y = deskRect.y; y < deskRect.y + deskRect.h; y++) {
    for (let x = deskRect.x; x < deskRect.x + deskRect.w; x++) {
      const i = (y * png.width + x) * 4;
      if (png.data[i] === red[0] && png.data[i + 1] === red[1] && png.data[i + 2] === red[2]) n++;
    }
  }
  return n;
}

/** Open option `n`'s Play link, Continue, and open the prize counter. */
function playOption(v: Verify, n: number, label: string): number {
  v.open(`play/${n}/`);
  v.page.run("wait", "--fn", "window.__arcade !== undefined");
  v.page.eval("window.__arcade.pause()");
  check(
    v.page.eval("location.pathname") === `/play/${n}/game/`,
    `Play on "${label}" opens its build`,
    v.page.eval("location.pathname"),
  );
  v.tap("space"); // Continue
  v.frame(`${n + 2}-${label.replace(" ", "-")}-hub`);
  const red = redDeskPixels(v);
  v.tap("space"); // the prize counter
  const g = v.snapshot(isTitleSnapshot).game;
  check(g?.menu === "prizeCounter", `"${label}": Continue then Space opens the prize counter`, g?.menu);
  v.frame(`${n + 2}-${label.replace(" ", "-")}-counter`);
  return red;
}

await verify(
  "pixel-play",
  (v) => {
    check(sceneFor("src/ui/deskArt.ts").play !== undefined, "the hub scene has a play screen");
    const before = artState();

    v.open();
    const links = evalJson(v.page, `JSON.stringify(document.querySelectorAll("li a").length)`, isNumber);
    check(links === 2, "the served preview page has a Play link per option", links);
    v.screenshot("1-preview");

    const asIs = playOption(v, 0, "as is");
    const red = playOption(v, 1, "red");
    check(asIs < 100, `the "as is" desk is not red (${asIs} red pixels)`, asIs);
    check(red > 1000, `the "red" desk is red in the game (${red} red pixels)`, red);
    check(artState() === before, "the repo's art source and assets are as they were");

    v.record(
      "play-red",
      () => {
        v.wait(800);
        v.key("Space"); // Continue
        v.wait(800);
        v.key("Space"); // the prize counter
        v.wait(1200);
        v.key("ArrowLeft");
        v.wait(600);
        v.key("ArrowLeft");
        v.wait(1000);
      },
      { path: "play/1/game/", storage: sceneFor("src/ui/deskArt.ts").play?.storage ?? {} },
    );
    v.assertNoErrors();
    console.log(`\n${checks} checks passed.`);
  },
  { server: (port) => ["bun", "scripts/pixel.ts", "play", variantsFile, "--port", String(port)] },
);
