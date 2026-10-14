// Compare two logical-resolution frames with pixelmatch (threshold 0.1,
// which absorbs ±1 rounding in alpha-blended pixels; §5 Phase 4).
//
//   bun scripts/frame-diff.ts <expected.png> <actual.png> [--out diff.png]
//
// Prints the differing pixel count; exits 1 if it is not 0 (2 on error).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

export const THRESHOLD = 0.1;

export interface FrameDiffResult {
  width: number;
  height: number;
  diffPixels: number;
}

/** Differing pixel count plus a diff image (red where pixels differ). */
export function diffImages(expected: PNG, actual: PNG): FrameDiffResult & { diff: PNG } {
  const { width, height } = expected;
  if (actual.width !== width || actual.height !== height) {
    throw new Error(`size mismatch: ${width}x${height} vs ${actual.width}x${actual.height}`);
  }
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(expected.data, actual.data, diff.data, width, height, { threshold: THRESHOLD });
  return { width, height, diffPixels, diff };
}

export function diffFiles(
  expectedPath: string,
  actualPath: string,
  opts: { out?: string | undefined } = {},
): FrameDiffResult {
  const expected = PNG.sync.read(readFileSync(expectedPath));
  const actual = PNG.sync.read(readFileSync(actualPath));
  const { diff, ...result } = diffImages(expected, actual);
  if (opts.out !== undefined && opts.out !== "") {
    mkdirSync(dirname(opts.out), { recursive: true });
    writeFileSync(opts.out, PNG.sync.write(diff));
  }
  return result;
}

if (import.meta.main) {
  const args = process.argv.slice(2);
  const files: string[] = [];
  let out: string | undefined;
  try {
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === "--out") out = args[++i];
      else if (a !== undefined) files.push(a);
    }
    const [expected, actual] = files;
    if (expected === undefined || actual === undefined || files.length !== 2) {
      throw new Error("usage: bun scripts/frame-diff.ts <expected.png> <actual.png> [--out diff.png]");
    }
    const r = diffFiles(expected, actual, { out });
    console.log(
      `${r.diffPixels} differing pixels (${r.width}x${r.height})${out !== undefined && out !== "" ? `; diff: ${out}` : ""}`,
    );
    process.exit(r.diffPixels === 0 ? 0 : 1);
  } catch (err) {
    console.error(err instanceof Error ? err.message : err);
    process.exit(2);
  }
}
