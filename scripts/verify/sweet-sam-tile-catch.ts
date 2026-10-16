// A bee catches the bear anywhere in the bear's tile, not only within 1 px
// (#222), in a real browser (`bun run verify sweet-sam-tile-catch`). Replays
// the sweet-sam-clear fixture through the `?debug` test hook: a sleepy orange
// bee 3.75 px from the bear, in its tile, is eaten; later red, 3.8 px away in
// the bear's tile, catches it. Writes a frame before and after each, then a
// video of both, to out/verify/sweet-sam-tile-catch/.

import type { SweetSamEnemySnapshot, SweetSamSnapshot } from "../../src/game/snapshot.ts";
import { inputPath, loadScript } from "../../test/parity/fixtures.ts";
import { loadFixture, replayLive, skipTo } from "../fixture-replay.ts";
import { isGameSnapshot, sweetSamIn, verify, type Verify } from "../harness.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

function sweetSam(v: Verify): SweetSamSnapshot {
  return sweetSamIn(v.snapshot(isGameSnapshot));
}

function bee(s: SweetSamSnapshot, kind: string): SweetSamEnemySnapshot {
  const e = s.enemies.find((b) => b.kind === kind);
  if (e === undefined) throw new Error(`no ${kind} bee`);
  return e;
}

const tile = (n: number): number => Math.trunc(n / 8);

/** The bee is in the bear's tile but more than 1 px from it on some axis. */
function inTileFar(s: SweetSamSnapshot, e: SweetSamEnemySnapshot): boolean {
  const { x, y } = s.player;
  return tile(e.x) === tile(x) && tile(e.y) === tile(y) && Math.max(Math.abs(e.x - x), Math.abs(e.y - y)) > 1;
}

const script = loadScript(inputPath("sweet-sam-clear"));

await verify("sweet-sam-tile-catch", (v) => {
  v.openHook("scene=game");
  v.dismissNotice();
  loadFixture(v, script);

  skipTo(v, script, 0, 1139);
  let s = sweetSam(v);
  let e = bee(s, "orange");
  check(s.state === "PLAY" && e.blue > 0 && inTileFar(s, e), "1139: sleepy orange is in the bear's tile, 3.75 px off", [
    s.player,
    e,
  ]);
  v.frame("1-sleepy-bee-in-tile", 2);

  skipTo(v, script, 1139, 1140);
  s = sweetSam(v);
  check(s.state === "PAUSE" && bee(s, "orange").eyes, "1140: the bear eats it", [s.state, bee(s, "orange")]);
  v.frame("2-sleepy-bee-eaten", 2);

  skipTo(v, script, 1140, 1860);
  s = sweetSam(v);
  e = bee(s, "red");
  check(s.state === "PLAY" && e.blue === 0 && inTileFar(s, e), "1860: red is in the bear's tile, 3.8 px off", [
    s.player,
    e,
  ]);
  v.frame("3-bee-in-tile", 2);

  skipTo(v, script, 1860, 1861);
  s = sweetSam(v);
  check(s.state === "DEATHWAIT", "1861: red catches the bear", s.state);
  v.frame("4-bear-caught", 2);

  v.record(
    "tile-catch",
    () => {
      v.dismissNotice();
      loadFixture(v, script);
      skipTo(v, script, 0, 1100);
      replayLive(v, script, 1100, 1200);
      skipTo(v, script, 1200, 1800);
      replayLive(v, script, 1800, 1900);
      v.wait(500);
    },
    { scene: "game" },
  );

  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
