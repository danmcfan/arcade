// `bun run pixel play <variants.json>`: the preview page, served, with a Play
// link on each option. A click builds that option into its own copy of the
// working tree in the system temp folder (its rows written into the art
// source, then `bun run art` and the build), and opens the real game there on
// its scene's `play` screen with `?debug`. The repo's own source and assets are
// never written; each click copies the working tree again, so edits since the
// last click are in it.

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, normalize, relative, resolve } from "node:path";
import { repoRoot } from "./repo-root.ts";
import { asRowsValue, writeRows } from "./art-source.ts";
import { isRecord, parseSpec, previewPage } from "./pixel.ts";
import { sceneFor, type Scene } from "./pixel-scenes.ts";

// Outside the repo, so bun test, tsc and the linters never see the copies.
const playDir = join(tmpdir(), `arcade-pixel-play-${Bun.hash(repoRoot).toString(36)}`);

/** Top-level entries a game build does not need; node_modules is linked, not copied. */
const skipped = new Set([".git", ".claude", "node_modules", "out", "dist"]);

/** The variants file at `file`, checked to be an object. */
function readVariants(file: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (!isRecord(parsed)) throw new Error(`${file} is not a variants object`);
  return parsed;
}

/** Every label in `variants`, in the order the preview page lists them. */
function labels(variants: Record<string, unknown>): string[] {
  return [...new Set(Object.values(variants).flatMap((byLabel) => (isRecord(byLabel) ? Object.keys(byLabel) : [])))];
}

/** The scene every export in `variants` shows in. */
function sceneOf(variants: Record<string, unknown>): Scene {
  const [spec] = Object.keys(variants);
  const source = spec === undefined ? undefined : parseSpec(spec);
  if (source === undefined) throw new Error("the variants file names no path.ts:name export");
  return sceneFor(relative(repoRoot, resolve(source.file)));
}

function run(cmd: string[], cwd: string): void {
  const r = Bun.spawnSync(cmd, { cwd, stdout: "pipe", stderr: "pipe" });
  if (r.exitCode !== 0) throw new Error(`${cmd.join(" ")} failed:\n${r.stderr.toString()}`);
}

/**
 * Option `label` of `variants` built into `dir`: the working tree copied
 * there, each export that has the option rewritten with its rows, then the
 * art and the game built. Returns the game's build directory.
 */
export function buildOption(variants: Record<string, unknown>, label: string, dir: string): string {
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const entry of readdirSync(repoRoot)) {
    if (!skipped.has(entry)) cpSync(join(repoRoot, entry), join(dir, entry), { recursive: true });
  }
  symlinkSync(join(repoRoot, "node_modules"), join(dir, "node_modules"));
  for (const [spec, byLabel] of Object.entries(variants)) {
    const source = parseSpec(spec);
    const option = isRecord(byLabel) ? asRowsValue(byLabel[label]) : undefined;
    if (source === undefined || option === undefined) continue;
    const file = join(dir, relative(repoRoot, resolve(source.file)));
    writeFileSync(file, writeRows(readFileSync(file, "utf8"), source.name, source.key, option));
  }
  run(["bun", "scripts/gen-art.ts"], dir);
  run(["bun", "build", "./index.html", "--outdir", "dist"], dir);
  return join(dir, "dist");
}

/** The page that seeds the scene's localStorage, then opens the game it was built into. */
function launcher(play: NonNullable<Scene["play"]>): string {
  return `<!doctype html><meta charset="utf-8"><title>Loading…</title><script>
for (const [k, v] of Object.entries(${JSON.stringify(play.storage)})) localStorage.setItem(k, v);
location.replace("game/?debug&${play.query}");
</script>`;
}

/** The file `path` names under `root`, or undefined when it is outside it or missing. */
function fileUnder(root: string, path: string): string | undefined {
  const file = normalize(join(root, path === "" ? "index.html" : path));
  return file.startsWith(root) && existsSync(file) ? file : undefined;
}

/**
 * Serve `file`'s preview page on `port`, building an option each time its
 * Play link is opened. The page is drawn before the server answers, and again
 * when the file changes. Returns the server.
 */
export async function servePlay(file: string, port: number): Promise<ReturnType<typeof Bun.serve>> {
  const variantsFile = resolve(file);
  let page = { mtime: -1, html: "" };
  const pageHtml = async (variants: Record<string, unknown>, scene: Scene): Promise<string> => {
    const mtime = statSync(variantsFile).mtimeMs;
    if (mtime !== page.mtime) {
      const { html } = await previewPage(variantsFile, variants, scene.play === undefined ? undefined : "play");
      page = { mtime, html };
    }
    return page.html;
  };
  const first = readVariants(variantsFile);
  await pageHtml(first, sceneOf(first));
  // One build at a time: they share the art generator's imports and the CPU.
  let queue: Promise<unknown> = Promise.resolve();
  return Bun.serve({
    port,
    async fetch(req) {
      const path = decodeURIComponent(new URL(req.url).pathname);
      try {
        const variants = readVariants(variantsFile);
        const scene = sceneOf(variants);
        if (path === "/") {
          return new Response(await pageHtml(variants, scene), {
            headers: { "content-type": "text/html; charset=utf-8" },
          });
        }
        const [, n, rest] = /^\/play\/(\d+)\/(.*)$/u.exec(path) ?? [];
        const label = labels(variants)[Number(n)];
        if (n === undefined || rest === undefined || label === undefined || scene.play === undefined)
          return new Response("not found", { status: 404 });
        const dir = join(playDir, n);
        if (rest === "") {
          const build = queue.then(() => buildOption(variants, label, dir));
          queue = build.catch(() => null);
          await build;
          console.log(`built option ${n} (${label}) into ${dir}`);
          return new Response(launcher(scene.play), { headers: { "content-type": "text/html; charset=utf-8" } });
        }
        const served = rest.startsWith("game/") ? fileUnder(join(dir, "dist"), rest.slice("game/".length)) : undefined;
        return served === undefined ? new Response("not found", { status: 404 }) : new Response(Bun.file(served));
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.error(`pixel play: ${message}`);
        return new Response(message, { status: 500 });
      }
    },
  });
}
