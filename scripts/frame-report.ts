// Diff every golden frame against the TS capture and write the Phase 4
// frame report (§5 Phase 4). Capture first with `bun run frames`.
//
//   bun run frames:report
//
// Reads test/fixtures/frames/<scenario>/<tick>.png and out/frames/<same>,
// writes out/diff/<scenario>/<tick>.png (pixelmatch diff) and
// out/frame-report.md. Lumberjack frames mask the edge pixels of rotated
// tree tops (scripts/tree-mask.ts, from the trace snapshot at that tick).
// Exits 1 if any frame has differing pixels after masking.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { fixturesDir, readTrace, repoRoot, tracePath } from "../test/parity/fixtures.ts";
import { diffImages, type Mask } from "./frame-diff.ts";
import { lumberjackTrees, treeTopEdgeMasks, treeTopTexels } from "./tree-mask.ts";

const goldenDir = join(fixturesDir, "frames");
const actualDir = join(repoRoot, "out/frames");
const diffDir = join(repoRoot, "out/diff");
const reportPath = join(repoRoot, "out/frame-report.md");
const treeSheet = join(repoRoot, "src/lab/lumberjack/images/Trees/Big_Oak_Tree.png");

export interface FrameRow {
  scenario: string;
  tick: number;
  width: number;
  height: number;
  /** pixelmatch (threshold 0.1) differing pixels after masking; -1 if the capture is missing or the size differs. */
  diffPixels: number;
  /** Pixels covered by the mask (lumberjack only). */
  maskedPixels: number;
  /** pixelmatch differing pixels with no mask. */
  unmaskedDiffPixels: number;
  /** Pixels whose RGBA bytes are not identical (informational: ±1 rounding shows here). */
  exactDiffPixels: number;
  diffPath: string;
  note?: string;
}

function snapshotAt(scenario: string, tick: number): unknown {
  const snap = readTrace(tracePath(scenario)).find(
    (s) => typeof s === "object" && s !== null && "tick" in s && s.tick === tick,
  );
  if (snap === undefined) throw new Error(`${scenario}: no trace line for tick ${tick}`);
  return snap;
}

function masksFor(scenario: string, tick: number, width: number, height: number): Mask[] {
  if (!scenario.startsWith("lumberjack")) return [];
  const trees = lumberjackTrees(snapshotAt(scenario, tick));
  return treeTopEdgeMasks(trees, treeTopTexels(PNG.sync.read(readFileSync(treeSheet))), width, height);
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
    maskedPixels: 0,
    unmaskedDiffPixels: -1,
    exactDiffPixels: -1,
    diffPath: "",
  };
  const actualPath = join(actualDir, rel);
  if (!existsSync(actualPath)) return { ...row, note: "capture missing" };
  const actual = PNG.sync.read(readFileSync(actualPath));
  if (actual.width !== expected.width || actual.height !== expected.height) {
    return { ...row, note: `size ${actual.width}x${actual.height}` };
  }
  const masks = masksFor(scenario, tick, expected.width, expected.height);
  const { diff, diffPixels } = diffImages(expected, actual, masks);
  const outPath = join(diffDir, rel);
  mkdirSync(join(diffDir, scenario), { recursive: true });
  writeFileSync(outPath, PNG.sync.write(diff));
  return {
    ...row,
    diffPixels,
    maskedPixels: masks.length,
    unmaskedDiffPixels: masks.length > 0 ? diffImages(expected, actual).diffPixels : diffPixels,
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
    `${zero} of ${rows.length} frames have 0 differing pixels after masking.`,
    "",
    "| Scenario | Tick | Size | Diff pixels | Masked pixels | Unmasked diff | Exact-byte diff | Diff PNG |",
    "|---|---:|---|---:|---:|---:|---:|---|",
  ];
  for (const r of rows) {
    const diff = r.diffPixels < 0 ? `n/a (${r.note})` : String(r.diffPixels);
    lines.push(
      `| ${r.scenario} | ${r.tick} | ${r.width}x${r.height} | ${diff} | ${r.maskedPixels || ""} | ${opt(r.unmaskedDiffPixels)} | ${opt(r.exactDiffPixels)} | ${r.diffPath} |`,
    );
  }
  lines.push(
    "",
    "Masked pixels: lumberjack rotated tree-top edge pixels (scripts/tree-mask.ts), the only allowed differences.",
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
