// The "needs a keyboard" notice on a touch-first device (issue #26), in a real
// browser (`bun run verify keyboard-notice`). Part 1 loads the page at a
// desktop size: straight to the title. Part 2 emulates a phone (viewport plus
// touch, so `(pointer: coarse) and (hover: none)` matches): the notice shows,
// the title does not step, and a key press dismisses it without moving or
// choosing anything on the title menu. Part 3 records the phone flow.
// Screenshots, frames and the video go to out/verify/keyboard-notice/.

import type { TitleSnapshot } from "../../src/game/snapshot.ts";
import { saveKey } from "../../src/title/save.ts";
import { noticeHeight, noticeWidth } from "../../src/ui/notice.ts";
import { verify, type Verify } from "../harness.ts";

let checks = 0;

function check(ok: boolean, what: string, got?: unknown): void {
  checks++;
  if (!ok) throw new Error(`FAILED: ${what}${got === undefined ? "" : `\n  got: ${JSON.stringify(got)}`}`);
  console.log(`  ok  ${what}`);
}

const save = JSON.stringify({ v: 2, highScore: 0, tokens: 3, tickets: 0, player: { x: 60, y: 92, dir: "LEFT" } });

function canvasSize(v: Verify): string {
  return v.page.eval("(() => { const c = document.getElementById('screen'); return c.width + 'x' + c.height; })()");
}

function touchFirst(v: Verify): boolean {
  return v.page.eval("String(matchMedia('(pointer: coarse) and (hover: none)').matches)") === "true";
}

/** Open with the test hook but the loop running, and a save so the menu has two items. */
function openWithSave(v: Verify): void {
  v.open("?debug");
  v.page.eval(`localStorage.setItem(${JSON.stringify(saveKey)}, ${JSON.stringify(save)}); "ok"`);
  v.open("?debug");
  v.page.run("wait", "--fn", "window.__arcade !== undefined");
}

/** A held key with one auto-repeat keydown, as a real keyboard sends. */
function holdWithRepeat(v: Verify, code: string): void {
  const key = code === "Space" ? " " : code;
  const init = (repeat: boolean) => JSON.stringify({ code, key, repeat, bubbles: true });
  v.page.eval(`(async () => {
    window.dispatchEvent(new KeyboardEvent("keydown", ${init(false)}));
    await new Promise((r) => setTimeout(r, 250));
    window.dispatchEvent(new KeyboardEvent("keydown", ${init(true)}));
    await new Promise((r) => setTimeout(r, 150));
    window.dispatchEvent(new KeyboardEvent("keyup", ${init(false)}));
    await new Promise((r) => setTimeout(r, 60));
    return "ok";
  })()`);
}

function desktopChecks(v: Verify): void {
  console.log("desktop:");
  v.page.run("set", "viewport", "1280", "800");
  openWithSave(v);
  check(!touchFirst(v), "a desktop browser is not touch-first");
  v.wait(300);
  check(canvasSize(v) === "192x176", "the canvas has the title's size", canvasSize(v));
  const s = v.snapshot<TitleSnapshot>();
  check(s.phase === "menu" && s.tick > 0, "the title scene runs straight away", s);
  v.screenshot("1-desktop-title");
}

function phoneChecks(v: Verify): void {
  console.log("phone:");
  openWithSave(v);
  check(touchFirst(v), "the emulated phone is touch-first");
  v.wait(300);
  check(canvasSize(v) === `${noticeWidth}x${noticeHeight}`, "the canvas shows the notice", canvasSize(v));
  check(v.page.eval("String(window.__arcade.tick())") === "0", "the title scene does not step under the notice");
  check(!v.page.eval("JSON.stringify(window.__arcade.sounds())").includes("play:"), "nothing plays under the notice");
  v.screenshot("2-phone-notice");
  v.frame("2-notice-frame", 4);

  holdWithRepeat(v, "ArrowDown");
  v.wait(100);
  check(canvasSize(v) === "192x176", "a key press dismisses the notice", canvasSize(v));
  let s = v.snapshot<TitleSnapshot>();
  check(
    s.phase === "menu" && s.tick > 0 && s.cursor === 0 && s.items.join() === "CONTINUE,NEW GAME",
    "the title menu runs, and the Down that dismissed the notice did not move the cursor",
    s,
  );
  v.screenshot("3-phone-title");

  openWithSave(v);
  v.wait(200);
  check(canvasSize(v) === `${noticeWidth}x${noticeHeight}`, "the notice is back after a reload (not remembered)");
  holdWithRepeat(v, "Space");
  v.wait(100);
  s = v.snapshot<TitleSnapshot>();
  check(s.phase === "menu" && s.cursor === 0, "the Space that dismissed the notice did not choose Continue", s);
  v.key("Space");
  s = v.snapshot<TitleSnapshot>();
  check(s.phase === "playing", "the next Space chooses Continue", s.phase);
}

async function recordPhone(v: Verify): Promise<void> {
  console.log("video:");
  await v.recordPhone(
    "phone-notice",
    () => {
      check(touchFirst(v), "the recording is still an emulated phone");
      v.wait(1500);
      v.key("ArrowDown", 300);
      check(
        v.snapshot<TitleSnapshot>().cursor === 0 && canvasSize(v) === "192x176",
        "in the video, Down dismisses the notice without moving the cursor",
      );
      v.wait(1200);
      v.key("ArrowDown");
      v.wait(800);
    },
    { storage: { [saveKey]: save } },
  );
}

await verify("keyboard-notice", async (v) => {
  desktopChecks(v);
  await v.phone();
  phoneChecks(v);
  await recordPhone(v);
  v.assertNoErrors();
  console.log(`\n${checks} checks passed.`);
});
