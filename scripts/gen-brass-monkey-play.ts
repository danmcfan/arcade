// Write the Brass Monkey parity scenario's input script by playing the game
// with a simple bot (#39):
//
//   bun scripts/gen-brass-monkey-play.ts   # test/fixtures/inputs/brass-monkey-play.json
//
// The bot walks a fixed route up each floor, ladder by ladder, picking up
// the bolts on the way, jumps a hazard that comes at it along its girder and
// waits before climbing into one.
// It is no expert: hazards from above catch it. Each seed is played until the
// run escapes the factory; the first seed whose run escapes having lost a life
// (but not its last) and jumped a hazard is kept, and then the monkey stands
// still until game over. Only the inputs are kept: the script replays without
// the bot. The verify check (scripts/verify/brass-monkey.ts) replays it too.

import { writeFileSync } from "node:fs";
import { hazardPoints, startLives } from "../src/brass-monkey/tuning.ts";
import { NO_INPUT, type Input } from "../src/engine/input.ts";
import * as rng from "../src/engine/rng.ts";
import { createScene } from "../src/game/registry.ts";
import type { BrassMonkeySnapshot, GameSnapshot } from "../src/game/snapshot.ts";
import type { InputScript, InputStep } from "../src/game/script.ts";
import { inputPath } from "../test/parity/harness.ts";

/** Walk to x, then climb (`up`) or stop there. */
type Waypoint = { x: number; up?: boolean };

const ladder = (x: number): Waypoint => ({ x: x + 4, up: true });

/** Each floor's route, from the start to the exit door. */
const routes: readonly (readonly Waypoint[])[] = [
  [
    ladder(184), // up to the girder at y 208
    { x: 62 }, // its bolt
    ladder(96),
    { x: 152 }, // its bolt
    ladder(112),
    ladder(32), // past the bolt at x 40
    ladder(184), // past the bolt at x 120
    ladder(128),
    { x: 112 },
  ],
  [ladder(200), ladder(24), ladder(184), ladder(40), { x: 172 }, ladder(128), { x: 112 }],
];

function sw(s: GameSnapshot): BrassMonkeySnapshot | null {
  return s.software === "brassMonkey" && s.sw !== null && "moving" in s.sw ? s.sw : null;
}

/**
 * The bot's input for this tick: the next waypoint, or a jump at a hazard
 * coming along the girder; it waits at a ladder's foot while a hazard is near
 * the top.
 */
function decide(m: BrassMonkeySnapshot, leg: number): Input {
  const route = routes[m.floor] ?? [];
  const wp = route[Math.min(leg, route.length - 1)];
  if (wp === undefined || m.phase !== "play") return NO_INPUT;
  if (m.footing === "climb") return { ...NO_INPUT, up: true };
  if (m.footing === "air") return NO_INPUT;
  for (const h of m.hazards) {
    if (h.footing !== "ground" || Math.abs(h.y - m.y) > 4) continue;
    const dx = h.x - m.x;
    const coming = h.dir === (dx > 0 ? -1 : 1);
    if (coming && Math.abs(dx) < 22 && Math.abs(dx) > 10)
      return { ...NO_INPUT, space: true, left: dx < 0, right: dx > 0 };
  }
  if (Math.abs(m.x - wp.x) <= 1) {
    // Wait at the foot of a ladder while a hazard is near its head.
    const above = m.hazards.some((h) => h.y < m.y - 4 && m.y - h.y < 48 && Math.abs(h.x - m.x) < 40);
    return wp.up === true && !above ? { ...NO_INPUT, up: true } : NO_INPUT;
  }
  return { ...NO_INPUT, left: wp.x < m.x, right: wp.x > m.x };
}

export interface Played {
  inputs: Input[];
  escaped: boolean;
  livesLost: number;
  jumped: boolean;
}

type Scene = ReturnType<typeof createScene>;

function snapshotOf(scene: Scene): BrassMonkeySnapshot | null {
  const s = scene.snapshot();
  return "arcade" in s ? sw(s) : null;
}

/**
 * From the hub's spawn: walk up to the cabinets' wall, then left along it
 * until the scoreboard names Brass Monkey (read from the scene, not a fixed
 * route), and put in a token. Steps `scene` and returns the inputs it used;
 * throws if the run did not start.
 */
