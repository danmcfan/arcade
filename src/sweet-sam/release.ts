// When the bees leave the home (#155), as in Pac-Man (Dossier, "Home Sweet
// Home"): the preferred bee in the home (pink, then teal, then orange) counts
// eaten drops against its personal limit; after a lost life a global drop
// counter releases them instead; and a bee leaves anyway when the bear goes
// too long without eating.

import { newEnemies, type Entity } from "./entity.ts";
import type { LevelValues } from "./levels.ts";

/** Global drop counts at which pink, teal and orange leave after a death. */
export const globalDotLimits = { pink: 7, teal: 17, orange: 32 } as const;

export interface Release {
  /** Drops eaten since the last death, or null while personal counters are in use. */
  globalDots: number | null;
  /** Ticks since the last drop was eaten. */
  idleTicks: number;
}

/** Personal counters, as at the start of a level. */
export function newRelease(): Release {
  return { globalDots: null, idleTicks: 0 };
}

const order = ["pink", "teal", "orange"] as const;

/** The first bee, in preferred order, still waiting in the home. */
function preferred(bees: readonly Entity[]): Entity | undefined {
  for (const kind of order) {
    const e = bees.find((b) => b.kind === kind && b.home && (b.dotMinimum > 0 || b.held));
    if (e !== undefined) return e;
  }
  return undefined;
}

function free(e: Entity): void {
  e.dotMinimum = 0;
  e.held = false;
}

/** Rebuilds the bees after a lost life: they keep their personal counters but wait on the global one. */
export function afterDeath(r: Release, old: readonly Entity[]): Entity[] {
  const bees = newEnemies();
  for (const e of bees) {
    e.dotMinimum = old.find((o) => o.kind === e.kind)?.dotMinimum ?? 0;
    e.held = e.home;
  }
  r.globalDots = 0;
  r.idleTicks = 0;
  return bees;
}

export function dropEaten(r: Release, bees: readonly Entity[]): void {
  r.idleTicks = 0;
  if (r.globalDots === null) {
    const e = preferred(bees);
    if (e !== undefined && e.dotMinimum > 0) e.dotMinimum--;
    return;
  }
  r.globalDots++;
  for (const kind of order) {
    const e = bees.find((b) => b.kind === kind);
    if (e !== undefined && e.home && r.globalDots === globalDotLimits[kind]) free(e);
  }
  if (r.globalDots >= globalDotLimits.orange) {
    r.globalDots = null;
    for (const e of bees) e.held = false;
  }
}

export function noDropEaten(r: Release, bees: readonly Entity[], values: Readonly<LevelValues>): void {
  r.idleTicks++;
  if (r.idleTicks < values.idleReleaseTicks) return;
  r.idleTicks = 0;
  const e = preferred(bees);
  if (e !== undefined) free(e);
}
