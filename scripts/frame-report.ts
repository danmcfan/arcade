// Diff every golden frame against the TS capture and write the Phase 4
// frame report (§5 Phase 4). Capture first with `bun run frames`.
//
//   bun run frames:report
//
// Reads test/fixtures/frames/<scenario>/<tick>.png and out/frames/<same>,
// writes out/diff/<scenario>/<tick>.png (pixelmatch diff) and
// out/frame-report.md. Exits 1 if any frame has differing pixels.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { fixturesDir, repoRoot } from "../test/parity/fixtures.ts";
import { diffImages } from "./frame-diff.ts";

const goldenDir = join(fixturesDir, "frames");
const actualDir = join(repoRoot, "out/frames");
const diffDir = join(repoRoot, "out/diff");
const reportPath = join(repoRoot, "out/frame-report.md");

export interface FrameRow {
  scenario: string;
  tick: number;
  width: number;
  height: number;
  /** pixelmatch (threshold 0.1) differing pixels; -1 if the capture is missing or the size differs. */
  diffPixels: number;
  /** Pixels whose RGBA bytes are not identical (informational: ±1 rounding shows here). */
  exactDiffPixels: number;
  diffPath: string;
  note?: string;
}

function exactDiff(a: PNG, b: PNG): number {
  let n = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    if (
      a.data[i] !== b.data[i] ||
      a.data[i + 1] !== b.data[i + 1] ||
      a.data[i + 2] !== b.data[i + 2] ||
      a.data[i + 3] !== b.data[i + 3]
    )
      n++;
  }
  return n;
}

export function compareFrame(scenario: string, tick: number): FrameRow {
  const rel = join(scenario, `${tick}.png`);
  const expected = PNG.sync.read(readFileSync(join(goldenDir, rel)));
  const row: FrameRow = {
    scenario,
    tick,
    width: expected.width,
    height: expected.height,
    diffPixels: -1,
    exactDiffPixels: -1,
    diffPath: "",
  };
  const actualPath = join(actualDir, rel);
  if (!existsSync(actualPath)) return { ...row, note: "capture missing" };
  const actual = PNG.sync.read(readFileSync(actualPath));
  if (actual.width !== expected.width || actual.height !== expected.height) {
    return { ...row, note: `size ${actual.width}x${actual.height}` };
  }
  const { diff, diffPixels } = diffImages(expected, actual);
  const outPath = join(diffDir, rel);
  mkdirSync(join(diffDir, scenario), { recursive: true });
  writeFileSync(outPath, PNG.sync.write(diff));
  return {
    ...row,
    diffPixels,
    exactDiffPixels: exactDiff(expected, actual),
    diffPath: `out/diff/${scenario}/${tick}.png`,
  };
}

/** `n` as a table cell, blank for a negative (not measured) count. */
function opt(n: number): string {
  return n < 0 ? "" : String(n);
}

export function renderReport(rows: readonly FrameRow[]): string {
  const zero = rows.filter((r) => r.diffPixels === 0).length;
  const lines = [
    "# Frame report",
    "",
    `Golden frames (test/fixtures/frames) vs TS captures (out/frames), pixelmatch threshold 0.1.`,
    `${zero} of ${rows.length} frames have 0 differing pixels.`,
    "",
    "| Scenario | Tick | Size | Diff pixels | Exact-byte diff | Diff PNG |",
    "|---|---:|---|---:|---:|---|",
  ];
  for (const r of rows) {
    const diff = r.diffPixels < 0 ? `n/a (${r.note})` : String(r.diffPixels);
    lines.push(
      `| ${r.scenario} | ${r.tick} | ${r.width}x${r.height} | ${diff} | ${opt(r.exactDiffPixels)} | ${r.diffPath} |`,
    );
  }
  lines.push(
    "",
    "Exact-byte diff counts pixels whose RGBA bytes differ at all (±1 rounding in blended pixels); informational only.",
    "",
  );
  return lines.join("\n");
}

if (import.meta.main) {
  const rows: FrameRow[] = [];
  for (const scenario of readdirSync(goldenDir).toSorted()) {
    const ticks = readdirSync(join(goldenDir, scenario))
      .filter((f) => f.endsWith(".png"))
      .map((f) => Number(f.slice(0, -4)))
      .toSorted((a, b) => a - b);
    for (const tick of ticks) rows.push(compareFrame(scenario, tick));
  }
  mkdirSync(join(repoRoot, "out"), { recursive: true });
  writeFileSync(reportPath, renderReport(rows));
  for (const r of rows) {
    if (r.diffPixels !== 0) console.log(`${r.scenario}/${r.tick}: ${r.diffPixels < 0 ? r.note : r.diffPixels}`);
  }
  const bad = rows.filter((r) => r.diffPixels !== 0).length;
  console.log(`${rows.length - bad}/${rows.length} frames at 0 differing pixels; report: ${reportPath}`);
  process.exit(bad === 0 ? 0 : 1);
}
