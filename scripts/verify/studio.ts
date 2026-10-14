// Check of the art studio (`bun run verify studio`): starts `bun run studio`,
// opens Sweet Sam's walk frames, loads a variant written to
// out/studio/variants/, draws with the pencil and undoes it. It never saves,
// so the art sources stay as they are. Screenshots go to out/verify/studio/.

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "../../test/parity/fixtures.ts";
import { browser } from "../browser.ts";

const name = "studio";
const dir = join(repoRoot, "out/verify", name);
const spec = "src/sweet-sam/art.ts:bearWalk.down";
const variants = join(repoRoot, "out/studio/variants/verify-studio.json");

let checks = 0;
function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

function freePort(): number {
  const s = Bun.listen({ hostname: "127.0.0.1", port: 0, socket: { data() {} } });
  const { port } = s;
  s.stop(true);
  return port;
}

async function waitUp(url: string, tries: number): Promise<void> {
  try {
    if ((await fetch(url)).ok) return;
  } catch {
    // not up yet
  }
  if (tries <= 0) throw new Error(`studio did not come up on ${url}`);
  await Bun.sleep(100);
  await waitUp(url, tries - 1);
}

mkdirSync(dir, { recursive: true });
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

const port = freePort();
const url = `http://localhost:${port}`;
const server = Bun.spawn(["bun", "scripts/studio.ts"], {
  cwd: repoRoot,
  env: { ...process.env, STUDIO_PORT: String(port) },
  stdout: "ignore",
  stderr: "inherit",
});
const page = browser(`arcade-verify-${name}-${process.pid}`);
const shot = (n: string): void => {
  page.run("screenshot", join(dir, `${n}.png`));
};

try {
  await waitUp(url, 100);
  page.run("set", "viewport", "1280", "800");
  page.run("open", `${url}/?spec=${encodeURIComponent(spec)}`);
  page.run("wait", "--fn", "document.querySelector('#frames canvas') !== null");
  check(
    page.eval("document.querySelectorAll('#frames canvas').length") === "2",
    "the walk opens as a strip of 2 frames",
  );
  check(
    page.eval("document.querySelectorAll('#palette .swatch').length") === "16",
    "the palette is the 16 Sweetie letters",
  );
  shot("1-open");

  page.eval(
    `[...document.querySelectorAll('#variants button')].find((b) => b.textContent.includes('other foot')).click(); "ok"`,
  );
  check(page.eval("document.querySelector('#dirty').textContent") !== "", "loading a variant marks the art unsaved");
  shot("2-variant");

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
  shot("3-drawn");

  const errors = page.eval("document.querySelector('#status').textContent");
  check(!errors.startsWith("error"), "no error in the status", errors);
  console.log(`\n${checks} checks passed.\nverify ${name}: ok. Files: ${dir}`);
} catch (err) {
  console.error(`verify ${name}: FAILED\n${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
} finally {
  try {
    page.run("close");
  } catch {
    // already closed
  }
  server.kill();
  rmSync(variants, { force: true });
}
