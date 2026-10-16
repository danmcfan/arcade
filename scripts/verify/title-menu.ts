// The title menu (`bun run verify title-menu`): no high score and no key
// hints; the logo on the top margin, the menu in a panel that stays put with
// or without Continue, the site address on the bottom margin. Frames of the
// menu without and with a save (Continue), the New game check and the hub
// pause menu, plus a live screenshot and a short video, go to
// out/verify/title-menu/.

import { saveKey } from "../../src/title/save.ts";
import { isTitleSnapshot, verify } from "../harness.ts";

const save = {
  v: 3,
  highScore: 1230,
  tokens: 5,
  tickets: 0,
  prizes: [],
  player: { x: 80, y: 92, dir: "UP" },
};
const storage = { [saveKey]: JSON.stringify(save) };

await verify("title-menu", (v) => {
  // A desktop viewport: a headless browser that reports no pointer would otherwise get the keyboard notice.
  v.page.run("set", "viewport", "1280", "900");
  v.openHook();
  v.page.eval(`localStorage.clear(); "ok"`);
  v.openHook();
  if (v.snapshot(isTitleSnapshot).canContinue) throw new Error("expected no save");
  v.frame("0-menu-new");
  const newOnly = v.snapshot(isTitleSnapshot);
  if (newOnly.items.join() !== "NEW GAME") throw new Error(`expected only New game: ${newOnly.items.join()}`);
  v.page.eval(`localStorage.setItem(${JSON.stringify(saveKey)}, ${JSON.stringify(storage[saveKey])}); "ok"`);
  v.openHook();
  let s = v.snapshot(isTitleSnapshot);
  if (s.phase !== "menu" || !s.canContinue)
    throw new Error(`expected the title menu with Continue: ${JSON.stringify(s)}`);
  v.frame("1-menu");

  v.tap("down");
  v.tap("space");
  s = v.snapshot(isTitleSnapshot);
  if (s.phase !== "confirm") throw new Error(`expected the New game check: ${s.phase}`);
  v.frame("2-confirm");
  v.tap("space");

  v.tap("up");
  v.tap("space");
  v.tap("escape");
  s = v.snapshot(isTitleSnapshot);
  if (s.phase !== "paused") throw new Error(`expected the hub pause menu: ${s.phase}`);
  v.frame("3-pause");

  v.open();
  v.screenshot("4-live-menu");

  v.record(
    "menu",
    () => {
      v.wait(800);
      v.key("KeyS");
      v.wait(500);
      v.key("KeyW");
      v.wait(500);
      v.key("KeyE");
      v.wait(800);
      v.key("Escape");
      v.wait(800);
    },
    { storage },
  );
  v.assertNoErrors();
});
