import { expect, test } from "bun:test";
import { createScene } from "../src/game/registry.ts";
import { enterFromHub } from "./gen-brass-monkey-play.ts";

test("the bot walks from the hub's spawn into the Brass Monkey cabinet", () => {
  const scene = createScene("game", {});
  try {
    enterFromHub(scene);
    const s = scene.snapshot();
    expect("arcade" in s ? s.software : null).toBe("brassMonkey");
  } finally {
    scene.dispose?.();
  }
});
