import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { gnomeIdle, gnomeThrow, monkeyClimb, monkeyJump, monkeyWalk } from "../src/brass-monkey/art.ts";
import { sweetie16 } from "../src/ui/sweetie16.ts";
import { checkRows, colours, empty, flipX, toRows } from "./pixel-art.ts";
import { brassMonkeyArtFiles, brassMonkeyImagesDir, gnomeFrames, monkeyFrames } from "./gen-brass-monkey-art.ts";

describe("Brass Monkey art source", () => {
  test("the monkey's frames are 16×16 fills: three walking, one jumping, one climbing", () => {
    expect(monkeyWalk.length).toBe(3);
    monkeyWalk.forEach((rows, i) => {
      checkRows(`walk ${i}`, rows, { w: 16, h: 16 });
    });
    checkRows("jump", monkeyJump, { w: 16, h: 16 });
    checkRows("climb", monkeyClimb, { w: 16, h: 16 });
  });

  test("the Gnome's frames are the left halves of 32×32", () => {
    checkRows("gnome idle", gnomeIdle, { w: 16, h: 32 });
    checkRows("gnome throw", gnomeThrow, { w: 16, h: 32 });
  });

  test("fills leave the outline's border blank at the top and sides", () => {
    for (const rows of [...monkeyWalk, monkeyJump, monkeyClimb, gnomeIdle, gnomeThrow]) {
      expect(rows[0]).toMatch(/^\.+$/u);
      for (const row of rows) expect(row[0]).toBe(empty);
    }
  });
});

describe("generated frames", () => {
  test("the monkey sheet is walk 1-3, jump, then climb and its mirror, each outlined", () => {
    const frames = monkeyFrames();
    expect(frames.length).toBe(6);
    expect(frames[5]).toEqual(flipX(frames[4] ?? []));
    // The outline is black, round every drawn pixel.
    expect(frames[0]?.[0]).toBe("......kkkk......");
  });

  test("the Gnome's frames are mirrored to 32 wide, idle then throw", () => {
    const [idle, thrown] = gnomeFrames();
    for (const rows of [idle, thrown]) {
      checkRows("gnome", rows ?? [], { w: 32, h: 32 });
      expect(rows).toEqual(flipX(rows ?? []));
    }
  });
});

describe("committed Brass Monkey PNGs match src/brass-monkey/art.ts (run `bun run art` after editing it)", () => {
  test("src/assets/images/brass-monkey holds exactly the generated files", () => {
    expect(readdirSync(brassMonkeyImagesDir).toSorted()).toEqual(brassMonkeyArtFiles.map((f) => f.file).toSorted());
  });

  for (const { file, render } of brassMonkeyArtFiles) {
    test(file, () => {
      const onDisk = PNG.sync.read(readFileSync(join(brassMonkeyImagesDir, file)));
      expect(toRows(onDisk)).toEqual(toRows(render()));
    });

    test(`${file} is only Sweetie 16 colours`, () => {
      const allowed = new Set<string>([...sweetie16, "transparent"]);
      for (const c of colours(render()).keys())
        expect({ file, colour: c, ok: allowed.has(c) }).toEqual({ file, colour: c, ok: true });
    });
  }
});
