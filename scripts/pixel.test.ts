import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { prizeArt } from "../src/ui/prizeArt.ts";
import { repoRoot } from "../test/parity/fixtures.ts";
import { toPng, toRows } from "./pixel-art.ts";
import { cabinetArt } from "../src/ui/hubArt.ts";
import { down, up } from "../src/ui/playerArt.ts";
import { autoScale, load, place, previewOptions, sheet, type Panel } from "./pixel.ts";

/** The error `promise` rejects with; fails the test when it resolves or rejects with a non-Error. */
async function rejection(promise: Promise<unknown>): Promise<Error> {
  try {
    await promise;
  } catch (e: unknown) {
    if (e instanceof Error) return e;
    throw new Error(`rejected with a non-Error: ${String(e)}`, { cause: e });
  }
  throw new Error("expected a rejection, but it resolved");
}

/** The only panel `load` returns for `spec`; throws unless there is exactly one. */
async function onlyPanel(spec: string, rev?: string): Promise<Panel> {
  const panels = await load(spec, rev);
  const [panel] = panels;
  if (panels.length !== 1 || panel === undefined) throw new Error(`${spec} loaded ${panels.length} panels, want 1`);
  return panel;
}

const prizeSource = join(repoRoot, "src/ui/prizeArt.ts");
const icons = join(repoRoot, "src/assets/images/icons.png");

describe("load", () => {
  test("a record of rows is one image per entry, labelled with its key", async () => {
    const panels = await load(`${prizeSource}:prizeArt`);
    expect(panels.map((p) => p.label)).toEqual(Object.keys(prizeArt).map((k) => `prizeArt ${k}`));
    const [first] = panels;
    if (first === undefined) throw new Error("no panels");
    expect(toRows(first.png)).toEqual([...prizeArt.honeyJar]);
  });

  test("name.key picks one entry", async () => {
    const panel = await onlyPanel(`${prizeSource}:prizeArt.runningShoes`);
    expect(toRows(panel.png)).toEqual([...prizeArt.runningShoes]);
  });

  test("name.key names a missing key", async () => {
    expect((await rejection(load(`${prizeSource}:prizeArt.nope`))).message).toContain('prizeArt has no entry "nope"');
  });

  test("glyph rows (# and .) draw in white", async () => {
    const panel = await onlyPanel(`${join(repoRoot, "src/ui/glyphs.ts")}:glyphs.A`);
    expect(toRows(panel.png)[0]).toBe(".wwww.");
  });

  test("with a rev, an art source is read as committed there", async () => {
    const panel = await onlyPanel(`${prizeSource}:prizeArt.honeyJar`, "HEAD");
    expect(toRows(panel.png)).toEqual([...prizeArt.honeyJar]);
  });

  test("an export with no rows is an error", async () => {
    expect((await rejection(load(`${prizeSource}:prizeRects`))).message).toContain(
      'exports no rows named "prizeRects"',
    );
  });

  test("path.png#x,y,w,h is one area of the PNG", async () => {
    const panel = await onlyPanel(`${icons}#0,0,9,9`);
    expect([panel.png.width, panel.png.height]).toEqual([9, 9]);
    expect(panel.label).toBe("icons.png 0,0,9,9");
  });

  test("an area outside the PNG is an error", async () => {
    expect((await rejection(load(`${icons}#20,0,9,9`))).message).toContain("is outside the 23x9 image");
  });
});

describe("sheets", () => {
  test("autoScale fits about 256 px, between 1x and 8x", () => {
    expect(autoScale(toPng(["k"]))).toBe(8);
    expect(autoScale(toPng(Array.from({ length: 128 }, () => "k".repeat(128))))).toBe(2);
    expect(autoScale(toPng(Array.from({ length: 500 }, () => "k")))).toBe(1);
  });

  test("a sheet holds every panel at its scale, with room for the labels", () => {
    const png = sheet([{ label: "a", png: toPng(["kk", "kk"]) }], 4);
    expect(png.width).toBeGreaterThanOrEqual(8 + 2 * 16);
    expect(png.height).toBeGreaterThan(8 + 2 * 16);
  });

  test("place draws over the base, and transparent pixels leave it", () => {
    const out = place(toPng(["yyy", "yyy"]), [{ png: toPng(["r.", ".r"]), x: 1, y: 0 }]);
    expect(toRows(out)).toEqual(["yry", "yyr"]);
  });
});

/** `frames` with every drawn pixel white. */
function whitened(frames: readonly (readonly string[])[]): string[][] {
  return frames.map((f) => f.map((r) => r.replaceAll(/[^.]/gu, "w")));
}

describe("previewOptions", () => {
  test("draws each option into the hub, then puts the export back", async () => {
    const current = [...cabinetArt];
    const blanked = current.map((row) => row.replaceAll(/[^S.]/gu, "k"));
    const options = await previewOptions({ "src/ui/hubArt.ts:cabinetArt": { Current: current, Blanked: blanked } });
    expect(options.map((o) => o.label)).toEqual(["Current", "Blanked"]);
    expect(options[0]?.screens).not.toEqual(options[1]?.screens);
    // The middle cabinet switches on and off: more than one screen, the dark room first.
    expect(options[0]?.screens.length).toBeGreaterThan(1);
    expect(options[0]?.timeline.at(0)).toBe(0);
    expect([...cabinetArt]).toEqual(current);
  });

  test("draws player options into the hub, walking, then puts the facing back", async () => {
    const current = down.map((frame) => frame.slice());
    const blanked = current.map((frame) => frame.map((row) => row.replaceAll(/[^.]/gu, "w")));
    const options = await previewOptions({ "src/ui/playerArt.ts:down": { Current: current, Blanked: blanked } });
    expect(options[0]?.screens).not.toEqual(options[1]?.screens);
    // The walk cycle changes the screen while the cabinet stays dark.
    expect(new Set(options[0]?.timeline.slice(0, 40)).size).toBeGreaterThan(1);
    expect(down.map((frame) => frame.slice())).toEqual(current);
  });

  test("one option per label, swapping every export that has it", async () => {
    const options = await previewOptions({
      "src/ui/playerArt.ts:down": { Current: down.map((f) => f.slice()), Blanked: whitened(down) },
      "src/ui/playerArt.ts:up": { Current: up.map((f) => f.slice()), Blanked: whitened(up) },
    });
    expect(options.map((o) => o.label)).toEqual(["Current", "Blanked"]);
    expect(options[1]?.frames).toHaveLength(6);
  });

  test("draws prize decorations on the hub wall, where each one hangs", async () => {
    const [plain, inked] = await previewOptions({
      "src/ui/prizeArt.ts:prizeArt.honeyJar": { Blank: ["."], Inked: ["k"] },
    });
    expect(plain?.screens[0]).toBeDefined();
    expect(inked?.screens[0]).not.toEqual(plain?.screens[0]);
  });

  test("names the scenes file when no scene shows the art", async () => {
    const e = await rejection(previewOptions({ "src/ui/icons.ts:icons": { A: ["k"] } }));
    expect(e.message).toContain("scripts/pixel-scenes.ts");
  });
});
