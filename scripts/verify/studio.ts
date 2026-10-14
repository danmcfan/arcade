// Check of the art studio (`bun run verify studio`): starts `bun run studio`,
// opens Sweet Sam's walk frames, loads a variant written to
// out/studio/variants/, draws with the pencil and undoes it. It never saves,
// so the art sources stay as they are. Screenshots go to out/verify/studio/.

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "../../test/parity/fixtures.ts";
import { verify } from "../harness.ts";

const name = "studio";
const spec = "src/sweet-sam/art.ts:bearWalk.down";
const variants = join(repoRoot, "out/studio/variants/verify-studio.json");

let checks = 0;
function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

mkdirSync(join(repoRoot, "out/studio/variants"), { recursive: true });
// A candidate an agent would write: the walk with the step frame's feet swapped.
const step = [
  "................",
  "..kkk......kkk..",
  "..kokkkkkkkkok..",
  "..kkrrrrrrrrkk..",
  "...krrrrrrrrk...",
  "..krrrwrrwrrrk..",
  "..krrrwkkwrrrk..",
  "..krrrrrrrrrrk..",
  "...krrrrrrrrkk..",
  "....kkkkkkkkkrk.",
  "...kkroooorrkrk.",
  "..krrkooooorrkk.",
  "..krrkrrrrrrrk..",
  "...kkkkkkkkkrk..",
  ".........krrk...",
  "..........kk....",
];
writeFileSync(variants, JSON.stringify({ [spec]: { "other foot": [step, step] } }));

await verify(
  name,
  (v) => {
    const { page } = v;
    page.run("set", "viewport", "1280", "800");
    page.run("open", `${v.url}/?spec=${encodeURIComponent(spec)}`);
    page.run("wait", "--fn", "document.querySelector('#frames canvas') !== null");
    check(
      page.eval("document.querySelectorAll('#frames canvas').length") === "2",
      "the walk opens as a strip of 2 frames",
    );
    check(
      page.eval("document.querySelectorAll('#palette .swatch').length") === "16",
      "the palette is the 16 Sweetie letters",
    );
    v.screenshot("1-open");

    page.eval(
      `[...document.querySelectorAll('#variants button')].find((b) => b.textContent.includes('other foot')).click(); "ok"`,
    );
    check(page.eval("document.querySelector('#dirty').textContent") !== "", "loading a variant marks the art unsaved");
    v.screenshot("2-variant");

    page.eval(`document.querySelector('#undo').click(); "ok"`);
    check(page.eval("document.querySelector('#dirty').textContent") === "", "undo returns to the source rows");

    // The pencil in blue at the cell (8, 0), with mirror X on.
    page.eval(`
    [...document.querySelectorAll('#palette .swatch')].find((b) => b.textContent === 'b').click();
    [...document.querySelectorAll('#tools button')].find((b) => b.textContent === 'Mirror X').click();
    const c = document.querySelector('#editor'), r = c.getBoundingClientRect(), z = r.width / 16;
    const at = { clientX: r.left + 2 * z + 1, clientY: r.top + 1, bubbles: true };
    c.dispatchEvent(new MouseEvent('mousedown', at));
    window.dispatchEvent(new MouseEvent('mouseup', at));
    "ok"`);
    check(page.eval("document.querySelector('#dirty').textContent") !== "", "drawing marks the art unsaved");
    v.screenshot("3-drawn");

    const errors = page.eval("document.querySelector('#status').textContent");
    check(!errors.startsWith("error"), "no error in the status", errors);
    v.assertNoErrors();
    console.log(`\n${checks} checks passed.`);
  },
  { server: (port) => ["bun", "scripts/studio.ts", `--port=${port}`] },
);
rmSync(variants, { force: true });
