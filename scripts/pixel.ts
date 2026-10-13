// `bun run pixel`: look at pixel art and read it back as rows, without a
// scratch script. Sheets go to out/pixel/ (git ignores out/); read the PNG
// it prints.
//
//   bun run pixel rows    <image>...                  each image as Sweetie 16 letter rows
//   bun run pixel colours <image>...                  each colour, its letter and pixel count
//   bun run pixel show    <image>...                  one labelled sheet, scaled up
//   bun run pixel before  <image>... [--ref <rev>]    <rev>'s version beside the working copy (PNG or source)
//   bun run pixel place   <base> <image>@x,y...       images drawn onto <base> at (x, y)
//
// An <image> is one of:
//   path.png             the whole PNG
//   path.png#x,y,w,h     one area of it, e.g. one frame of a sheet
//   path.ts:name         rows exported by an art source, drawn without `bun run art`:
//                        a list of rows, a list of lists, or a record of them (one image each);
//                        glyph rows (`#` and `.`) draw in white
//   path.ts:name.key     one entry of such a list or record, e.g. src/ui/prizeArt.ts:prizeArt.honeyJar
//
// Options: --scale N (default: fits each image to about 384 px, at most 8x),
// --out <file.png> (show, before and place), --ref <rev> (before; default
// origin/main).

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { PNG } from "pngjs";
import { glyphHeight, glyphs } from "../src/ui/glyphs.ts";
import { sweetie } from "../src/ui/sweetie16.ts";
import { repoRoot } from "../test/parity/fixtures.ts";
import { blank, colours, letters, paint, plot, scale, toPng, toRows, type Rows } from "./pixel-art.ts";

/** One image to show, with the label it gets on a sheet. */
export interface Panel {
  label: string;
  png: PNG;
}

const outDir = join(repoRoot, "out/pixel");

function crop(png: PNG, x: number, y: number, w: number, h: number): PNG {
  if (x < 0 || y < 0 || x + w > png.width || y + h > png.height) {
    throw new Error(`area ${x},${y},${w},${h} is outside the ${png.width}x${png.height} image`);
  }
  const out = blank(w, h);
  PNG.bitblt(png, out, x, y, w, h, 0, 0);
  return out;
}

function parseArea(area: string): [number, number, number, number] {
  const n = area.split(",").map(Number);
  if (n.length !== 4 || n.some((v) => !Number.isInteger(v))) throw new Error(`area "${area}" is not x,y,w,h`);
  return n as [number, number, number, number];
}

function isRows(v: unknown): v is Rows {
  return Array.isArray(v) && v.length > 0 && v.every((r) => typeof r === "string");
}

/** Sweetie 16, plus `#` in white for the font's glyph rows. */
const sourcePalette = { ...sweetie, "#": sweetie.w };

/** `file` as committed at `rev`, or undefined when it is not there. */
function gitShow(rev: string, file: string): Buffer | undefined {
  const r = Bun.spawnSync(["git", "show", `${rev}:${relative(repoRoot, resolve(file))}`], {
    cwd: repoRoot,
    stdout: "pipe",
    stderr: "pipe",
  });
  return r.exitCode === 0 ? Buffer.from(r.stdout) : undefined;
}

/** The module at `file`, or its `rev` version (copied next to it for the import, then removed). */
async function importAt(file: string, rev: string | undefined): Promise<Record<string, unknown> | undefined> {
  if (rev === undefined) return (await import(resolve(file))) as Record<string, unknown>;
  const source = gitShow(rev, file);
  if (source === undefined) return undefined;
  const copy = join(dirname(resolve(file)), `.pixel-${Date.now()}-${basename(file)}`);
  writeFileSync(copy, source);
  try {
    return (await import(copy)) as Record<string, unknown>;
  } finally {
    rmSync(copy);
  }
}

