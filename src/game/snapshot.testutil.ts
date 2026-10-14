import type {
  BrassMonkeySnapshot,
  FireflySnapshot,
  GameSnapshot,
  SceneSnapshot,
  SoftwareSnapshot,
} from "./snapshot.ts";

/** Narrows a scene snapshot to the arcade Game's, failing the test if it is another scene's. */
export function gameSnapshot(s: SceneSnapshot): GameSnapshot {
  if ("arcade" in s) return s;
  throw new Error("expected a game snapshot");
}

/** Narrows a software snapshot to firefly's, failing the test if it is another minigame's. */
export function fireflySnapshot(s: SoftwareSnapshot | null | undefined): FireflySnapshot {
  if (s !== null && s !== undefined && "fireDelay" in s) return s;
  throw new Error("expected a firefly snapshot");
}

/** Narrows a software snapshot to Brass Monkey's, failing the test if it is another minigame's. */
export function brassMonkeySnapshot(s: SoftwareSnapshot | null | undefined): BrassMonkeySnapshot {
  if (s !== null && s !== undefined && "moving" in s) return s;
  throw new Error("expected a Brass Monkey snapshot");
}

/** A Brass Monkey snapshot for fake software: the run's first tick. */
export const fakeBrassMonkeySnapshot: BrassMonkeySnapshot = {
  phase: "play",
  phaseTicks: 0,
  floor: 0,
  loop: 0,
  lives: 3,
  score: 0,
  highScore: 0,
  bonus: 5000,
  x: 0,
  y: 0,
  footing: "ground",
  vy: 0,
  frame: 0,
  left: false,
  moving: false,
  hazards: [],
  bolts: [],
  gearTimer: 0,
  emberTimer: 0,
};
