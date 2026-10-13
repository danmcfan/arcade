import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import {
  gnomeArmsDown,
  gnomeArmsUp,
  gnomeBody,
  monkeyClimb,
  monkeyHead,
  monkeyJump,
  monkeyOtherStep,
  monkeyStand,
  monkeyStep,
} from "../src/brass-monkey/art.ts";
import { sweetie16 } from "../src/ui/sweetie16.ts";
import { checkRows, colours, empty, flipX, toRows } from "./pixel-art.ts";
import {
  brassMonkeyArtFiles,
  brassMonkeyImagesDir,
  gnomeFrames,
  monkeyFills,
  monkeyFrames,
} from "./gen-brass-monkey-art.ts";

describe("Brass Monkey art source", () => {
  test("the monkey is a 16×10 head over 16×6 bodies (16×5 for the steps, drawn 1 px lower), and a 16×16 climb", () => {
    checkRows("head", monkeyHead, { w: 16, h: 10 });
    checkRows("stand", monkeyStand, { w: 16, h: 6 });
    checkRows("step", monkeyStep, { w: 16, h: 5 });
    checkRows("other step", monkeyOtherStep, { w: 16, h: 5 });
    checkRows("jump", monkeyJump, { w: 16, h: 6 });
    checkRows("climb", monkeyClimb, { w: 16, h: 16 });
  });

  test("the Gnome is the left half of a 32×32 body, with arm parts that fit inside it", () => {
    checkRows("gnome body", gnomeBody, { w: 16, h: 32 });
    for (const [name, arms] of [
      ["arms down", gnomeArmsDown],
      ["arms up", gnomeArmsUp],
    ] as const) {
      checkRows(name, arms.rows);
      expect(arms.x + (arms.rows[0]?.length ?? 0)).toBeLessThanOrEqual(16);
      expect(arms.y + arms.rows.length).toBeLessThanOrEqual(32);
    }
  });

  test("every monkey fill leaves a blank border on all four sides, so its outline is whole", () => {
    for (const rows of monkeyFills()) {
      expect(rows[0]).toMatch(/^\.+$/u);
      expect(rows.at(-1)).toMatch(/^\.+$/u);
      for (const row of rows) expect([row[0], row.at(-1)]).toEqual([empty, empty]);
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
