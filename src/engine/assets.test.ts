import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { basename } from "node:path";
import { PNG } from "pngjs";
import { allImages, images, loadImages, lumberjackImages, sounds } from "./assets.ts";
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

  test("registers every arcade PNG except the unused shipExplosion.png", () => {
    const registered = Object.values(images).map((a) => basename(a.url));
    const onDisk = readdirSync(new URL("../assets/images", import.meta.url)).filter(
      (f) => f.endsWith(".png") && f !== "shipExplosion.png",
    );
    expect(registered.sort()).toEqual(onDisk.sort());
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
  test("mirrors assets.go plus the title's sounds: the two tunes loop, effects don't", () => {
    expect(Object.keys(sounds).sort()).toEqual(["boom", "death", "deny", "laser", "melody", "move", "power", "select", "start", "ticket", "title"]);
    expect(Object.values(sounds).filter((s) => s.loop).map((s) => s.name)).toEqual(["melody", "title"]);
  });
});

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
    const made: FakeImage[] = [];
    await loadImages([a, b], () => {
      const img = new FakeImage();
      made.push(img);
      return img as unknown as HTMLImageElement;
    });
    expect(made.map((i) => [i.src, i.decoded])).toEqual([
      ["a.png", true],
      ["b.png", true],
    ]);
    expect(a.image).toBe(made[0] as unknown as HTMLImageElement);
    expect(b.image).toBe(made[1] as unknown as HTMLImageElement);
  });

  test("rejects with the failing URL", async () => {
    const bad: ImageAsset = { url: "missing.png", width: 1, height: 1, image: null };
    const broken = { src: "", decode: () => Promise.reject(new Error("decode failed")) };
    await expect(loadImages([bad], () => broken as unknown as HTMLImageElement)).rejects.toThrow("missing.png");
    expect(bad.image).toBeNull();
  });
});
