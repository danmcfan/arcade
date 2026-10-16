// Each Firefly kind dives on its own shape (#235) in a real browser
// (`bun run verify firefly-dives`). A paid run is played by a bot that only
// fires and dodges; the check follows every dive and checks that a Moth
// first loops up above its slot and then sweeps off the bottom, while a Wasp
// swoops down and curves back up to where it started without leaving the
// field. Frames of a Moth mid-loop and a Wasp on its way back, and a
// recording of a run played with the keyboard, go to out/verify/firefly-dives/.

import { fieldHeight } from "../../src/firefly/rules.ts";
import {
  botInput,
  check,
  fireflyIn as firefly,
  gameIn as game,
  startFirefly,
  verify,
  walkToFirefly,
} from "../harness.ts";

interface Dive {
  kind: string;
  start: { x: number; y: number };
  minY: number;
  maxY: number;
  /** Where it was on its last diving tick, and whether it lived to finish. */
  end: { x: number; y: number };
  done: boolean;
  /** Its highest point came before its lowest: it looped up first. */
  loopedFirst: boolean;
  lowestAt: number;
  highestAt: number;
}

await verify("firefly-dives", (v) => {
  startFirefly(v, 6);
  let s = firefly(v);
  if (s === null) throw new Error("Space at the Firefly cabinet did not start Firefly");
  const open = new Map<string, Dive>();
  const dives: Dive[] = [];
  let framedMoth = false;
  let framedWasp = false;
  for (let t = 0; t < 5000 && s !== null && !s.over && dives.length < 30; t++) {
    v.step(1, botInput(s));
    const next = firefly(v);
    if (next === null) break;
    for (const e of next.enemies) {
      const key = `${e.row},${e.col}`;
      const before = s.enemies.find((b) => b.row === e.row && b.col === e.col);
      let d = open.get(key);
      if (e.state === "diving" && e.deadFrames === 0) {
        if (d === undefined && before !== undefined) {
          d = {
            kind: e.kind,
            start: { x: before.x, y: before.y },
            minY: before.y,
            maxY: before.y,
            end: { x: e.x, y: e.y },
            done: false,
            loopedFirst: false,
            lowestAt: 0,
            highestAt: 0,
          };
          open.set(key, d);
        }
        if (d === undefined) continue;
        if (e.y < d.minY) [d.minY, d.highestAt] = [e.y, t];
        if (e.y > d.maxY) [d.maxY, d.lowestAt] = [e.y, t];
        d.end = { x: e.x, y: e.y };
        if (!framedMoth && e.kind === "moth" && e.y < d.start.y - 20) {
          v.frame("1-moth-loop", 3);
          framedMoth = true;
        }
        if (!framedWasp && e.kind === "wasp" && d.maxY > 200 && e.y < 180) {
          v.frame("2-wasp-swoops-back", 3);
          framedWasp = true;
        }
      } else if (d !== undefined) {
        d.done = e.deadFrames === 0;
        d.loopedFirst = d.highestAt < d.lowestAt;
        dives.push(d);
        open.delete(key);
      }
    }
    s = next;
  }

  const moths = dives.filter((d) => d.kind === "moth" && d.done);
  const wasps = dives.filter((d) => d.kind === "wasp" && d.done);
  console.log(`dives seen: ${dives.length}, finished moths ${moths.length}, wasps ${wasps.length}`);
  check(moths.length > 0 && wasps.length > 0, "the bot saw a Moth and a Wasp finish a dive", [
    moths.length,
    wasps.length,
  ]);
  check(
    moths.every((d) => d.minY < d.start.y - 16 && d.loopedFirst && d.end.y > fieldHeight - 8),
    "every Moth loops up above its slot first, then sweeps off the bottom",
    moths,
  );
  check(
    wasps.every(
      (d) => d.maxY <= fieldHeight && d.maxY > 200 && Math.hypot(d.end.x - d.start.x, d.end.y - d.start.y) < 4,
    ),
    "every Wasp swoops low and curves back up to where it started, never leaving the field",
    wasps,
  );
  check(framedMoth && framedWasp, "frames of a Moth mid-loop and a Wasp on its way back", [framedMoth, framedWasp]);

  v.record(
    "dives",
    () => {
      walkToFirefly(v);
      check(firefly(v) !== null, "the recording plays Firefly", game(v).software);
      // Play on, Space held, until a Moth and a Wasp have each been seen
      // diving and then finished, capped so a quiet run still ends.
      const diving = new Set<string>();
      const seen = new Set<string>();
      v.hold("Space", () => {
        for (let n = 0; n < 300 && seen.size < 2; n++) {
          v.wait(100);
          const now = firefly(v);
          if (now === null || now.over) break;
          for (const e of now.enemies) {
            if (e.kind !== "moth" && e.kind !== "wasp") continue;
            const key = `${e.kind}${e.row},${e.col}`;
            if (e.state === "diving" && e.deadFrames === 0) diving.add(key);
            else if (diving.delete(key) && e.deadFrames === 0) seen.add(e.kind);
          }
        }
      });
      check(seen.has("moth") && seen.has("wasp"), "the recording shows a Moth and a Wasp finish a dive", [...seen]);
    },
    {},
  );
  v.assertNoErrors();
});
