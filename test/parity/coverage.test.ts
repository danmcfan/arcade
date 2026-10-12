// Guard: every golden scenario in test/fixtures/inputs/ is replayed by some
// `parityTest("<name>")` call in test/parity/*.test.ts, exactly once, and
// every registered name has its input and trace. A new fixture therefore
// cannot land untested, and a typo in a registration cannot skip silently.
import { expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fixturesDir, inputPath, tracePath } from "./harness.ts";

const parityDir = new URL("./", import.meta.url).pathname;

function fixtureScenarios(): string[] {
  return readdirSync(`${fixturesDir}inputs`)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.slice(0, -".json".length))
    .sort();
}

/** `parityTest("x")` calls in each parity test file, as `[file, scenario]`. */
function registrations(): [string, string][] {
  const out: [string, string][] = [];
  for (const file of readdirSync(parityDir).filter((f) => f.endsWith(".test.ts")).sort()) {
    const src = readFileSync(`${parityDir}${file}`, "utf8");
    for (const m of src.matchAll(/^\s*parityTest\(\s*"([^"]+)"\s*\)/gm)) out.push([file, m[1] as string]);
  }
  return out;
}

test("every fixture scenario is registered by exactly one parity test", () => {
  const counts = new Map<string, string[]>();
  for (const [file, name] of registrations()) counts.set(name, [...(counts.get(name) ?? []), file]);
  const unregistered = fixtureScenarios().filter((s) => !counts.has(s));
  const duplicated = [...counts].filter(([, files]) => files.length > 1).map(([s, files]) => `${s} (${files.join(", ")})`);
  expect(unregistered).toEqual([]);
  expect(duplicated).toEqual([]);
});

test("every registered parity scenario has an input script and a trace", () => {
  const missing = registrations()
    .flatMap(([file, name]) => [inputPath(name), tracePath(name)].filter((p) => !existsSync(p)).map((p) => `${file}: ${p}`));
  expect(missing).toEqual([]);
});

// §4.4 required scenarios (rng is covered by src/engine/rng.test.ts).
const REQUIRED = [
  "arcade-walk",
  "arcade-enter-gearhead",
  "arcade-enter-hive",
  "arcade-enter-firefly",
  "hive-fuzz-1",
  "hive-fuzz-2",
  "hive-fuzz-3",
  "hive-fuzz-4",
  "hive-clear",
  "hive-highscore",
  "firefly-play",
  "gearhead-walk",
  "wave-64-seed7",
  "wave-128-seed3",
  "lumberjack-chop",
];

test("every §4.4 required scenario has a fixture", () => {
  const have = new Set(fixtureScenarios());
  expect(REQUIRED.filter((s) => !have.has(s))).toEqual([]);
});
