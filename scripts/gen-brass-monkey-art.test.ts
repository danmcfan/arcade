import { describe, expect, test } from "bun:test";
import {
  bolt,
  boltGlints,
  conveyorSlats,
  door,
  emberFlame,
  emberTips,
  furnace,
  furnaceFlames,
  furnaceMouth,
  gear,
  gnomeArmsDown,
  gnomeArmsUp,
  girder,
  gnomeBody,
  ladder,
  monkeyClimb,
  monkeyHead,
  monkeyJump,
  monkeyOtherStep,
  monkeyStand,
  monkeyStep,
  wallPanel,
  wrench,
} from "../src/brass-monkey/art.ts";
import { girderFloor } from "../src/brass-monkey/floors.ts";
import { sweetie16 } from "../src/ui/sweetie16.ts";
import { checkRows, colours, empty, flipX, glint, outline, quarterTurn, type Rows } from "./pixel-art.ts";
import {
  boltFrames,
  brassMonkeyArtFiles,
  conveyorFrames,
  doorFrame,
  emberFills,
  emberFrames,
  furnaceFrames,
  gearFrames,
  girderFloorRows,
  conveyorFloorRows,
  gnomeFrames,
  monkeyFills,
  monkeyFrames,
  wrenchFrames,
  wrenchSwingFrames,
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

  test("the items are a 12×12 gear (two turns), a 12×12 ember (two flickers), a 10×14 bolt and an 8×14 wrench", () => {
    for (const rows of gear) checkRows("gear", rows, { w: 12, h: 12 });
    checkRows("ember", emberFlame, { w: 12, h: 12 });
    checkRows("bolt", bolt, { w: 10, h: 14 });
    checkRows("wrench", wrench, { w: 8, h: 14 });
    expect([gear.length, emberTips.length]).toEqual([2, 2]);
    for (const tip of emberTips) checkRows("ember tip", tip.rows, { w: 1, h: 1 });
  });

  test("the floor tiles are an 8×8 girder, an 8×4 ladder, 2 rows of conveyor slats 4 wide, a 16×24 door and a 32×32 wall", () => {
    checkRows("girder", girder, { w: 8, h: 8 });
    checkRows("ladder", ladder, { w: 8, h: 4 });
    checkRows("conveyor slats", conveyorSlats, { w: 4, h: 2 });
    checkRows("door", door, { w: 16, h: 24 });
    checkRows("wall panel", wallPanel, { w: 32, h: 32 });
  });

  test("the furnace is 16×16 with a lit mouth over its 8×3 mouth and two 16×8 flickers of flame on top", () => {
    checkRows("furnace", furnace, { w: 16, h: 16 });
    checkRows("furnace mouth", furnaceMouth.rows, { w: 8, h: 3 });
    expect(furnaceFlames.length).toBe(2);
    for (const rows of furnaceFlames) checkRows("furnace flames", rows, { w: 16, h: 8 });
  });

  test("the furnace's sheet is 16×24 frames, outlined: cold, then lit with each flicker", () => {
    const frames = furnaceFrames();
    expect(frames.length).toBe(3);
    for (const rows of frames) checkRows("furnace frame", rows, { w: 16, h: 24 });
    expect(frames[0]?.slice(0, 8).every((row) => /^\.+$/u.test(row))).toBe(true);
    expect(frames[1]).not.toEqual(frames[2]);
  });

  test("the hot gear is the gear's two turns glowing: no steel grey left", () => {
    const frames = gearFrames();
    expect(frames.length).toBe(4);
    for (const rows of frames.slice(2)) expect(rows.join("")).not.toMatch(/[wlmd]/u);
  });

  test("every bolt glint lands on the bolt", () => {
    for (const [x, y] of boltGlints) expect({ x, y, px: bolt[y]?.[x] }).not.toEqual({ x, y, px: empty });
  });

  test("every monkey and item fill leaves a blank border on all four sides, so its outline is whole", () => {
    for (const rows of [...monkeyFills(), ...gear, ...emberFills(), bolt, wrench, furnace]) {
      expect(rows[0]).toMatch(/^\.+$/u);
      expect(rows.at(-1)).toMatch(/^\.+$/u);
      for (const row of rows) expect([row[0], row.at(-1)]).toEqual([empty, empty]);
    }
  });
});

