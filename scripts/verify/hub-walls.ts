// The hub's walls at the frame's edges and the solid prize desk (#93) in a
// real browser (`bun run verify hub-walls`): the player reaches each edge of
// the carpet and walks down either side of the desk to the bottom edge, but
// never into its U. A video records the walk round the room. Files go to
// out/verify/hub-walls/.

import type { GameSnapshot } from "../../src/game/snapshot.ts";
import { isGameSnapshot, verify, type Verify } from "../harness.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

function player(v: Verify): GameSnapshot["arcade"]["player"] {
  return v.snapshot(isGameSnapshot).arcade.player;
}

await verify("hub-walls", (v) => {
  console.log("the edges of the room:");
  v.openHook("scene=game");
  v.step(100, { left: true });
  v.frame("1-left-edge");
  check(player(v).x === 8, "left stops at the frame's left edge", player(v));
  v.step(100, { down: true });
  v.frame("2-left-of-desk");
  check(player(v).y === 132, "down the desk's left side to the bottom edge", player(v));
  v.step(100, { right: true });
  v.frame("3-against-left-arm");
  check(player(v).x === 28, "right stops against the desk's left arm", player(v));
  v.step(100, { up: true });
  v.step(200, { right: true });
  v.frame("4-right-edge");
  check(player(v).x === 152, "right stops at the frame's right edge", player(v));
  v.step(100, { down: true });
  v.step(100, { left: true });
  v.frame("5-against-right-arm");
  check(player(v).x === 132 && player(v).y === 132, "down the right side, left stops against the right arm", player(v));

  console.log("video:");
  v.record(
    "walk-round",
    () => {
      v.wait(500);
      v.key("ArrowLeft", 1400);
      v.key("ArrowDown", 800);
      v.key("ArrowRight", 600);
      v.key("ArrowUp", 1000);
      v.key("ArrowRight", 2600);
      v.key("ArrowDown", 1000);
      v.key("ArrowLeft", 600);
      v.wait(500);
    },
    { scene: "game" },
  );

  v.assertNoErrors();
  console.log(`${checks} checks passed`);
});
