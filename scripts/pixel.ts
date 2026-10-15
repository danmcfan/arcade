// `bun run pixel`: look at pixel art and read it back as rows, without a
// scratch script. Sheets go to out/pixel/ (git ignores out/); read the PNG
// it prints.
//
//   bun run pixel rows    <image>... [--nearest]      each image as Sweetie 16 letter rows
//   bun run pixel colours <image>...                  each colour, its letter and pixel count
//   bun run pixel show    <image>...                  one labelled sheet, scaled up
//   bun run pixel before  <image>... [--ref <rev>]    <rev>'s version beside the working copy (PNG or source)
//   bun run pixel place   <base> <image>@x,y...       images drawn onto <base> at (x, y)
//   bun run pixel preview <variants.json>             an HTML page: each option drawn into its game screen
//                                                     (<variants.json>: { "path.ts:name": { "<label>": rows or frames } };
//                                                     options sharing a label are one choice)
//   bun run pixel play    <variants.json> [--port N]  the preview page served (default port 3300), with a Play
//                                                     link per option that builds it and opens the real game
//                                                     on its screen (scripts/pixel-play.ts)
//   bun run pixel export  <path.ts:name>...           one PNG sheet in out/aseprite/ to edit in Aseprite: a row
//                                                     per export (a record, e.g. bearWalk, is a row per entry),
//                                                     its frames left to right
//   bun run pixel import  <png> <path.ts:name>...     an edited sheet written back into the same exports' rows,
//                                                     then `bun run art`
//
// An <image> is one of:
//   path.png             the whole PNG
//   path.png#x,y,w,h     one area of it, e.g. one frame of a sheet
//   path.ts:name         rows exported by an art source, drawn without `bun run art`:
//                        a list of rows, a list of lists, or a record of them (one image each);
//                        glyph rows (`#` and `.`) draw in white
//   path.ts:name.key     one entry of such a list or record, e.g. src/ui/prizeArt.ts:prizeArt.honeyJar
//
// Options: --scale N (default: fits each image to about 256 px, at most 8x),
// --out <file> (show, before, place, preview and export), --ref <rev> (before; default
// origin/main), --nearest (rows: letter each colour as the nearest Sweetie 16
// one, to import art drawn in another palette).

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { PNG } from "pngjs";
import { glyphHeight, glyphs } from "../src/ui/glyphs.ts";
import { sweetie } from "../src/ui/sweetie16.ts";
import { repoRoot } from "../test/parity/fixtures.ts";
import { asRowsValue, fromSheet, isRows, toSheet, writeRows, type SheetEntry } from "./art-source.ts";
import { sceneFor, type Scene } from "./pixel-scenes.ts";
import { blank, colours, letters, paint, plot, scale, snap, toPng, toRows, type Rows } from "./pixel-art.ts";

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
  const [x, y, w, h] = n;
  if (
    n.length !== 4 ||
    !n.every((v) => Number.isInteger(v)) ||
    x === undefined ||
    y === undefined ||
    w === undefined ||
    h === undefined
  ) {
    throw new Error(`area "${area}" is not x,y,w,h`);
  }
  return [x, y, w, h];
}

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** `file`'s exports, checked to be an object. */
async function importModule(file: string): Promise<Record<string, unknown>> {
  const mod: unknown = await import(file);
  if (!isRecord(mod)) throw new Error(`${file} did not import as a module`);
  return mod;
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

/** The module in `source`, imported from a copy next to `file` (so its imports resolve), then removed. */
async function importCopy(file: string, source: Buffer): Promise<Record<string, unknown>> {
  const copy = join(dirname(resolve(file)), `.pixel-${Date.now()}-${basename(file)}`);
  writeFileSync(copy, source);
  try {
    return await importModule(copy);
  } finally {
    rmSync(copy);
  }
}

/** The module at `file`, or its `rev` version. */
async function importAt(file: string, rev: string | undefined): Promise<Record<string, unknown> | undefined> {
  const source = rev === undefined ? undefined : gitShow(rev, file);
  if (rev !== undefined && source === undefined) return undefined;
  const mod = await (source === undefined ? importModule(resolve(file)) : importCopy(file, source));
  return mod;
}

/** An art source export a `path.ts:name` or `path.ts:name.key` spec names. */
export interface SourceSpec {
  file: string;
  name: string;
  key: string | undefined;
}

/** The parts of a `path.ts:name[.key]` spec, or undefined for any other <image>. */
export function parseSpec(spec: string): SourceSpec | undefined {
  const [, file, name, key] = /^(.+\.ts):(\w+)(?:\.(\w+))?$/u.exec(spec) ?? [];
  return file === undefined || name === undefined ? undefined : { file, name, key };
}

/**
 * The value `spec` names, read from the file as it is on disk now, past the
 * import cache (after an import wrote it); throws when it is missing.
 */
export async function exportValue({ file, name, key }: SourceSpec): Promise<unknown> {
  const mod = await importCopy(file, readFileSync(resolve(file)));
  const value = mod[name];
  if (value === undefined) throw new Error(`${file} has no export "${name}"`);
  if (key === undefined) return value;
  const entry = isRecord(value) ? value[key] : undefined;
  if (entry === undefined) throw new Error(`${file}'s ${name} has no entry "${key}"`);
  return entry;
}

/** The images an <image> argument names (see the header), at `rev` when given; [] when it is not there. */
export async function load(spec: string, rev?: string): Promise<Panel[]> {
  const ts = parseSpec(spec);
  if (ts) {
    const { file, name, key } = ts;
    const mod = await importAt(file, rev);
    if (mod === undefined) return [];
    let value = mod[name];
    if (key !== undefined) {
      value = isRecord(value) ? value[key] : undefined;
      if (value === undefined) {
        if (rev !== undefined) return [];
        throw new Error(`${file}'s ${name} has no entry "${key}"`);
      }
    }
    if (isRows(value))
      return [{ label: key === undefined ? name : `${name} ${key}`, png: toPng(value, sourcePalette) }];
    const entries = Array.isArray(value)
      ? value.map((v: unknown, i) => [String(i), v] as const)
      : Object.entries(isRecord(value) ? value : {});
    const panels = entries.flatMap(([k, v]) =>
      isRows(v) ? [{ label: `${name} ${k}`, png: toPng(v, sourcePalette) }] : [],
    );
    if (panels.length === 0 && rev === undefined) throw new Error(`${file} exports no rows named "${name}"`);
    return panels;
  }
  const [file = spec, area] = spec.split("#");
  const bytes = rev === undefined ? readFileSync(file) : gitShow(rev, file);
  if (bytes === undefined) return [];
  const png = PNG.sync.read(bytes);
  const hasArea = area !== undefined && area !== "";
  return [{ label: basename(spec).replace("#", " "), png: hasArea ? crop(png, ...parseArea(area)) : png }];
}

async function loadOne(spec: string): Promise<PNG> {
  const panels = await load(spec);
  const [panel] = panels;
  if (panels.length !== 1 || panel === undefined) throw new Error(`${spec} is ${panels.length} images; name one`);
  return panel.png;
}

/** The largest whole scale, up to 8, that keeps the image within about 256 px. */
export function autoScale(png: PNG): number {
  return Math.max(1, Math.min(8, Math.floor(256 / Math.max(png.width, png.height))));
}

const labelScale = 2;
const gap = 16;
// Sheets are read back as images, which cost tokens by area: keep them small.
const maxSheetWidth = 1024;
const sheetColour = "#202020";
const labelColour = "#f4f4f4";
const checkerDark = "#8c8c8c";
const checkerLight = "#a0a0a0";

/** The glyph rows for `ch`, or `?`'s for a character the font lacks. */
function glyph(ch: string): Rows {
  const rows = glyphs[ch] ?? glyphs["?"];
  if (rows === undefined) throw new Error("the font has no ? glyph");
  return rows;
}

/** How wide `rows` are; throws on no rows. */
function widthOf(rows: Rows): number {
  const [first] = rows;
  if (first === undefined) throw new Error("a glyph has no rows");
  return first.length;
}

/** `text` in the game font, white, at 2x. */
function label(text: string): PNG {
  const chars = text
    .toUpperCase()
    .split("")
    .map((ch) => glyph(ch));
  const png = blank(
    chars.reduce((w, rows) => w + widthOf(rows) + 1, 0),
    glyphHeight,
  );
  let x = 0;
  for (const rows of chars) {
    paint(png, rows, { "#": labelColour }, x, 0);
    x += widthOf(rows) + 1;
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
  for (const { x: tx, y: ty, tile } of placed) {
    stamp(out, tile.label, tx, ty);
    const top = ty + labelH;
    for (let py = 0; py < tile.png.height; py++) {
      for (let px = 0; px < tile.png.width; px++)
        plot(out, tx + px, top + py, (Math.trunc(px / 8) + Math.trunc(py / 8)) % 2 === 0 ? checkerDark : checkerLight);
    }
    stamp(out, tile.png, tx, top);
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

/** One prototype option: its frames, and the game screen drawn with it in place, tick by tick. */
export interface PreviewOption {
  label: string;
  frames: string[];
  /** Each distinct screen once; `timeline` is the index into them on each tick. */
  screens: string[];
  timeline: number[];
  /** Where its Play link goes, when `bun run pixel play` serves the page. */
  play?: string;
}

/** Sweetie 16, plus grey for placeholder letters a generator recolours (the cabinets' `1` to `4` and `S`). */
function thumbPalette(frames: readonly Rows[]): Record<string, string> {
  const palette: Record<string, string> = { ...sourcePalette };
  for (const ch of frames.join("")) if (ch !== "." && ch !== "," && !(ch in palette)) palette[ch] = "#8c8c8c";
  return palette;
}

function dataUrl(png: PNG): string {
  return `data:image/png;base64,${PNG.sync.write(png).toString("base64")}`;
}

/** `ticks` as each distinct image once, and which one shows on each tick. */
function timeline(ticks: readonly string[]): { screens: string[]; timeline: number[] } {
  const screens = [...new Set(ticks)];
  return { screens, timeline: ticks.map((t) => screens.indexOf(t)) };
}

/** An option's frames: itself when it is rows, its rows entries when it is frames. */
function optionFrames(option: unknown): Rows[] {
  if (isRows(option)) return [option];
  return Array.isArray(option) ? option.filter((f) => isRows(f)) : [];
}

/** One export a variants file swaps: its rows or frames, as it is now, and its options by label. */
interface Swap {
  target: unknown[];
  original: unknown[];
  byLabel: Record<string, unknown>;
}

/**
 * A variants file's options, one per label: each swaps that label's rows into
 * every export that has it, and draws the scene that shows them.
 */
export async function previewOptions(variants: Record<string, unknown>): Promise<PreviewOption[]> {
  const swaps = await inOrder(Object.entries(variants), async ([spec, byLabel]): Promise<Swap & { scene: Scene }> => {
    const ts = parseSpec(spec);
    if (ts === undefined) throw new Error(`"${spec}" is not path.ts:name[.key]`);
    if (!isRecord(byLabel)) throw new Error(`${spec} has no options`);
    const scene = sceneFor(ts.file);
    // The module the scene imports, so a swap here is the one it draws.
    const mod = await importModule(join(repoRoot, ts.file));
    const exported = mod[ts.name];
    const value = ts.key === undefined ? exported : isRecord(exported) ? exported[ts.key] : undefined;
    if (!Array.isArray(value)) throw new Error(`${spec} is not a list of rows or frames`);
    for (const [name, option] of Object.entries(byLabel)) {
      if (optionFrames(option).length === 0) throw new Error(`${spec} option "${name}" has no rows`);
    }
    const target: unknown[] = value;
    return { target, original: [...target], byLabel, scene };
  });
  const scene = swaps[0]?.scene;
  if (scene === undefined) return [];
  if (swaps.some((s) => s.scene !== scene)) throw new Error("a variants file's exports must all show in one scene");
  const labels = [...new Set(swaps.flatMap((s) => Object.keys(s.byLabel)))];
  try {
    return labels.map((name) => {
      const frames: Rows[] = [];
      for (const { target, original, byLabel } of swaps) {
        const option = byLabel[name];
        // An option that is rows replaces the rows; one that is frames replaces the frames.
        const swapped = option === undefined ? original : isRows(option) ? option : optionFrames(option);
        target.splice(0, target.length, ...swapped);
        if (option !== undefined) frames.push(...optionFrames(option));
      }
      const { screens, timeline: ticks } = timeline(scene.render().map((png) => dataUrl(png)));
      return {
        label: name,
        frames: frames.map((rows) => dataUrl(toPng(rows, thumbPalette(frames)))),
        screens,
        timeline: ticks,
      };
    });
  } finally {
    for (const { target, original } of swaps) target.splice(0, target.length, ...original);
  }
}

/**
 * The preview page for the variants file at `file`: its options, each with a
 * Play link to `<playBase>/<n>/` when `playBase` is given.
 */
export async function previewPage(
  file: string,
  variants: Record<string, unknown>,
  playBase?: string,
): Promise<{ html: string; count: number }> {
  const options = await previewOptions(variants);
  if (playBase !== undefined) {
    for (const [i, o] of options.entries()) o.play = `${playBase}/${i}/`;
  }
  const title = basename(file, ".json");
  const html = readFileSync(join(import.meta.dir, "pixel-preview.html"), "utf8")
    .replaceAll("__TITLE__", title)
    .replace('"__OPTIONS__"', () => JSON.stringify(options));
  return { html, count: options.length };
}

/** One rows or frames export (or record entry) to put on an Aseprite sheet. */
interface SheetSource extends SheetEntry {
  source: SourceSpec;
}

/**
 * The rows or frames `spec` names now: one, or each entry of a record such as
 * `bearWalk`. Throws when it names anything else.
 */
async function sheetSources(spec: string): Promise<SheetSource[]> {
  const source = parseSpec(spec);
  if (source === undefined) throw new Error(`"${spec}" is not path.ts:name[.key]`);
  const exported = await exportValue(source);
  const value = asRowsValue(exported);
  if (value !== undefined) return [{ label: spec, value, source }];
  const entries =
    source.key === undefined && isRecord(exported) && !Array.isArray(exported) ? Object.entries(exported) : [];
  const found = entries.flatMap(([key, entry]) => {
    const rows = asRowsValue(entry);
    return rows === undefined ? [] : [{ label: `${spec}.${key}`, value: rows, source: { ...source, key } }];
  });
  if (found.length === 0) throw new Error(`${spec} is not rows, a list of frames, or a record of them`);
  return found;
}

/** Every export `specs` name, in order: the rows of one sheet. */
async function sheetOf(specs: readonly string[]): Promise<SheetSource[]> {
  return (await inOrder(specs, sheetSources)).flat();
}

function run(cmd: string[]): void {
  const r = Bun.spawnSync(cmd, { cwd: repoRoot, stdout: "inherit", stderr: "inherit" });
  if (r.exitCode !== 0) throw new Error(`${cmd.join(" ")} failed`);
}

/**
 * Write the sheet at `png` back into the rows literals of the exports `specs`
 * name, then regenerate the art. Prettier tidies each file only when it was
 * Prettier-clean before, so nothing outside the blocks changes.
 */
async function importSheet(png: string, specs: readonly string[]): Promise<void> {
  const sheetEntries = await sheetOf(specs);
  const values = fromSheet(PNG.sync.read(readFileSync(resolve(png))), sheetEntries);
  const files = [...new Set(sheetEntries.map((e) => e.source.file))];
  const clean = files.filter(
    (file) => Bun.spawnSync(["bunx", "prettier", "--check", file], { cwd: repoRoot }).exitCode === 0,
  );
  for (const file of files) {
    const path = join(repoRoot, file);
    let text = readFileSync(path, "utf8");
    sheetEntries.forEach(({ source }, i) => {
      const value = values[i];
      if (source.file === file && value !== undefined) text = writeRows(text, source.name, source.key, value);
    });
    writeFileSync(path, text);
  }
  if (clean.length > 0) run(["bunx", "prettier", "--write", ...clean]);
  run(["bun", "run", "art"]);
  console.log(
    `wrote ${sheetEntries.map((e) => e.label).join(", ")}; read it back with git diff and bun run pixel before`,
  );
}

function write(png: PNG, out: string): void {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, PNG.sync.write(png));
  console.log(`wrote ${relative(process.cwd(), out)} (${png.width}x${png.height})`);
}

function usage(): never {
  const header = readFileSync(import.meta.path, "utf8").split("\n\n")[0] ?? "";
  console.error(header.replaceAll(/^\/\/ ?/gmu, ""));
  process.exit(1);
}

/** `fn` over `items` one after another, in order, so output and git copies never interleave. */
async function inOrder<T, R>(items: readonly T[], fn: (item: T) => Promise<R>): Promise<R[]> {
  const all = await items.reduce<Promise<R[]>>(async (done, item) => {
    const results = await done;
    results.push(await fn(item));
    return results;
  }, Promise.resolve([]));
  return all;
}

async function main(argv: string[]): Promise<void> {
  const opts: Record<string, string> = {};
  const args: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i] ?? usage();
    if (a === "--nearest") opts["nearest"] = "yes";
    else if (a.startsWith("--")) opts[a.slice(2)] = argv[++i] ?? usage();
    else args.push(a);
  }
  const [command, ...specs] = args;
  const k = opts["scale"] === undefined ? undefined : Number(opts["scale"]);
  if (k !== undefined && !(Number.isInteger(k) && k > 0))
    throw new Error(`--scale ${opts["scale"]} is not a whole number above 0`);
  const out = (name: string): string => resolve(opts["out"] ?? join(outDir, `${name}.png`));
  if (specs.length === 0) usage();

  switch (command ?? "") {
    case "rows": {
      for (const { label: name, png } of (await inOrder(specs, load)).flat()) {
        console.log(`// ${name}: ${png.width}x${png.height}, Sweetie 16 letters (src/ui/sweetie16.ts)`);
        for (const row of toRows(opts["nearest"] === undefined ? png : snap(png))) console.log(`"${row}",`);
      }
      return;
    }
    case "colours": {
      const letterOf = letters();
      for (const { label: name, png } of (await inOrder(specs, load)).flat()) {
        console.log(`${name} (${png.width}x${png.height})`);
        for (const [c, n] of [...colours(png)].toSorted((a, b) => b[1] - a[1])) {
          console.log(
            `  ${c.padEnd(11)} ${(letterOf.get(c) ?? (c === "transparent" ? "." : "not Sweetie 16")).padEnd(14)} ${n}`,
          );
        }
      }
      return;
    }
    case "show": {
      const panels = (await inOrder(specs, load)).flat();
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
      await inOrder(specs, async (spec) => {
        const before = new Map((await load(spec, rev)).map((p) => [p.label, p.png]));
        for (const after of await load(spec)) {
          const old = before.get(after.label);
          if (old) panels.push({ label: `before ${after.label}`, png: old });
          panels.push({ label: `${old ? "after" : "new"} ${after.label}`, png: after.png });
        }
      });
      write(sheet(panels, k ?? Math.min(...panels.map((p) => autoScale(p.png)))), out("before-after"));
      return;
    }
    case "place": {
      const [baseSpec, ...rest] = specs;
      if (baseSpec === undefined) usage();
      const items = await Promise.all(
        rest.map(async (s) => {
          const at = /^(.+)@(-?\d+),(-?\d+)$/u.exec(s);
          const image = at?.[1];
          if (!at || image === undefined) throw new Error(`"${s}" is not <image>@x,y`);
          return { png: await loadOne(image), x: Number(at[2]), y: Number(at[3]) };
        }),
      );
      const base = await loadOne(baseSpec);
      const png = place(base, items);
      write(scale(png, k ?? autoScale(png)), out("place"));
      return;
    }
    case "preview": {
      const [file] = specs;
      if (file === undefined) usage();
      const parsed: unknown = JSON.parse(readFileSync(resolve(file), "utf8"));
      if (!isRecord(parsed)) throw new Error(`${file} is not a variants object`);
      const { html: page, count } = await previewPage(file, parsed);
      const html = resolve(opts["out"] ?? join(outDir, `${basename(file, ".json")}.html`));
      mkdirSync(dirname(html), { recursive: true });
      writeFileSync(html, page);
      console.log(`wrote ${relative(process.cwd(), html)} (${count} options); publish it with the Artifact tool`);
      return;
    }
    case "play": {
      const [file] = specs;
      if (file === undefined) usage();
      const port = Number(opts["port"] ?? 3300);
      const { servePlay } = await import("./pixel-play.ts");
      const server = await servePlay(file, port);
      console.log(`serving ${file} at ${server.url.href}; each Play link builds that option into out/pixel/play/`);
      return;
    }
    case "export": {
      const sheetEntries = await sheetOf(specs);
      const name = (specs[0] ?? "").slice((specs[0] ?? "").indexOf(":") + 1);
      write(toSheet(sheetEntries), resolve(opts["out"] ?? join(repoRoot, "out/aseprite", `${name}.png`)));
      for (const { label: entry, value } of sheetEntries) {
        const frames = isRows(value) ? [value] : value;
        console.log(
          `  ${entry}: ${frames.length} frame(s) of ${frames[0]?.[0]?.length ?? 0}x${frames[0]?.length ?? 0}`,
        );
      }
      console.log(`import it back with: bun run pixel import <png> ${specs.join(" ")}`);
      return;
    }
    case "import": {
      const [png, ...rest] = specs;
      if (png === undefined || rest.length === 0) usage();
      await importSheet(png, rest);
      return;
    }
    default:
      usage();
  }
}

if (import.meta.main) {
  try {
    await main(process.argv.slice(2));
  } catch (e: unknown) {
    console.error(`pixel: ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
  }
}