describe("generated frames", () => {
  test("the wrench stands upright, outlined, and swings down the same wrench turned a quarter clockwise", () => {
    expect(wrenchFrames()).toEqual([outline(wrench)]);
    expect(wrenchSwingFrames()).toEqual([quarterTurn(outline(wrench))]);
  });

  test("the monkey sheet is walk 1-3, jump, then climb and its mirror, each outlined", () => {
    const frames = monkeyFrames();
    expect(frames.length).toBe(6);
    expect(frames[5]).toEqual(flipX(frames[4] ?? []));
    // The outline is black, round every drawn pixel.
    expect(frames[0]?.[0]).toBe("......kkkk......");
  });

  test("the gear's frames are its two turns, outlined, then the same hot", () => {
    const frames = gearFrames();
    expect(frames.slice(0, 2)).toEqual(gear.map((rows) => outline(rows)));
  });

  test("the ember flickers, then sways: the flame with each tip, then both mirrored", () => {
    const frames = emberFrames();
    expect(frames.slice(0, 2)).toEqual(emberFills().map((rows) => outline(rows)));
    expect(frames.slice(2)).toEqual(frames.slice(0, 2).map((rows) => flipX(rows)));
  });

  test("the bolt rests, then a glint runs over its head, one frame for each step", () => {
    const [rest, ...glints] = boltFrames();
    expect(rest).toEqual(outline(bolt));
    expect(glints).toEqual(boltGlints.map(([x, y]) => glint(outline(bolt), x, y)));
  });

  test("the conveyor is the girder with a belt of slats for its top two rows, moving 1 px right a frame", () => {
    const frames = conveyorFrames();
    expect(frames.length).toBe(12);
    const beam = ["pppppppp", "popppopp", "pppppppp", "rrrrrrrr", "pppppppp", "........"];
    // Left end, middle and right end, 4 frames each; the ends round the belt's top corner.
    expect(frames[0]).toEqual([".oopooop", "rrrprrrp", ...beam]);
    expect(frames[4]).toEqual(["ooopooop", "rrrprrrp", ...beam]);
    expect(frames[5]).toEqual(["pooopooo", "prrrprrr", ...beam]);
    expect(frames[8]).toEqual(["ooopooo.", "rrrprrrp", ...beam]);
    expect(frames[11]).toEqual(["oopooop.", "rrprrrpr", ...beam]);
  });

  test("the door is outlined in black down to its foot, with no outline under it", () => {
    const rows = doorFrame();
    expect(rows).toEqual(outline(door));
    expect(rows.length).toBe(24);
    expect(rows.at(-1)).toBe("kddddddddddddddk");
  });

  test("the girder floor is 224×256: the wall, the ladders, the girders and the exit door", () => {
    const rows = girderFloorRows();
    checkRows("girder floor", rows, { w: 224, h: 256 });
    // The wall panel shows where nothing stands, e.g. the top-left corner.
    expect(rows.slice(0, 4).map((r) => r.slice(0, 4))).toEqual(wallPanel.slice(0, 4).map((r) => r.slice(0, 4)));
    // Every drawn pixel of the door is on the floor, standing on the top platform.
    const { x, y } = girderFloor.door;
    doorFrame().forEach((row, dy) => {
      for (let dx = 0; dx < row.length; dx++) {
        if (row[dx] !== empty) expect(rows[y - 24 + dy]?.[x + dx]).toBe(row[dx]);
      }
    });
  });

  test("the monkey's path is a flat girder: x 0-111 at y 248, as in the old workshop", () => {
    const rows = girderFloorRows();
    expect(rows[248]?.slice(0, 112)).toBe("o".repeat(112));
    expect(rows[249]?.slice(0, 112)).toBe("r".repeat(112));
    expect(rows[247]?.slice(0, 112)).not.toContain("o");
  });

  test("the conveyor floor is 224×256 with each conveyor drawn from the conveyor's first frames: rounded ends, slats between", () => {
    const rows = conveyorFloorRows();
    checkRows("conveyor floor", rows, { w: 224, h: 256 });
    const [left = [], , , , middle = [], , , , right = []] = conveyorFrames();
    // The tile's drawn pixels, the wall where it is blank.
    const onWall = (tile: Rows, x: number): string[] =>
      tile.map((row, dy) => Array.from(row, (c, dx) => (c === empty ? (rows[128 + dy]?.[x + dx] ?? "") : c)).join(""));
    // The top conveyor runs x 16-223 at y 128.
    const at = (x: number): string[] => rows.slice(128, 136).map((r) => r.slice(x, x + 8));
    expect(at(16)).toEqual(onWall(left, 16));
    expect(at(104)).toEqual(onWall(middle, 104));
    expect(at(216)).toEqual(onWall(right, 216));
    expect(at(16)[0]?.[0]).not.toBe("o");
    // A plain girder is not a conveyor.
    expect(rows[248]?.slice(0, 224)).toBe("o".repeat(224));
  });

  test("the Gnome's frames are mirrored to 32 wide, idle then throw", () => {
    const [idle, thrown] = gnomeFrames();
    for (const rows of [idle, thrown]) {
      checkRows("gnome", rows ?? [], { w: 32, h: 32 });
      expect(rows).toEqual(flipX(rows ?? []));
    }
  });
});

describe("generated Brass Monkey PNGs", () => {
  for (const { file, render } of brassMonkeyArtFiles) {
    test(`${file} is only Sweetie 16 colours`, () => {
      const allowed = new Set<string>([...sweetie16, "transparent"]);
      for (const c of colours(render()).keys())
        expect({ file, colour: c, ok: allowed.has(c) }).toEqual({ file, colour: c, ok: true });
    });
  }
});
