// Rules the linters cannot enforce themselves: no inline escape hatches.
// Oxlint has no `noInlineConfig`, so a disable comment would silence any rule.
// Fix the code instead, or change `.oxlintrc.json` with the owner's say-so.

import { readFileSync } from "node:fs";

const banned = /\b(?:oxlint|eslint)-(?:disable|enable)\b|@ts-(?:ignore|nocheck|expect-error)\b/u;
const roots = ["src", "test", "scripts"];
const self = "scripts/lint-guards.ts";

function findEscapeHatches(): string[] {
  const hits: string[] = [];
  for (const root of roots) {
    for (const path of new Bun.Glob(`${root}/**/*.ts`).scanSync(".")) {
      if (path === self) continue;
      hits.push(...matches(path, readFileSync(path, "utf8")));
    }
  }
  return hits;
}

function matches(path: string, text: string): string[] {
  return text.split("\n").flatMap((line, i) => (banned.test(line) ? [`${path}:${String(i + 1)}: ${line.trim()}`] : []));
}

/** Only the Level module may import the Board (src/sweet-sam/board.ts); everyone else goes through `Level`'s queries. */
const boardImporters = new Set(["level", "state", "update", "flower", "bonusEat"].map((m) => `src/sweet-sam/${m}.ts`));
const boardImport = /from\s+"\.\/board\.ts"/u;

function findBoardLeaks(): string[] {
  const hits: string[] = [];
  for (const path of new Bun.Glob("src/sweet-sam/**/*.ts").scanSync(".")) {
    if (boardImporters.has(path) || path.endsWith("/board.ts")) continue;
    const text = readFileSync(path, "utf8");
    if (boardImport.test(text)) hits.push(`${path}: imports board.ts, which only the Level module may`);
  }
  return hits;
}

const hits = [...findEscapeHatches(), ...findBoardLeaks()];
if (hits.length > 0) {
  console.error(`lint-guards: ${String(hits.length)} lint/type escape hatch(es) or leaks found:\n${hits.join("\n")}`);
  process.exit(1);
}
