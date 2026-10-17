import { describe, expect, test } from "bun:test";
import {
  bolt,
  boltGlints,
  conveyorSlats,
  door,
  rivet,
  emberFlame,
  emberTips,
  gear,
  gnomeArmsDown,
  gnomeArmsReach,
  gnomeArmsUp,
  girder,
  gnomeBody,
  ladder,
  monkeyClimb,
  monkeyHead,
  monkeyJump,
  monkeySmoke,
  monkeyOtherStep,
  monkeyStand,
  monkeyStep,
  panScraps,
  panTray,
  spring,
  wallPanel,
} from "../src/brass-monkey/art.ts";
import { elevatorFloor, girderFloor } from "../src/brass-monkey/floors.ts";
import { sweetie16 } from "../src/ui/sweetie16.ts";
import { checkRows, colours, empty, flipX, glint, outline, type Rows } from "./pixel-art.ts";
import {
  boltFrames,
  brassMonkeyArtFiles,
  conveyorFrames,
  doorFrame,
  rivetFloorRows,
  emberFills,
  emberFrames,
  gearFrames,
  girderFloorRows,
  conveyorFloorRows,
  elevatorFloorRows,
  liftFrame,
  springFrames,
  gnomeFrames,
  monkeyFills,
  monkeyDeathFrames,
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
      ["arms reaching", gnomeArmsReach],
    ] as const) {
      checkRows(name, arms.rows);
      expect(arms.x + (arms.rows[0]?.length ?? 0)).toBeLessThanOrEqual(16);
      expect(arms.y + arms.rows.length).toBeLessThanOrEqual(32);
    }
  });

  test("the items are a 12×12 gear (two turns), a 12×12 ember (two flickers) and a 10×14 bolt", () => {
    for (const rows of gear) checkRows("gear", rows, { w: 12, h: 12 });
    checkRows("ember", emberFlame, { w: 12, h: 12 });
    checkRows("bolt", bolt, { w: 10, h: 14 });
    checkRows("pan tray", panTray, { w: 12, h: 12 });
    for (const s of panScraps) {
      checkRows("pan scraps", s.rows);
      expect(s.x + (s.rows[0]?.length ?? 0)).toBeLessThanOrEqual(12);
      expect(s.y + s.rows.length).toBeLessThanOrEqual(7);
    }
    checkRows("rivet", rivet, { w: 8, h: 8 });
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

  test("every bolt glint lands on the bolt", () => {
    for (const [x, y] of boltGlints) expect({ x, y, px: bolt[y]?.[x] }).not.toEqual({ x, y, px: empty });
  });

  test("every monkey and item fill leaves a blank border on all four sides, so its outline is whole", () => {
    for (const rows of [...monkeyFills(), ...gear, ...emberFills(), bolt]) {
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

  test("the monkey dies spinning the standing frame a quarter turn at a time, then lies on its back under each puff of smoke", () => {
    for (const puff of monkeySmoke) checkRows("smoke", puff, { w: 16, h: 8 });
    const frames = monkeyDeathFrames();
    expect(frames.length).toBe(6);
    for (const rows of frames) checkRows("death", rows, { w: 16, h: 24 });
    // Upright, it stands where it did: the standing frame under 8 blank rows.
    expect<Rows | undefined>(frames[0]?.slice(8)).toEqual(monkeyFrames()[0]);
    // Every frame stands on the frame's foot.
    for (const rows of frames) expect(rows[23]).not.toBe(".".repeat(16));
    // The two down frames are the same monkey, under different smoke.
    expect(frames[4]?.slice(10)).toEqual(frames[5]?.slice(10));
    expect(frames[4]).not.toEqual(frames[5]);
  });

  test("the gear's frames are its two turns, outlined", () => {
    const frames = gearFrames();
    expect(frames).toEqual(gear.map((rows) => outline(rows)));
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
    const { x, y } = girderFloor.door ?? { x: 0, y: 0 };
    doorFrame().forEach((row, dy) => {
      for (let dx = 0; dx < row.length; dx++) {
        if (row[dx] !== empty) expect(rows[y - 24 + dy]?.[x + dx]).toBe(row[dx]);
      }
    });
  });

  test("the rivet floor leaves each rivet slot open in its girder, showing the wall", () => {
    const rows = rivetFloorRows();
    checkRows("rivet floor", rows, { w: 224, h: 256 });
    expect(rows[208]?.slice(40, 64)).toBe(`oooooooo${wallPanel[208 % 32]?.slice(16, 24) ?? ""}oooooooo`);
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

  test("the spring is two 12×12 fills, stretched then squashed, outlined in its sheet", () => {
    expect(spring.length).toBe(2);
    for (const rows of spring) checkRows("spring", rows, { w: 12, h: 12 });
    const frames = springFrames();
    expect(frames).toEqual(spring.map((rows) => outline(rows)));
  });

  test("a lift platform is two girder tiles in the ladder's steel greys", () => {
    const lift = liftFrame();
    checkRows("lift", lift, { w: 16, h: 8 });
    expect(lift.join("")).not.toMatch(/[orp]/u);
    expect(lift[0]).toBe("w".repeat(16));
  });

  test("the elevator floor is 224×256, each shaft a winch over two cables, with no girder inside the shaft", () => {
    const rows = elevatorFloorRows();
    checkRows("elevator floor", rows, { w: 224, h: 256 });
    for (const shaft of elevatorFloor.lifts ?? []) {
      expect(rows.slice(shaft.top - 8, shaft.top - 1).map((r) => r.slice(shaft.x, shaft.x + 16))).toEqual(
        liftFrame().slice(0, 7),
      );
      for (let y = shaft.top; y < 256; y += 16) {
        const row = rows[y]?.slice(shaft.x, shaft.x + 16) ?? "";
        expect([row[3], row[12]]).toEqual(["m", "m"]);
        expect(row).not.toContain("o");
      }
    }
  });

  test("the Gnome's frames are mirrored to 32 wide, idle, throw, then reach", () => {
    const frames = gnomeFrames();
    expect(frames).toHaveLength(3);
    for (const rows of frames) {
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
