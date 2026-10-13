import type { Software, SoftwareName } from "./software.ts";

function notFaked(): never {
  throw new Error("fake software: not implemented");
}

/** A Software that only has a name; every method throws if a test reaches it. */
export function fakeSoftware(name: SoftwareName = "hive"): Software {
  return {
    name,
    background: notFaked,
    update: notFaked,
    draw: notFaked,
    gameOver: notFaked,
    score: notFaked,
    snapshot: notFaked,
  };
}
