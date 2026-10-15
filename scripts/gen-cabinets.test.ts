import { describe, expect, test } from "bun:test";
import { cabinetHeight, cabinetWidth } from "../src/ui/cabinet.ts";
import { bevelColour, cabinets, colours, hexAt, outline, renderCabinet, sourceCabinet } from "./gen-cabinets.ts";

describe("cabinet sources (art/cabinets.json)", () => {
  test("each palette maps every colour of the Sweet Sam cabinet", () => {
    const source = colours(sourceCabinet()).toSorted();
    expect(source).toEqual(["1a1c2c", "5d275d", "b13e53", "ef7d57", "ffcd75"]);
    for (const c of cabinets)
      expect({ name: c.name, keys: Object.keys(c.palette).toSorted() }).toEqual({ name: c.name, keys: source });
  });

  test("every cabinet's bevel is set off from its body", () => {
    for (const c of cabinets) expect([c.bevel.light, c.bevel.dark]).not.toContain(c.palette["b13e53"]);
  });
});

describe("generated cabinet outlines", () => {
  for (const c of cabinets) {
    test(`${c.name}: the cabinet's size, opaque, only the screen, body and bevel colours`, () => {
      const out = renderCabinet(c);
      expect([out.width, out.height]).toEqual([cabinetWidth, cabinetHeight]);
      for (let i = 3; i < out.data.length; i += 4) if (out.data[i] !== 255) throw new Error(`${c.name}: byte ${i}`);
      expect(colours(out).toSorted()).toEqual(
        [c.palette["1a1c2c"] ?? "screen", c.palette["b13e53"] ?? "body", c.bevel.light, c.bevel.dark].toSorted(),
      );
    });

    test(`${c.name}: each pixel is the source's under the palette, its lip bevelled, its marquee letters gone`, () => {
      const src = sourceCabinet();
      const out = renderCabinet(c);
      for (let y = 0; y < out.height; y++) {
        for (let x = 0; x < out.width; x++) {
          const [fx, fy] = [outline.x + x, outline.y + y];
          let hex = hexAt(src, (fy * src.width + fx) * 4);
          if (hex === "ffcd75" || hex === "ef7d57") hex = "b13e53";
          const want = (hex === "b13e53" ? bevelColour(c.bevel, fx, fy) : undefined) ?? c.palette[hex];
          const got = hexAt(out, (y * out.width + x) * 4);
          if (got !== want) throw new Error(`${c.name}: (${x}, ${y}) is ${got}, want ${want}`);
        }
      }
    });
  }
});
