// A Sweet Sam bot that plays headless, for balance checks and for recording
// input scripts (#47):
//
//   bun scripts/sweet-sam-bot.ts runs [seeds] [react]  # e.g. 1-200 12: score, level and ticks per seed, and a summary
//   bun scripts/sweet-sam-bot.ts script <name> <seed>  # writes test/fixtures/inputs/<name>.json
//
// Each tick it searches the maze tiles (breadth first) for the nearest honey
// drop, bonus flower or sleepy bee, treating tiles near an awake bee as walls,
// and holds the first step's direction. Boxed in, it runs from the nearest
// awake bee. Re-planning every tick it plays far better than a person (on a
// game that never gets harder it can go on for most of an hour), so `react`
// gives it a reaction time: it re-plans only every that many ticks and holds
// its last choice in between. With 12 (a fifth of a second) it plays like a
// good player, which is what "a good run" means for balance: the same bot
// plays before and after a change.
//
// `script` plays until the bear has eaten a bonus flower and level 2 has been
// playing for a while, then ends the script: a level clear, the start of
// level 2 and a flower eaten, recorded from the TypeScript game.

import { writeFileSync } from "node:fs";
import { NO_INPUT, type Direction, type Input } from "../src/engine/input.ts";
import * as rng from "../src/engine/rng.ts";
import { addSoundListener } from "../src/engine/audio.ts";
import type { InputScript, InputStep } from "../src/game/script.ts";
import { mazeTiles } from "../src/sweet-sam/art.ts";
import { pointToTile, tileHeight, tileWidth, type Tile } from "../src/sweet-sam/entity.ts";
import { SweetSamSoftware } from "../src/sweet-sam/software.ts";
import { inputPath } from "../test/parity/fixtures.ts";

const steps: Record<Direction, Tile> = {
  UP: { x: 0, y: -1 },
  LEFT: { x: -1, y: 0 },
  DOWN: { x: 0, y: 1 },
  RIGHT: { x: 1, y: 0 },
};
const order: readonly Direction[] = ["UP", "LEFT", "DOWN", "RIGHT"];

/** Awake bees within this many tiles (Manhattan) block the way. */
const dangerRadius = 3;

function open(x: number, y: number): boolean {
  return mazeTiles[y]?.[x] === ".";
}

/** One tile on along `d`, wrapping through the tunnel. */
function neighbour(t: Tile, d: Direction): Tile {
  const x = (t.x + steps[d].x + tileWidth) % tileWidth;
  return { x, y: t.y + steps[d].y };
}

const key = (t: Tile): number => t.y * tileWidth + t.x;

/** What the bot heads for this tick, by tile. */
function goals(s: SweetSamSoftware): Set<number> {
  const out = new Set<number>();
  for (const it of s.items) if (it !== null) out.add(key(pointToTile(it.x, it.y)));
  // The flower (#47); absent on builds without it, so the bot runs on both.
  if ("flowerTicks" in s && typeof s.flowerTicks === "number" && s.flowerTicks > 0) {
    out.add(key(pointToTile(112, 164)));
  }
  for (const e of s.enemies) if (e.blueFrames > 60 && !e.home) out.add(key(pointToTile(e.x, e.y)));
  return out;
}

function dangers(s: SweetSamSoftware): Tile[] {
  return s.enemies.filter((e) => e.blueFrames === 0 && !e.home).map((e) => pointToTile(e.x, e.y));
}

const manhattan = (a: Tile, b: Tile): number => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** The direction of the first step on the shortest safe path to a goal, or null. */
function search(start: Tile, want: Set<number>, threats: readonly Tile[]): Direction | null {
  const unsafe = (t: Tile): boolean => threats.some((b) => manhattan(t, b) <= dangerRadius);
  const seen = new Set<number>([key(start)]);
  let frontier: { t: Tile; first: Direction }[] = [];
  for (const d of order) {
    const n = neighbour(start, d);
    if (!open(n.x, n.y) || unsafe(n)) continue;
    if (want.has(key(n))) return d;
    seen.add(key(n));
    frontier.push({ t: n, first: d });
  }
  while (frontier.length > 0) {
    const next: typeof frontier = [];
    for (const { t, first } of frontier) {
      for (const d of order) {
        const n = neighbour(t, d);
        if (seen.has(key(n)) || !open(n.x, n.y) || unsafe(n)) continue;
        if (want.has(key(n))) return first;
        seen.add(key(n));
        next.push({ t: n, first });
      }
    }
    frontier = next;
  }
  return null;
}

