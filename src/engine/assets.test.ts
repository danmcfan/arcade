import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync } from "node:fs";
import { basename } from "node:path";
import { PNG } from "pngjs";
import { allImages, images, lumberjackImages, sounds } from "./assets.ts";

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
  test("mirrors assets.go: melody loops, effects don't", () => {
    expect(Object.keys(sounds).sort()).toEqual(["boom", "death", "laser", "melody", "power", "start"]);
    expect(sounds.melody.loop).toBe(true);
    expect(sounds.laser.loop).toBe(false);
  });
});
