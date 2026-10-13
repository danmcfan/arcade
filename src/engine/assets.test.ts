import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { basename } from "node:path";
import { PNG } from "pngjs";
import {
  allImages,
  brassMonkeyImages,
  fireflyImages,
  images,
  loadImages,
  lumberjackImages,
  sounds,
  sweetSamImages,
} from "./assets.ts";
import { defined } from "./defined.testutil.ts";
import type { ImageAsset } from "./image.ts";

function pngSize(path: string): { width: number; height: number } {
  const png = PNG.sync.read(readFileSync(path));
  return { width: png.width, height: png.height };
}

describe("image registry (D12)", () => {
  test("hard-coded dimensions match every PNG header", () => {
    for (const asset of allImages) {
      expect({ url: asset.url, ...pngSize(asset.url) }).toEqual({
        url: asset.url,
        width: asset.width,
        height: asset.height,
      });
    }
  });

  test("registers every arcade PNG", () => {
    const registered = Object.values(images).map((a) => basename(a.url));
    const onDisk = readdirSync(new URL("../assets/images", import.meta.url)).filter((f) => f.endsWith(".png"));
    expect(registered.toSorted()).toEqual(onDisk.toSorted());
  });

  test("registers every Firefly PNG, and none of the Go space art is left", () => {
    const registered = Object.values(fireflyImages).map((a) => basename(a.url));
    const onDisk = readdirSync(new URL("../assets/images/firefly", import.meta.url));
    expect(registered.toSorted()).toEqual(onDisk.toSorted());
    const gone = new Set(["galaxy.png", "ship.png", "bullet.png", "bug.png", "explosion.png", "shipExplosion.png"]);
    const all = readdirSync(new URL("../assets/images", import.meta.url), { recursive: true }).map((f) =>
      basename(String(f)),
    );
    expect(all.filter((f) => gone.has(f))).toEqual([]);
  });

  test("registers every Brass Monkey PNG, and the Go player sheet is gone", () => {
    const registered = Object.values(brassMonkeyImages).map((a) => basename(a.url));
    const onDisk = readdirSync(new URL("../assets/images/brass-monkey", import.meta.url));
    expect(registered.toSorted()).toEqual(onDisk.toSorted());
    expect(readdirSync(new URL("../assets/images", import.meta.url))).not.toContain("gnome.png");
  });

  test("registers every Sweet Sam PNG, and none of the Go game's Sweet Sam art is left", () => {
    const registered = Object.values(sweetSamImages).map((a) => basename(a.url));
    const onDisk = readdirSync(new URL("../assets/images/sweet-sam", import.meta.url));
    expect(registered.toSorted()).toEqual(onDisk.toSorted());
    const gone = new Set([
      "sweet-sam-maze.png",
      "bear.png",
      "bee.png",
      "food.png",
      "bonus.png",
      "ready.png",
      "digits.png",
    ]);
    const top = readdirSync(new URL("../assets/images", import.meta.url));
    expect(top.filter((f) => gone.has(f))).toEqual([]);
  });

  test("registers the 9 lumberjack sheets by their Go paths", () => {
    expect(Object.keys(lumberjackImages).length).toBe(9);
    for (const [path, asset] of Object.entries(lumberjackImages)) {
      expect(asset.url.endsWith(`/lab/lumberjack/images/${path}`)).toBe(true);
    }
  });

  test("decoded pixels start detached (no DOM under bun test)", () => {
    for (const asset of allImages) expect(asset.image).toBeNull();
  });
});

describe("sound registry", () => {
  test("the hub's sounds, the minigame sounds and the title's: the songs and attract loops loop, effects don't", () => {
    expect(Object.keys(sounds).toSorted()).toEqual([
      "attractBrassMonkey",
      "attractFirefly",
      "attractSweet",
      "boom",
      "deny",
      "hub",
      "laser",
      "move",
      "screenOn",
      "select",
      "sweetBee",
      "sweetChompHigh",
      "sweetChompLow",
      "sweetClear",
      "sweetDeath",
      "sweetFlower",
      "sweetSmoke",
      "sweetStart",
      "ticket",
      "title",
    ]);
    expect(
      Object.values(sounds)
        .filter((s) => s.loop)
        .map((s) => s.name),
    ).toEqual(["hub", "attractBrassMonkey", "attractSweet", "attractFirefly", "title"]);
  });
});

/** Lets a test double stand in for the DOM image `loadImages` creates; it checks the members `loadImages` uses. */
function standsInForImage(x: object): x is HTMLImageElement {
  return "src" in x && "decode" in x && typeof x.decode === "function";
}

describe("loadImages (D5)", () => {
  class FakeImage {
    src = "";
    decoded = false;
    async decode(): Promise<void> {
      await Promise.resolve();
      this.decoded = true;
    }
  }

  test("decodes every image before resolving and attaches it to its asset", async () => {
    const a: ImageAsset = { url: "a.png", width: 1, height: 1, image: null };
    const b: ImageAsset = { url: "b.png", width: 1, height: 1, image: null };
    const made: (FakeImage & HTMLImageElement)[] = [];
    await loadImages([a, b], () => {
      const img = new FakeImage();
      if (!standsInForImage(img)) throw new Error("FakeImage lacks src/decode");
      made.push(img);
      return img;
    });
    expect(made.map((i) => [i.src, i.decoded])).toEqual([
      ["a.png", true],
      ["b.png", true],
    ]);
    expect(a.image).toBe(defined(made[0]));
    expect(b.image).toBe(defined(made[1]));
  });

  test("rejects with the failing URL", async () => {
    const bad: ImageAsset = { url: "missing.png", width: 1, height: 1, image: null };
    const broken = {
      src: "",
      decode: async (): Promise<never> => {
        await Promise.resolve();
        throw new Error("decode failed");
      },
    };
    if (!standsInForImage(broken)) throw new Error("broken image lacks src/decode");
    const err = await loadImages([bad], () => broken).then(
      () => null,
      (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(Error);
    expect(err instanceof Error ? err.message : "").toContain("missing.png");
    expect(bad.image).toBeNull();
  });
});
