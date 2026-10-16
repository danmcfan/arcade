// The title logo (#145) in a real browser (`bun run verify title-logo`): the
// block-lettered ARCADE with the cabinet behind it and the chunky bar beneath,
// framed through its animation (the sheen across the letters, the pulse along
// the bar, the cabinet's game and lights, the back lights), with and without a
// save, then a video of the title menu. Output goes to out/verify/title-logo/.

import { saveKey } from "../../src/title/save.ts";
import { isTitleSnapshot, verify } from "../harness.ts";

await verify("title-logo", (v) => {
  // A desktop viewport: a headless browser that reports no pointer would otherwise get the keyboard notice.
  v.page.run("set", "viewport", "1280", "900");
  v.openHook();
  v.page.eval("localStorage.clear()");
  v.openHook();
  if (v.snapshot(isTitleSnapshot).phase !== "menu") throw new Error("the page did not open on the title menu");
  // Ticks 20 and 40 are mid-sheen and mid-pulse; 100 is between sheens.
  v.step(20);
  v.frame("1-sheen");
  v.step(20);
  v.frame("2-pulse");
  v.step(60);
  v.frame("3-between");

  const save = { v: 1, highScore: 120, player: { x: 60, y: 92, dir: "LEFT" } };
  v.page.eval(`localStorage.setItem(${JSON.stringify(saveKey)}, ${JSON.stringify(JSON.stringify(save))}); "ok"`);
  v.openHook();
  v.step(30);
  v.frame("4-with-save");

  v.record("title-logo", () => {
    v.wait(7000);
  });
  v.assertNoErrors();
});