/** Away from the nearest awake bee: the open step that ends farthest from it. */
function flee(start: Tile, threats: readonly Tile[]): Direction | null {
  let best: Direction | null = null;
  let bestScore = -Infinity;
  for (const d of order) {
    const n = neighbour(start, d);
    if (!open(n.x, n.y)) continue;
    const score = Math.min(...threats.map((b) => manhattan(n, b)), 99);
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

/** The bot's input for this tick. */
export function botInput(s: SweetSamSoftware): Input {
  const here = pointToTile(s.player.x, s.player.y);
  if (here.y < 0 || here.y >= tileHeight) return NO_INPUT;
  const threats = dangers(s);
  const want = goals(s);
  // In a goal's tile but not on it yet: keep going.
  if (want.has(key(here)) && s.player.direction !== "") return held(s.player.direction);
  const d = search(here, want, threats) ?? flee(here, threats);
  return d === null ? NO_INPUT : held(d);
}

function held(d: Direction): Input {
  return { ...NO_INPUT, up: d === "UP", down: d === "DOWN", left: d === "LEFT", right: d === "RIGHT" };
}

/** Longest run the bot plays: 15 minutes of ticks. */
const maxTicks = 60 * 60 * 15;

interface Run {
  seed: number;
  score: number;
  level: number;
  ticks: number;
  flowers: number;
  inputs: Input[];
}

/** One game from `seed`, until game over or `stop` says so. */
export function play(seed: number, react = 1, stop: (s: SweetSamSoftware) => boolean = () => false): Run {
  const off = addSoundListener(() => {});
  try {
    rng.seed(seed);
    const s = new SweetSamSoftware(0);
    const inputs: Input[] = [];
    let flowers = 0;
    let i = NO_INPUT;
    while (!s.gameOver() && inputs.length < maxTicks && !stop(s)) {
      if (inputs.length % react === 0) i = botInput(s);
      inputs.push(i);
      const popup = "flowerPopup" in s ? s.flowerPopup : null;
      s.update(i);
      if ("flowerPopup" in s && popup === null && s.flowerPopup !== null) flowers++;
    }
    const level = "level" in s && typeof s.level === "number" ? s.level : 1;
    return { seed, score: s.score(), level, ticks: inputs.length, flowers, inputs };
  } finally {
    off();
  }
}

/** Runs of equal inputs as script steps. */
function compress(inputs: readonly Input[]): InputStep[] {
  const out: InputStep[] = [];
  for (const i of inputs) {
    const keys: Partial<Input> = {};
    for (const k of ["up", "down", "left", "right"] as const) if (i[k]) keys[k] = true;
    const last = out.at(-1);
    if (last !== undefined && JSON.stringify(last.input) === JSON.stringify(keys)) last.ticks++;
    else out.push({ ticks: 1, input: keys });
  }
  return out;
}

function parseSeeds(arg: string | undefined): number[] {
  const [a, b] = (arg ?? "1-20").split("-").map(Number);
  const from = a ?? 1;
  return Array.from({ length: (b ?? from) - from + 1 }, (_, k) => from + k);
}

function quantile(xs: readonly number[], q: number): number {
  const sorted = xs.toSorted((p, r) => p - r);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
}

if (import.meta.main) {
  const [cmd, ...args] = process.argv.slice(2);
  if (cmd === "runs") {
    const react = Number(args[1] ?? 1);
    const runs = parseSeeds(args[0]).map((seed) => play(seed, react));
    for (const r of runs)
      console.log(`seed ${r.seed}: score ${r.score}, level ${r.level}, ${r.flowers} flowers, ${r.ticks} ticks`);
    const scores = runs.map((r) => r.score);
    console.log(
      `median ${quantile(scores, 0.5)}, top quartile ${quantile(scores, 0.75)}, best ${Math.max(...scores)}, ` +
        `mean ${Math.round(scores.reduce((t, x) => t + x, 0) / scores.length)}`,
    );
  } else if (cmd === "script") {
    const [name, seedArg] = args;
    if (name === undefined || seedArg === undefined) throw new Error("usage: script <name> <seed>");
    let flowerEaten = false;
    let level2Ticks = 0;
    const run = play(Number(seedArg), 1, (s) => {
      if (s.flowerPopup !== null) flowerEaten = true;
      if (s.level >= 2 && s.stateMachine.currentId() === "PLAY") level2Ticks++;
      return flowerEaten && level2Ticks >= 300;
    });
    if (!flowerEaten || run.level < 2)
      throw new Error(`seed ${seedArg}: no flower eaten and level 2 (level ${run.level})`);
    // Tick 1 of a `software` script is a hub tick; the bot's inputs follow it.
    const script: InputScript = {
      name,
      scene: "game",
      software: "sweetSam",
      seed: Number(seedArg),
      captureTicks: [],
      steps: [{ ticks: 1, input: {} }, ...compress(run.inputs)],
    };
    writeFileSync(inputPath(name), `${JSON.stringify(script)}\n`);
    console.log(`wrote ${inputPath(name)}: ${run.ticks + 1} ticks, score ${run.score}, level ${run.level}`);
  } else {
    throw new Error("usage: sweet-sam-bot.ts runs [from-to] | script <name> <seed>");
  }
}