/** The images an <image> argument names (see the header), at `rev` when given; [] when it is not there. */
export async function load(spec: string, rev?: string): Promise<Panel[]> {
  const ts = /^(.+\.ts):(\w+)(?:\.(\w+))?$/.exec(spec);
  if (ts) {
    const [, file, name, key] = ts as unknown as [string, string, string, string | undefined];
    const mod = await importAt(file, rev);
    if (mod === undefined) return [];
    let value = mod[name];
    if (key !== undefined) {
      value = (value as Record<string, unknown> | undefined)?.[key];
      if (value === undefined) {
        if (rev !== undefined) return [];
        throw new Error(`${file}'s ${name} has no entry "${key}"`);
      }
    }
    if (isRows(value))
      return [{ label: key === undefined ? name : `${name} ${key}`, png: toPng(value, sourcePalette) }];
    const entries = Array.isArray(value)
      ? value.map((v, i) => [String(i), v] as const)
      : Object.entries((value ?? {}) as object);
    const panels = entries
      .filter(([, v]) => isRows(v))
      .map(([k, v]) => ({ label: `${name} ${k}`, png: toPng(v as Rows, sourcePalette) }));
    if (panels.length === 0 && rev === undefined) throw new Error(`${file} exports no rows named "${name}"`);
    return panels;
  }
  const [file, area] = spec.split("#") as [string, string | undefined];
  const bytes = rev === undefined ? readFileSync(file) : gitShow(rev, file);
  if (bytes === undefined) return [];
  const png = PNG.sync.read(bytes);
  return [{ label: basename(spec).replace("#", " "), png: area ? crop(png, ...parseArea(area)) : png }];
}

async function loadOne(spec: string): Promise<PNG> {
  const panels = await load(spec);
  if (panels.length !== 1) throw new Error(`${spec} is ${panels.length} images; name one`);
  return panels[0]!.png;
}

/** The largest whole scale, up to 8, that keeps the image within about 384 px. */
export function autoScale(png: PNG): number {
  return Math.max(1, Math.min(8, Math.floor(384 / Math.max(png.width, png.height))));
}

const labelScale = 2;
const gap = 16;
const maxSheetWidth = 1800;
const sheetColour = "#202020";
const labelColour = "#f4f4f4";
const checker = ["#8c8c8c", "#a0a0a0"];

/** `text` in the game font, white, at 2x. */
function label(text: string): PNG {
  const chars = [...text.toUpperCase()].map((ch) => glyphs[ch] ?? glyphs["?"]!);
  const png = blank(
    chars.reduce((w, rows) => w + rows[0]!.length + 1, 0),
    glyphHeight,
  );
  let x = 0;
  for (const rows of chars) {
    paint(png, rows, { "#": labelColour }, x, 0);
    x += rows[0]!.length + 1;
  }
  return scale(png, labelScale);
}

/** Copy `png`'s opaque pixels into `out` at (x, y); transparent pixels and those outside `out` are skipped. */
function stamp(out: PNG, png: PNG, x: number, y: number): void {
  for (let py = 0; py < png.height; py++) {
    for (let px = 0; px < png.width; px++) {
      const i = (py * png.width + px) * 4;
      const X = x + px;
      const Y = y + py;
      if (png.data[i + 3] === 0 || X < 0 || Y < 0 || X >= out.width || Y >= out.height) continue;
      png.data.copy(out.data, (Y * out.width + X) * 4, i, i + 4);
    }
  }
}

/**
 * The panels scaled up (each by `k`, or its own autoScale), on a checker that
 * shows transparency, labelled above, left to right, wrapping at ~1800 px.
 */
export function sheet(panels: readonly Panel[], k?: number): PNG {
  const labelH = glyphHeight * labelScale + 6;
  const tiles = panels.map((p) => ({ label: label(p.label), png: scale(p.png, k ?? autoScale(p.png)) }));
  const placed: { x: number; y: number; tile: (typeof tiles)[number] }[] = [];
  let x = gap;
  let y = gap;
  let rowH = 0;
  let width = 0;
  for (const tile of tiles) {
    const w = Math.max(tile.png.width, tile.label.width);
    if (x > gap && x + w > maxSheetWidth) {
      x = gap;
      y += rowH + gap;
      rowH = 0;
    }
    placed.push({ x, y, tile });
    x += w + gap;
    rowH = Math.max(rowH, labelH + tile.png.height);
    width = Math.max(width, x);
  }
  const out = blank(width, y + rowH + gap);
  for (let i = 0; i < out.width * out.height; i++) plot(out, i % out.width, Math.trunc(i / out.width), sheetColour);
  for (const { x, y, tile } of placed) {
    stamp(out, tile.label, x, y);
    const top = y + labelH;
    for (let py = 0; py < tile.png.height; py++) {
      for (let px = 0; px < tile.png.width; px++)
        plot(out, x + px, top + py, checker[(Math.trunc(px / 8) + Math.trunc(py / 8)) % 2]!);
    }
    stamp(out, tile.png, x, top);
  }
  return out;
}

