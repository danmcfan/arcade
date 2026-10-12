// Compare two logical-resolution frames with pixelmatch (threshold 0.1,
// which absorbs ±1 rounding in alpha-blended pixels; §5 Phase 4).
//
//   bun scripts/frame-diff.ts <expected.png> <actual.png> [--out diff.png] [--mask x,y,w,h]...
//
// Prints the differing pixel count; exits 1 if it is not 0 (2 on error).
// Masked rects (e.g. rotated lumberjack tree-top edges) are ignored.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

export const THRESHOLD = 0.1;

export interface Mask {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface FrameDiffResult {
  width: number;
  height: number;
  diffPixels: number;
}

export function parseMask(s: string): Mask {
  const parts = s.split(",").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    throw new Error(`bad mask "${s}": expected x,y,w,h`);
  }
  const [x = 0, y = 0, w = 0, h = 0] = parts;
  return { x, y, w, h };
}

/** Copy `from`'s pixels into `to` inside each mask so they compare equal there. */
function applyMasks(from: PNG, to: PNG, masks: readonly Mask[]): void {
  for (const m of masks) {
    const x0 = Math.max(0, Math.floor(m.x));
    const y0 = Math.max(0, Math.floor(m.y));
    const x1 = Math.min(from.width, Math.ceil(m.x + m.w));
    const y1 = Math.min(from.height, Math.ceil(m.y + m.h));
    for (let y = y0; y < y1; y++) {
      const start = (y * from.width + x0) * 4;
      const end = (y * from.width + x1) * 4;
      if (end > start) to.data.set(from.data.subarray(start, end), start);
    }
  }
}

/** Differing pixel count plus a diff image (red where pixels differ). */
export function diffImages(
  expected: PNG,
  actual: PNG,
  masks: readonly Mask[] = [],
): FrameDiffResult & { diff: PNG } {
  const { width, height } = expected;
  if (actual.width !== width || actual.height !== height) {
    throw new Error(`size mismatch: ${width}x${height} vs ${actual.width}x${actual.height}`);
  }
  const masked = new PNG({ width, height });
  actual.data.copy(masked.data);
  applyMasks(expected, masked, masks);
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(expected.data, masked.data, diff.data, width, height, { threshold: THRESHOLD });
  return { width, height, diffPixels, diff };
}

export function diffFiles(
  expectedPath: string,
  actualPath: string,
  opts: { masks?: readonly Mask[]; out?: string } = {},
): FrameDiffResult {
  const expected = PNG.sync.read(readFileSync(expectedPath));
  const actual = PNG.sync.read(readFileSync(actualPath));
  const { diff, ...result } = diffImages(expected, actual, opts.masks);
  if (opts.out) {
    mkdirSync(dirname(opts.out), { recursive: true });
    writeFileSync(opts.out, PNG.sync.write(diff));
  }
  return result;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const files: string[] = [];
  const masks: Mask[] = [];
  let out: string | undefined;
  try {
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === "--out") out = args[++i];
      else if (a === "--mask") masks.push(parseMask(args[++i] ?? ""));
      else if (a !== undefined) files.push(a);
    }
    const [expected, actual] = files;
    if (expected === undefined || actual === undefined || files.length !== 2) {
      throw new Error("usage: bun scripts/frame-diff.ts <expected.png> <actual.png> [--out diff.png] [--mask x,y,w,h]...");
    }
    const r = diffFiles(expected, actual, { masks, out });
    console.log(`${r.diffPixels} differing pixels (${r.width}x${r.height})${out ? `; diff: ${out}` : ""}`);
    process.exit(r.diffPixels === 0 ? 0 : 1);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(2);
  }
}
