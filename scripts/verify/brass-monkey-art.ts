// Brass Monkey's generated art (#38, #39) in a real browser (`bun run verify brass-monkey-art`):
// every generated sheet scaled up, each checked against the committed file.
// The game itself is checked by `bun run verify brass-monkey`. Files go to
// out/verify/brass-monkey-art/.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { brassMonkeyArtFiles, brassMonkeyImagesDir } from "../gen-brass-monkey-art.ts";
import { upscale, verify, type Verify } from "../harness.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

function sheets(v: Verify): void {
  console.log("sprite sheets:");
  for (const { file, render } of brassMonkeyArtFiles) {
    const image = render();
    const png = PNG.sync.write(image);
    // A whole screen, such as the girder floor, needs only 2x to be seen.
    const k = image.width > 128 ? 2 : 8;
    writeFileSync(join(v.dir, `sheet-${file}`), upscale(png, k));
    check(
      Buffer.compare(readFileSync(join(brassMonkeyImagesDir, file)), png) === 0,
      `${file} is the committed file (written ${k}x)`,
    );
  }
}

await verify("brass-monkey-art", (v) => {
  sheets(v);
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