export function enterFromHub(scene: Scene): Input[] {
  const inputs: Input[] = [];
  const press = (i: Input): void => {
    inputs.push(i);
    scene.step(i);
  };
  const arcade = (): { y: number; faced: unknown } => {
    const s = scene.snapshot();
    if (!("arcade" in s)) throw new Error("enterFromHub: the scene is not the hub");
    return { y: s.arcade.player.y, faced: s.arcade.faced };
  };
  const up: Input = { ...NO_INPUT, up: true };
  for (let y = Infinity; arcade().y < y && inputs.length < 600;) {
    y = arcade().y;
    press(up);
  }
  // Step left, then face the wall to see which cabinet is there.
  while (arcade().faced !== "brassMonkey" && inputs.length < 1200) {
    press({ ...NO_INPUT, left: true });
    press(up);
  }
  press({ ...up, space: true });
  const s = scene.snapshot();
  const software = "arcade" in s ? s.software : null;
  if (software !== "brassMonkey")
    throw new Error(`enterFromHub: the bot did not enter the Brass Monkey cabinet (software ${String(software)})`);
  return inputs;
}

/**
 * Play a run from `seed`: straight into Brass Monkey (`game.New`), or from the
 * hub through `enterFromHub`, so game over opens the payout. The inputs end on
 * the tick the run is over.
 */
export function play(seed: number, fromHub = false): Played {
  rng.seed(seed);
  const scene = createScene("game", fromHub ? {} : { software: "brassMonkey" });
  const inputs: Input[] = [];
  if (fromHub) inputs.push(...enterFromHub(scene));
  else {
    inputs.push(NO_INPUT);
    scene.step(NO_INPUT);
  }
  let leg = 0;
  let floor = 0;
  let lives = startLives;
  let score = 0;
  let jumped = false;
  let prevSpace = false;
  let climbing = false;
  const result = (escaped: boolean, livesLost: number): Played => {
    if (escaped) {
      // Stand still until the last life is gone.
      while (snapshotOf(scene)?.phase !== "over" && snapshotOf(scene) !== null) {
        inputs.push(NO_INPUT);
        scene.step(NO_INPUT);
      }
    }
    return { inputs, escaped, livesLost, jumped };
  };
  try {
    for (let tick = 0; tick < 20_000; tick++) {
      const m = snapshotOf(scene);
      if (m === null || m.phase === "over") return result(false, startLives);
      if (m.phase === "escape") return result(true, startLives - m.lives);
      if (m.floor !== floor || m.lives !== lives) leg = 0;
      floor = m.floor;
      lives = m.lives;
      const wp = routes[m.floor]?.[leg];
      // A climbing leg is done when the monkey steps off the top of its ladder; a stop when it is there.
      if (wp !== undefined && (wp.up === true ? climbing && m.footing === "ground" : Math.abs(m.x - wp.x) <= 1)) leg++;
      climbing = m.footing === "climb";
      let i = decide(m, leg);
      // Space must be let go between jumps.
      if (i.space && prevSpace) i = { ...i, space: false };
      prevSpace = i.space;
      inputs.push(i);
      scene.step(i);
      const after = snapshotOf(scene);
      if (after !== null && after.score - score === hazardPoints && after.phase === "play") jumped = true;
      score = after?.score ?? score;
    }
  } finally {
    scene.dispose?.();
  }
  return { inputs, escaped: false, livesLost: startLives, jumped };
}

/** Inputs as steps: runs of the same input. */
function steps(inputs: readonly Input[]): InputStep[] {
  const out: InputStep[] = [];
  for (const i of inputs) {
    const input: Partial<Input> = Object.fromEntries(Object.entries(i).filter(([, v]) => v === true));
    const last = out.at(-1);
    if (last !== undefined && JSON.stringify(last.input) === JSON.stringify(input)) last.ticks++;
    else out.push({ ticks: 1, input });
  }
  return out;
}

/**
 * The frames the fixture keeps: climbing the first ladder, mid-jump over a
 * gear, the girder floor finished, the conveyor floor, a life lost, the escape.
 */
const captureTicks = [190, 612, 1030, 1400, 1662, 8040];

/** The script as the fixtures lay it out: one step per line. */
function format(script: InputScript): string {
  const { steps: all, ...head } = script;
  const lines = all.map((s) => `  ${JSON.stringify(s)}`).join(",\n");
  return `${JSON.stringify(head).replaceAll('":', '": ').replaceAll(',"', ', "').slice(0, -1)},"steps": [\n${lines}\n]}\n`;
}

if (import.meta.main) {
  for (let seed = 1; seed <= 500; seed++) {
    const run = play(seed);
    if (!run.escaped || run.livesLost < 1 || run.livesLost > 2 || !run.jumped) continue;
    const script: InputScript = {
      name: "brass-monkey-play",
      scene: "game",
      software: "brassMonkey",
      seed,
      captureTicks,
      steps: steps(run.inputs),
    };
    writeFileSync(inputPath(script.name), format(script));
    console.log(`seed ${seed}: ${run.inputs.length} ticks, ${run.livesLost} lives lost before the escape`);
    break;
  }
}
