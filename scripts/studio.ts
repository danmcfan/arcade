// `bun run studio`: an Aseprite-lite editor for the art sources (the table in
// docs/agents/pixel-art.md). It serves scripts/studio.html on
// http://localhost:4100 (`--port=N` to change it). The page opens any rows
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
import { checkRows } from "./pixel-art.ts";
import { exportValue, isRecord, parseSpec, type SourceSpec } from "./pixel.ts";
import {
  artSources,
  asRowsValue,
  isFrames,
  isSaveable,
  writeRows,
  type RowsValue,
  type StudioItem,
} from "./studio-source.ts";
import page from "./studio.html";

const variantsDir = join(repoRoot, "out/studio/variants");

/** Glyph rows draw in `#`; the font is the one source that uses them. */
function isGlyph(value: RowsValue): boolean {
  return (isFrames(value) ? value.flat() : value).some((row) => row.includes("#"));
}

/** Every export (and record entry) in `file` written out as rows; computed ones cannot be saved, so are left out. */
async function itemsIn(file: string): Promise<StudioItem[]> {
  const mod: unknown = await import(join(repoRoot, file));
  if (!isRecord(mod)) return [];
  const source = readFileSync(join(repoRoot, file), "utf8");
  const items: StudioItem[] = [];
  const add = (spec: string, name: string, key: string | undefined, value: RowsValue): void => {
    if (isSaveable(source, name, key)) items.push({ spec, frames: isFrames(value), glyph: isGlyph(value) });
  };
  for (const [name, value] of Object.entries(mod)) {
    const v = asRowsValue(value);
    if (v !== undefined) add(`${file}:${name}`, name, undefined, v);
    else if (isRecord(value)) {
      for (const [key, entry] of Object.entries(value)) {
        const e = asRowsValue(entry);
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
      const v = asRowsValue(rows);
      if (v !== undefined) out[`${f.slice(0, -5)}: ${label}`] = v;
    }
  }
  return out;
}

/** `spec` parsed, when it names an export of one of the art sources. */
function sourceSpec(spec: string): SourceSpec {
  const parsed = parseSpec(spec);
  if (parsed === undefined || !artSources.includes(parsed.file))
    throw new Error(`"${spec}" is not an art source export`);
  return parsed;
}

/** The rows `spec` holds now, read from disk. */
async function currentRows(spec: SourceSpec): Promise<RowsValue> {
  const value = asRowsValue(await exportValue(spec));
  if (value === undefined) throw new Error(`${spec.file}:${spec.name} is not rows`);
  return value;
}

/**
 * Throw unless `value` can replace what `spec` holds now: the same shape (one
 * image or frames) and, frame by frame, what `checkRows` accepts at the
 * export's current size, which the generators' tests and drift tests expect.
 */
function checkSave(spec: string, before: RowsValue, value: RowsValue): void {
  if (isFrames(before) !== isFrames(value)) {
    throw new Error(`${spec} is ${isFrames(before) ? "a list of frames" : "one image"}; save the same shape`);
  }
  const [first] = isFrames(before) ? before : [before];
  const size = { w: first?.[0]?.length ?? 0, h: first?.length ?? 0 };
  const palette = isGlyph(before) ? { "#": sweetie.w } : sweetie;
  (isFrames(value) ? value : [value]).forEach((rows, i) => {
    checkRows(`${spec} frame ${i}`, rows, size, palette);
  });
}

function run(cmd: string[]): { ok: boolean; output: string } {
  const r = Bun.spawnSync(cmd, { cwd: repoRoot, stdout: "pipe", stderr: "pipe" });
  return { ok: r.exitCode === 0, output: `${r.stdout.toString()}${r.stderr.toString()}` };
}

/**
 * Write `value` into `spec`'s rows literal and regenerate the art. Prettier
 * then tidies the block, but only when the file was Prettier-clean before, so
 * nothing outside the block can change.
 */
async function save(spec: string, value: unknown): Promise<{ ok: boolean; output: string }> {
  const parsed = sourceSpec(spec);
  const rows = asRowsValue(value);
  if (rows === undefined) throw new Error("the rows to save are not rows or frames of rows");
  checkSave(spec, await currentRows(parsed), rows);
  const wasClean = run(["bunx", "prettier", "--check", parsed.file]).ok;
  const path = join(repoRoot, parsed.file);
  writeFileSync(path, writeRows(readFileSync(path, "utf8"), parsed.name, parsed.key, rows));
  if (wasClean) {
    const format = run(["bunx", "prettier", "--write", parsed.file]);
    if (!format.ok) return format;
  }
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
          artSources.map(async (f) => {
            const found = await itemsIn(f);
            return found;
          }),
        );
        return reply(items.flat());
      }
      case "/api/palette":
        return reply(sweetie);
      case "/api/open": {
        const value = await currentRows(sourceSpec(spec));
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
    port: Number(/^--port=(\d+)$/u.exec(process.argv[2] ?? "")?.[1] ?? 4100),
    routes: { "/": page },
    fetch: handle,
  });
  console.log(`studio: ${server.url.href}`);
}
