import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, posix } from "node:path";
import { PNG } from "pngjs";
import { repoRoot } from "../test/parity/fixtures.ts";
import { allOutputs, imageTable, tableEntries, tablePath } from "./gen-art.ts";
import { imageOutput } from "./image-outputs.ts";

const none = (): PNG => new PNG({ width: 1, height: 1 });

describe("image table", () => {
  test("groups each image by its folder and keys it by its camelCase file name", () => {
    const entries = tableEntries([
      imageOutput("src/assets/images/owl-hurt.png", 1, 1, none),
      imageOutput("src/assets/images/sweet-sam/honey-pot.png", 1, 1, none),
      imageOutput("art/title-cards/sweet.png", 1, 1, none),
    ]);
    expect(entries.map(({ group, key, ident }) => [group, key, ident])).toEqual([
      ["images", "owlHurt", "owlHurtUrl"],
      ["sweetSamImages", "honeyPot", "sweetSamHoneyPotUrl"],
    ]);
  });

  test("an image declared twice is refused", () => {
    expect(() =>
      tableEntries([
        imageOutput("src/assets/images/a.png", 1, 1, none),
        imageOutput("src/assets/images/a.png", 1, 1, none),
      ]),
    ).toThrow("images.a is declared twice");
  });
});

describe("committed art matches its source (run `bun run art` after editing it)", () => {
  test.each(allOutputs.map((o) => [o.file, o] as const))("%s", (file, { width, height, render }) => {
    const onDisk = PNG.sync.read(readFileSync(join(repoRoot, file)));
    const fresh = render();
    expect([onDisk.width, onDisk.height, fresh.width, fresh.height]).toEqual([width, height, width, height]);
    expect(Buffer.compare(onDisk.data, fresh.data)).toBe(0);
  });

  test(posix.basename(tablePath), async () => {
    expect(readFileSync(tablePath, "utf8")).toBe(await imageTable());
  });

  test("src/assets/images holds exactly the declared PNGs", () => {
    const onDisk = readdirSync(join(repoRoot, "src/assets/images"), { recursive: true })
      .map(String)
      .filter((f) => f.endsWith(".png"))
      .map((f) => posix.join("src/assets/images", f));
    expect(onDisk.toSorted()).toEqual(
      allOutputs
        .map((o) => o.file)
        .filter((f) => f.startsWith("src/assets/images/"))
        .toSorted(),
    );
  });
});