/** `base` with each image drawn over it at its (x, y); transparent pixels leave the base. */
export function place(base: PNG, items: readonly { png: PNG; x: number; y: number }[]): PNG {
  const out = blank(base.width, base.height);
  base.data.copy(out.data);
  for (const { png, x, y } of items) stamp(out, png, x, y);
  return out;
}

function write(png: PNG, out: string): void {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, PNG.sync.write(png));
  console.log(`wrote ${relative(process.cwd(), out)} (${png.width}x${png.height})`);
}

function usage(): never {
  const header = readFileSync(import.meta.path, "utf8").split("\n\n")[0]!;
  console.error(header.replace(/^\/\/ ?/gm, ""));
  process.exit(1);
}

async function main(argv: string[]): Promise<void> {
  const opts: Record<string, string> = {};
  const args: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith("--")) opts[a.slice(2)] = argv[++i] ?? usage();
    else args.push(a);
  }
  const [command, ...specs] = args;
  const k = opts["scale"] === undefined ? undefined : Number(opts["scale"]);
  if (k !== undefined && !(Number.isInteger(k) && k > 0))
    throw new Error(`--scale ${opts["scale"]} is not a whole number above 0`);
  const out = (name: string): string => resolve(opts["out"] ?? join(outDir, `${name}.png`));
  if (specs.length === 0) usage();

  switch (command) {
    case "rows": {
      for (const spec of specs) {
        for (const { label, png } of await load(spec)) {
          console.log(`// ${label}: ${png.width}x${png.height}, Sweetie 16 letters (src/ui/sweetie16.ts)`);
          for (const row of toRows(png)) console.log(`"${row}",`);
        }
      }
      return;
    }
    case "colours": {
      const letterOf = letters();
      for (const spec of specs) {
        for (const { label, png } of await load(spec)) {
          console.log(`${label} (${png.width}x${png.height})`);
          for (const [c, n] of [...colours(png)].sort((a, b) => b[1] - a[1])) {
            console.log(
              `  ${c.padEnd(11)} ${(letterOf.get(c) ?? (c === "transparent" ? "." : "not Sweetie 16")).padEnd(14)} ${n}`,
            );
          }
        }
      }
      return;
    }
    case "show": {
      const panels = (await Promise.all(specs.map((s) => load(s)))).flat();
      write(sheet(panels, k), out("show"));
      console.log(panels.map((p) => p.label).join(" | "));
      return;
    }
    case "before": {
      const rev = opts["ref"] ?? "origin/main";
      if (
        Bun.spawnSync(["git", "rev-parse", "--verify", "--quiet", `${rev}^{commit}`], { cwd: repoRoot }).exitCode !== 0
      ) {
        throw new Error(`--ref ${rev} is not a commit`);
      }
      const panels: Panel[] = [];
      for (const spec of specs) {
        const before = new Map((await load(spec, rev)).map((p) => [p.label, p.png]));
        for (const after of await load(spec)) {
          const old = before.get(after.label);
          if (old) panels.push({ label: `before ${after.label}`, png: old });
          panels.push({ label: `${old ? "after" : "new"} ${after.label}`, png: after.png });
        }
      }
      write(sheet(panels, k ?? Math.min(...panels.map((p) => autoScale(p.png)))), out("before-after"));
      return;
    }
    case "place": {
      const [baseSpec, ...rest] = specs as [string, ...string[]];
      const items = await Promise.all(
        rest.map(async (s) => {
          const at = /^(.+)@(-?\d+),(-?\d+)$/.exec(s);
          if (!at) throw new Error(`"${s}" is not <image>@x,y`);
          return { png: await loadOne(at[1]!), x: Number(at[2]), y: Number(at[3]) };
        }),
      );
      const base = await loadOne(baseSpec);
      const png = place(base, items);
      write(scale(png, k ?? autoScale(png)), out("place"));
      return;
    }
    default:
      usage();
  }
}

if (import.meta.main) {
  main(process.argv.slice(2)).catch((e: unknown) => {
    console.error(`pixel: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  });
}
