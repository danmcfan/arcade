import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import {
  backgroundHeight,
  backgroundWidth,
  fireflyArt,
  grassTile,
  hitQuarters,
  mothArt,
  owlArt,
  owlHurtColours,
  rotationColumns,
  rotationRows,
  rotationStep,
  shotArt,
  sparkArt,
  starArt,
  stars,
  waspArt,
} from "../src/firefly/art.ts";
import { frameAngle } from "../src/firefly/entity.ts";
import { sweetie16 } from "../src/ui/sweetie16.ts";
import { checkRows, colours } from "./pixel-art.ts";
import {
  fireflyArtFiles,
  fireflyImagesDir,
  mirrorQuarter,
  rotate,
  rotationSheet,
  scale2x,
  skyColor,
} from "./gen-firefly-art.ts";

function size(rows: readonly string[]): [number, number] {
  return [rows[0]?.length ?? 0, rows.length];
}

describe("Firefly art source", () => {
  test("the firefly is 16×16, the spark 8×8, in Sweetie 16 letters and .", () => {
    checkRows("firefly", fireflyArt, { w: 16, h: 16 });
    checkRows("spark", sparkArt, { w: 8, h: 8 });
  });

  test("the Moth and Wasp are 16×16 and the Owl is larger, 32×32", () => {
    checkRows("moth", mothArt, { w: 16, h: 16 });
    checkRows("wasp", waspArt, { w: 16, h: 16 });
    checkRows("owl", owlArt, { w: 32, h: 32 });
  });

  test("enemies keep inside the circle their frame turns in, so no rotation clips them", () => {
    for (const [name, rows] of [
      ["moth", mothArt],
      ["wasp", waspArt],
      ["owl", owlArt],
    ] as const) {
      const [w, h] = size(rows);
      rows.forEach((row, y) => {
        row.split("").forEach((px, x) => {
          if (px === ".") return;
          const r = Math.hypot(x + 0.5 - w / 2, y + 0.5 - h / 2);
          expect({ name, x, y, inside: r <= w / 2 }).toEqual({ name, x, y, inside: true });
        });
      });
    }
  });

  test("the enemy shot is 4×8 and the hurt Owl only swaps letters of the Owl's own", () => {
    checkRows("shot", shotArt, { w: 4, h: 8 });
    for (const from of Object.keys(owlHurtColours)) expect(owlArt.join("")).toContain(from);
  });

  test("the hit effect is 5 quarters of 16×16", () => {
    expect(hitQuarters.length).toBe(5);
    hitQuarters.forEach((q, i) => {
      checkRows(`hit ${i}`, q, { w: 16, h: 16 });
    });
  });

  test("stars sit in the sky and the grass tile repeats evenly across the width", () => {
    for (const [kind, rows] of Object.entries(starArt)) checkRows(kind, rows);
    for (const [x, y] of stars) {
      expect(x >= 0 && x < backgroundWidth && y >= 0 && y < backgroundHeight - grassTile.length).toBe(true);
    }
    checkRows("grass", grassTile);
    expect(backgroundWidth % size(grassTile)[0]).toBe(0);
  });
});

describe("rotation frames", () => {
  const sample = ["ab..", ".c..", "....", "...d"];

  test("scale2x doubles each side and adds no colours", () => {
    const big = scale2x(mothArt);
    expect(size(big)).toEqual([32, 32]);
    expect(new Set(big.join(""))).toEqual(new Set(mothArt.join("")));
  });

  test("0° is the source; quarter turns move pixels exactly, clockwise", () => {
    expect(rotate(sample, 0)).toEqual(sample);
    expect(rotate(sample, 90)).toEqual(["...a", "..cb", "....", "d..."]);
    expect(rotate(sample, 180)).toEqual(["d...", "....", "..c.", "..ba"]);
    expect(rotate(sample, 270)).toEqual(["...d", "....", "bc..", "a..."]);
  });

  test("in-between angles keep the size and the palette", () => {
    for (const deg of [15, 30, 45, 60, 75]) {
      const turned = rotate(owlArt, deg);
      expect(size(turned)).toEqual([32, 32]);
      for (const ch of new Set(turned.join(""))) expect(owlArt.join("")).toContain(ch);
    }
  });

  test("a sheet frame is where the game looks for its heading: (row, col) = frameAngle(row × 90 + col × 15)", () => {
    for (let r = 0; r < rotationRows; r++) {
      for (let c = 0; c < rotationColumns; c++) expect(frameAngle(r * 90 + c * rotationStep)).toEqual([r, c]);
    }
    const sheet = rotationSheet(mothArt);
    expect([sheet.width, sheet.height]).toEqual([16 * rotationColumns, 16 * rotationRows]);
  });

  test("hit frames mirror their quarter into all four corners", () => {
    expect(mirrorQuarter(["ab", "c."])).toEqual(["abba", "c..c", "c..c", "abba"]);
  });

  test("the sky dithers from the top colour to the horizon colour", () => {
    expect(skyColor(0, 0)).toBe("k");
    expect(skyColor(5, backgroundHeight - 1)).toBe("n");
  });
});

describe("committed Firefly PNGs match src/firefly/art.ts (run `bun run art` after editing it)", () => {
  test("src/assets/images/firefly holds exactly the generated files", () => {
    expect(readdirSync(fireflyImagesDir).toSorted()).toEqual(fireflyArtFiles.map((f) => f.file).toSorted());
  });

  for (const { file, render } of fireflyArtFiles) {
    test(file, () => {
      const onDisk = PNG.sync.read(readFileSync(join(fireflyImagesDir, file)));
      const fresh = render();
      expect([onDisk.width, onDisk.height]).toEqual([fresh.width, fresh.height]);
      expect(Buffer.compare(onDisk.data, fresh.data)).toBe(0);
    });

    test(`${file} is only Sweetie 16 colours`, () => {
      const allowed = new Set<string>([...sweetie16, "transparent"]);
      for (const c of colours(render()).keys())
        expect({ file, colour: c, ok: allowed.has(c) }).toEqual({ file, colour: c, ok: true });
    });
  }

  test("the background is opaque: no cabinet shows through", () => {
    const background = fireflyArtFiles.find((f) => f.file === "background.png");
    if (background === undefined) throw new Error("background.png is not a generated file");
    const bg = background.render();
    expect([bg.width, bg.height]).toEqual([backgroundWidth, backgroundHeight]);
    expect(colours(bg).has("transparent")).toBe(false);
  });
});
