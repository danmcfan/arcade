// `bun run studio`: an Aseprite-lite editor for the art sources (the table in
// docs/agents/pixel-art.md). It serves scripts/studio.html on
// http://localhost:4100 (STUDIO_PORT to change it). The page opens any rows
// export by `path.ts:name` (or `path.ts:name.key`), shows the candidate rows
// an agent wrote to out/studio/variants/*.json, and saves the rows back into
// the export's array literal in the source, then runs `bun run art`.
//
// A variants file maps specs to labelled candidates:
//   { "src/sweet-sam/art.ts:bearWalk.down": { "taller ears": [[...rows], [...rows]] } }

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sweetie } from "../src/ui/sweetie16.ts";
import { repoRoot } from "../test/parity/fixtures.ts";
import { checkRows, type Rows } from "./pixel-art.ts";
import { exportValue, isRows } from "./pixel.ts";
import { writeRows, type RowsValue } from "./studio-source.ts";
import page from "./studio.html";

/** The art sources the studio offers, as in the table in docs/agents/pixel-art.md. */
const sources = [
  "src/ui/glyphs.ts",
  "src/ui/hubArt.ts",
  "src/ui/deskArt.ts",
  "src/ui/employeeArt.ts",
  "src/ui/playerArt.ts",
  "src/ui/tickerArt.ts",
  "src/ui/icons.ts",
  "src/ui/prizeArt.ts",
  "src/firefly/art.ts",
  "src/brass-monkey/art.ts",
  "src/sweet-sam/art.ts",
];

const variantsDir = join(repoRoot, "out/studio/variants");

/** One editable export: a spec, and whether it is one image or a list of frames. */
interface Item {
  spec: string;
  frames: boolean;
  glyph: boolean;
}

function isFrames(v: unknown): v is readonly Rows[] {
  return Array.isArray(v) && v.length > 0 && v.every((f) => isRows(f));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Glyph rows draw in `#`; the font is the one source that uses them. */
function isGlyph(value: RowsValue): boolean {
  return (isFrames(value) ? value.flat() : value).some((row) => row.includes("#"));
}

function asValue(v: unknown): RowsValue | undefined {
  return isRows(v) || isFrames(v) ? v : undefined;
}

/** Every rows export (and record entry) in `file`, best effort: one that fails to import lists nothing. */
async function itemsIn(file: string): Promise<Item[]> {
  const mod: unknown = await import(join(repoRoot, file));
  if (!isRecord(mod)) return [];
  const source = readFileSync(join(repoRoot, file), "utf8");
  const items: Item[] = [];
  const add = (spec: string, name: string, key: string | undefined, value: RowsValue): void => {
    try {
      // Only exports written out as rows can be saved; computed ones are left out.
      writeRows(source, name, key, value);
      items.push({ spec, frames: isFrames(value), glyph: isGlyph(value) });
    } catch {
      // not a literal of rows
    }
  };
  for (const [name, value] of Object.entries(mod)) {
    const v = asValue(value);
    if (v !== undefined) add(`${file}:${name}`, name, undefined, v);
    else if (isRecord(value)) {
      for (const [key, entry] of Object.entries(value)) {
        const e = asValue(entry);
        if (e !== undefined && /^\w+$/u.test(key)) add(`${file}:${name}.${key}`, name, key, e);
      }
    }
  }
  return items;
}

/** The candidates for `spec` from every variants file, labelled `file: label`. */
function variantsFor(spec: string): Record<string, RowsValue> {
  if (!existsSync(variantsDir)) return {};
  const out: Record<string, RowsValue> = {};
  for (const f of readdirSync(variantsDir)
    .filter((n) => n.endsWith(".json"))
    .toSorted()) {
    const parsed: unknown = JSON.parse(readFileSync(join(variantsDir, f), "utf8"));
    const entries = isRecord(parsed) ? parsed[spec] : undefined;
    if (!isRecord(entries)) continue;
    for (const [label, rows] of Object.entries(entries)) {
      const v = asValue(rows);
      if (v !== undefined) out[`${f.slice(0, -5)}: ${label}`] = v;
    }
  }
  return out;
}

/** The spec split into its file, export name and record key. */
function parseSpec(spec: string): { file: string; name: string; key: string | undefined } {
  const m = /^(.+\.ts):(\w+)(?:\.(\w+))?$/u.exec(spec);
  const [, file, name, key] = m ?? [];
  if (file === undefined || name === undefined || !sources.includes(file)) {
    throw new Error(`"${spec}" is not an art source export`);
  }
  return { file, name, key };
}

/**
 * Throw unless `value` can replace what `spec` holds now: the same shape (one
 * image or frames), each frame passing `checkRows`, every frame one size.
 */
function checkSave(spec: string, before: RowsValue, value: RowsValue): void {
  if (isFrames(before) !== isFrames(value)) {
    throw new Error(`${spec} is ${isFrames(before) ? "a list of frames" : "one image"}; save the same shape`);
  }
  const frames = isFrames(value) ? value : [value];
  const palette = isGlyph(before) ? { "#": "#ffffff" } : sweetie;
  const [first] = frames;
  const size = { w: first?.[0]?.length ?? 0, h: first?.length ?? 0 };
  frames.forEach((rows, i) => {
    checkRows(`${spec} frame ${i}`, rows, size, palette);
  });
}

function run(cmd: string[]): { ok: boolean; output: string } {
  const r = Bun.spawnSync(cmd, { cwd: repoRoot, stdout: "pipe", stderr: "pipe" });
  return { ok: r.exitCode === 0, output: `${r.stdout.toString()}${r.stderr.toString()}` };
}

/** Write `value` into `spec`'s source, format the file and regenerate the art. */
async function save(spec: string, value: unknown): Promise<{ ok: boolean; output: string }> {
  const { file, name, key } = parseSpec(spec);
  const rows = asValue(value);
  if (rows === undefined) throw new Error("the rows to save are not rows or frames of rows");
  const before = asValue(await exportValue(spec));
  if (before === undefined) throw new Error(`${spec} is not rows`);
  checkSave(spec, before, rows);
  const path = join(repoRoot, file);
  writeFileSync(path, writeRows(readFileSync(path, "utf8"), name, key, rows));
  const format = run(["bunx", "prettier", "--write", file]);
  if (!format.ok) return format;
  return run(["bun", "run", "art"]);
}

function reply(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

async function handle(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const spec = url.searchParams.get("spec") ?? "";
  try {
    switch (url.pathname) {
      case "/api/items": {
        const items = await Promise.all(
          sources.map(async (f) => {
            const found = await itemsIn(f);
            return found;
          }),
        );
        return reply(items.flat());
      }
      case "/api/palette":
        return reply(sweetie);
      case "/api/open": {
        parseSpec(spec);
        const value = asValue(await exportValue(spec));
        if (value === undefined) throw new Error(`${spec} is not rows`);
        return reply({ value, glyph: isGlyph(value), variants: variantsFor(spec) });
      }
      case "/api/save": {
        const body: unknown = await req.json();
        if (!isRecord(body) || typeof body["spec"] !== "string") throw new Error("save needs { spec, value }");
        const result = await save(body["spec"], body["value"]);
        return reply(result, result.ok ? 200 : 500);
      }
      default:
        return reply({ error: "not found" }, 404);
    }
  } catch (e: unknown) {
    return reply({ error: e instanceof Error ? e.message : String(e) }, 400);
  }
}

if (import.meta.main) {
  const server = Bun.serve({
    port: Number(process.env["STUDIO_PORT"] ?? 4100),
    routes: { "/": page },
    fetch: handle,
  });
  console.log(`studio: ${server.url.href}`);
}
