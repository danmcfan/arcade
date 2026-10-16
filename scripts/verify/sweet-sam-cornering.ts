// The bear's cornering (#157, #223) in a real browser (`bun run verify sweet-sam-cornering`).
// Two scenarios. Headless, the bear runs LEFT from the start until it is 3 px
// short of a junction that opens UP (early turn), or RIGHT until it is 4 px
// past one (late turn, Dossier "Cornering"); there a single tick of UP is
// tapped and released. The run is replayed through the `?debug` test hook: the
// tapped turn is taken, the bear cuts the corner and ends on the new
// corridor's centre line. Writes a frame before the tap, mid-corner and after
// it, and a video, to out/verify/sweet-sam-cornering/ and
// out/verify/sweet-sam-cornering-right/.

import { NO_INPUT, type Input } from "../../src/engine/input.ts";
import * as rng from "../../src/engine/rng.ts";
import type { InputScript } from "../../src/game/script.ts";
import type { SweetSamSnapshot } from "../../src/game/snapshot.ts";
import { SweetSamSoftware } from "../../src/sweet-sam/software.ts";
import { minigame } from "../../src/game/minigames.ts";
import { replayLive, loadFixture, skipTo } from "../fixture-replay.ts";
import { isGameSnapshot, verify, type Verify } from "../harness.ts";
import { compress } from "../sweet-sam-bot.ts";

function check(ok: boolean, what: string, got?: unknown): void {
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

function sweetSam(v: Verify): SweetSamSnapshot {
  const g = v.snapshot(isGameSnapshot);
  if (g.software !== "sweetSam" || g.sw === null || !("modeTicks" in g.sw)) throw new Error("not in Sweet Sam");
  return g.sw;
}

const seed = 1;

interface Scenario {
  name: string;
  heading: "LEFT" | "RIGHT";
  /** The bear's x minus the junction centre's when the turn is tapped. */
  offset: number;
  taken: "early" | "late";
}

async function scenario({ name, heading, offset, taken }: Scenario): Promise<void> {
  const key = heading === "LEFT" ? "left" : "right";
  const where = `${offset} px ${heading === "LEFT" ? "short of" : "past"} the junction`;

  // Plan the run headless: hold `heading` until the bear is at the offset from a junction that opens UP.
  rng.seed(seed);
  const s = minigame("sweetSam").create({ highScore: 0, prizes: [] });
  if (!(s instanceof SweetSamSoftware)) throw new Error("Sweet Sam's create must build a SweetSamSoftware");
  const inputs: Input[] = [];
  const hold = { ...NO_INPUT, [key]: true };
  let corner: { x: number; y: number } | null = null;
  while (corner === null && inputs.length < 2000) {
    const p = s.player;
    const live = s.stateMachine.currentId() === "PLAY" && p.direction === heading;
    corner = live
      ? (s.corners.find((c) => c.y === p.y && c.x === p.x - offset && c.directions.includes("UP")) ?? null)
      : null;
    const i = corner === null ? hold : { ...NO_INPUT, up: true };
    inputs.push(i);
    s.update(i);
  }
  if (corner === null) throw new Error(`the bear never came ${where} opening UP`);
  const tapTick = inputs.length + 1;
  for (let t = 0; t < 40; t++) inputs.push(NO_INPUT);

  const script: InputScript = {
    name,
    scene: "game",
    software: "sweetSam",
    seed,
    captureTicks: [],
    steps: [{ ticks: 1, input: {} }, ...compress(inputs)],
  };
  const total = tapTick + 40;

  await verify(name, (v) => {
    v.openHook("scene=game");
    v.dismissNotice();
    loadFixture(v, script);

    skipTo(v, script, 0, tapTick - 1);
    const before = sweetSam(v).player;
    check(before.dir === heading && before.x === corner.x + offset, `${where}, heading ${heading}`, before);
    v.frame("before-tap", 4);

    skipTo(v, script, tapTick - 1, tapTick + 1);
    const mid = sweetSam(v).player;
    check(mid.dir === "UP", `the tapped UP is taken ${taken}`, mid);
    check(mid.x !== corner.x && mid.y < corner.y, "the bear cuts the corner", mid);
    v.frame("cutting-the-corner", 4);

    skipTo(v, script, tapTick + 1, tapTick + 12);
    const after = sweetSam(v).player;
    check(after.dir === "UP" && after.x === corner.x, "the bear ends on the new corridor's centre line", after);
    v.frame("after-turn", 4);

    v.record(
      `tapped-${taken}-turn`,
      () => {
        v.dismissNotice();
        loadFixture(v, script);
        skipTo(v, script, 0, Math.max(0, tapTick - 40));
        replayLive(v, script, Math.max(0, tapTick - 40), total);
        v.wait(500);
      },
      { scene: "game" },
    );
    v.assertNoErrors();
  });
}

await scenario({ name: "sweet-sam-cornering", heading: "LEFT", offset: 3, taken: "early" });
await scenario({ name: "sweet-sam-cornering-right", heading: "RIGHT", offset: 4, taken: "late" });
