import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { cabinetPath, cabinets, colours, renderCabinet, sourceCabinet } from "./gen-cabinets.ts";

const hexAt = (png: PNG, i: number) =>
  [0, 1, 2].map((j) => png.data[i + j]!.toString(16).padStart(2, "0")).join("");

describe("cabinet sources (art/cabinets.json)", () => {
  test("each palette maps every colour of the Sweet Sam cabinet", () => {
    const source = colours(sourceCabinet());
    expect(source.sort()).toEqual(["1a1c2c", "5d275d", "b13e53", "ef7d57", "ffcd75"]);
    for (const c of cabinets) expect({ name: c.name, keys: Object.keys(c.palette).sort() }).toEqual({ name: c.name, keys: source });
  });
});

describe("generated cabinets", () => {
  for (const c of cabinets) {
    test(`${c.name}: same size and alpha mask, only palette colours`, () => {
      const src = sourceCabinet();
      const out = renderCabinet(c);
      expect([out.width, out.height]).toEqual([1680, 428]);
      for (let i = 3; i < src.data.length; i += 4) {
        if (src.data[i] !== out.data[i]) throw new Error(`${c.name}: alpha differs at byte ${i}`);
      }
      expect(colours(out).sort()).toEqual([...new Set(Object.values(c.palette))].sort());
    });

    test(`${c.name}: the screen and joystick keep the Sweet Sam shape`, () => {
      const src = sourceCabinet();
      const out = renderCabinet(c);
      // Below the marquee every pixel is the palette image of the source pixel.
      for (let i = 54 * 1680 * 4; i < src.data.length; i += 4) {
        const want = c.palette[hexAt(src, i)];
        if (hexAt(out, i) !== want) throw new Error(`${c.name}: pixel ${i / 4} is ${hexAt(out, i)}, want ${want}`);
      }
    });

    test(`${c.name}: marquee is regenerated, not the hand-drawn Sweet Sam one's`, () => {
      const out = renderCabinet(c);
      const letter = c.palette.ffcd75!;
      let lit = 0;
      for (let i = 0; i < 54 * 1680 * 4; i += 4) if (hexAt(out, i) === letter) lit++;
      expect(lit).toBeGreaterThan(0);
      expect(lit).not.toBe(colourCount(sourceCabinet(), "ffcd75", 54));
    });

    test(`${c.name}: committed PNG matches (run \`bun run art\` after editing the sources)`, () => {
      const onDisk = PNG.sync.read(readFileSync(cabinetPath(c)));
      const fresh = renderCabinet(c);
      expect([onDisk.width, onDisk.height]).toEqual([fresh.width, fresh.height]);
      expect(Buffer.compare(onDisk.data, fresh.data)).toBe(0);
    });
  }
});

function colourCount(png: PNG, hex: string, rows: number): number {
  let n = 0;
  for (let i = 0; i < rows * png.width * 4; i += 4) if (hexAt(png, i) === hex) n++;
  return n;
}
