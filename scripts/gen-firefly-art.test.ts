import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import {
  backgroundHeight,
  backgroundWidth,
  fireflyArt,
  fireflyPalette,
  grassTile,
  hitQuarters,
  mothArt,
  owlArt,
  rotationColumns,
  rotationRows,
  rotationStep,
  sparkArt,
  starArt,
  stars,
  waspArt,
} from "../src/firefly/art.ts";
import { frameAngle } from "../src/firefly/game.ts";
import { sweetie16 } from "../src/ui/sweetie16.ts";
import { fireflyArtFiles, fireflyImagesDir, mirrorQuarter, rotate, rotationSheet, scale2x, skyColor } from "./gen-firefly-art.ts";

const letters = Object.keys(fireflyPalette).join("");
const inPalette = new RegExp(`^[.${letters}]+$`);

function size(rows: readonly string[]): [number, number] {
  return [rows[0]!.length, rows.length];
}

function expectRows(name: string, rows: readonly string[], w: number, h: number): void {
  expect({ name, size: [rows.length, rows[0]?.length] }).toEqual({ name, size: [h, w] });
  for (const row of rows) expect({ name, row, ok: inPalette.test(row) && row.length === w }).toEqual({ name, row, ok: true });
}

/** Every colour in `png` as #rrggbb, with "transparent" for alpha 0. */
function colours(png: PNG): Set<string> {
  const seen = new Set<string>();
  for (let i = 0; i < png.data.length; i += 4) {
    const a = png.data[i + 3]!;
    if (a === 0) seen.add("transparent");
    else if (a !== 255) seen.add(`alpha ${a}`);
    else seen.add(`#${[0, 1, 2].map((j) => png.data[i + j]!.toString(16).padStart(2, "0")).join("")}`);
  }
  return seen;
}

describe("Firefly art source", () => {
  test("the firefly is 16×16, the spark 8×8, in palette letters and .", () => {
    expectRows("firefly", fireflyArt, 16, 16);
    expectRows("spark", sparkArt, 8, 8);
  });

  test("the Moth and Wasp are 16×16 and the Owl is larger, 32×32", () => {
    expectRows("moth", mothArt, 16, 16);
    expectRows("wasp", waspArt, 16, 16);
    expectRows("owl", owlArt, 32, 32);
  });

  test("enemies keep inside the circle their frame turns in, so no rotation clips them", () => {
    for (const [name, rows] of [["moth", mothArt], ["wasp", waspArt], ["owl", owlArt]] as const) {
      const [w, h] = size(rows);
      rows.forEach((row, y) => {
        [...row].forEach((px, x) => {
          if (px === ".") return;
          const r = Math.hypot(x + 0.5 - w / 2, y + 0.5 - h / 2);
          expect({ name, x, y, inside: r <= w / 2 }).toEqual({ name, x, y, inside: true });
        });
      });
    }
  });

  test("the hit effect is 5 quarters of 16×16", () => {
    expect(hitQuarters.length).toBe(5);
    hitQuarters.forEach((q, i) => expectRows(`hit ${i}`, q, 16, 16));
  });

  test("stars sit in the sky and the grass tile repeats evenly across the width", () => {
    for (const [kind, rows] of Object.entries(starArt)) expectRows(kind, rows, rows[0].length, rows.length);
    for (const [x, y] of stars) {
      expect(x >= 0 && x < backgroundWidth && y >= 0 && y < backgroundHeight - grassTile.length).toBe(true);
    }
    expectRows("grass", grassTile, grassTile[0]!.length, grassTile.length);
    expect(backgroundWidth % grassTile[0]!.length).toBe(0);
  });

  test("every palette colour is Sweetie 16", () => {
    for (const css of Object.values(fireflyPalette)) expect(sweetie16 as readonly string[]).toContain(css);
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
    expect(readdirSync(fireflyImagesDir).sort()).toEqual(fireflyArtFiles.map((f) => f.file).sort());
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
      for (const c of colours(render())) expect({ file, colour: c, ok: allowed.has(c) }).toEqual({ file, colour: c, ok: true });
    });
  }

  test("the background is opaque: no cabinet shows through", () => {
    const bg = fireflyArtFiles.find((f) => f.file === "background.png")!.render();
    expect([bg.width, bg.height]).toEqual([backgroundWidth, backgroundHeight]);
    expect(colours(bg).has("transparent")).toBe(false);
  });
});
