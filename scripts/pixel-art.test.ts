import { describe, expect, test } from "bun:test";
import { sweetie, sweetie16 } from "../src/ui/sweetie16.ts";
import { checkRows, colours, flipX, flipY, mirrorX, mirrorY, outline, overlay, recolour, scale, toPng, toRows } from "./pixel-art.ts";

describe("sweetie", () => {
  test("gives each of the 16 colours exactly one letter", () => {
    expect(Object.values(sweetie).sort()).toEqual([...sweetie16].sort());
  });
});

describe("PNGs and rows", () => {
  const rows = ["k.r", "yyy"];

  test("toRows reads back what toPng draws", () => {
    expect(toRows(toPng(rows))).toEqual(rows);
  });

  test("toRows reads an area", () => {
    expect(toRows(toPng(rows), sweetie, 1, 0, 2, 2)).toEqual([".r", "yy"]);
  });

  test("toRows names a colour that is not in the palette, and where it is", () => {
    const png = toPng(rows, { ...sweetie, y: "#123456" });
    expect(() => toRows(png)).toThrow("pixel (0, 1) is #123456, not in the palette");
  });

  test("scale makes each pixel k × k", () => {
    const big = scale(toPng(rows), 2);
    expect([big.width, big.height]).toEqual([6, 4]);
    expect(toRows(big)).toEqual(["kk..rr", "kk..rr", "yyyyyy", "yyyyyy"]);
  });

  test("colours counts each colour and transparent", () => {
    expect(colours(toPng(rows))).toEqual(new Map([[sweetie.k, 1], ["transparent", 1], [sweetie.r, 1], [sweetie.y, 3]]));
  });
});

describe("checkRows", () => {
  test("passes rows of one width in palette letters", () => {
    expect(() => checkRows("ok", ["k.", ".k"], { w: 2, h: 2 })).not.toThrow();
  });

  test("names the row that is the wrong width", () => {
    expect(() => checkRows("cat", ["kk", "kkk"])).toThrow('cat row 1 is 3 wide, want 2: "kkk"');
  });

  test("names the row and column of a letter that is not in the palette", () => {
    expect(() => checkRows("cat", ["kk", "kZ"])).toThrow('cat row 1 column 1 is "Z", not a palette letter: "kZ"');
  });

  test("checks the height when given", () => {
    expect(() => checkRows("cat", ["kk"], { h: 2 })).toThrow("cat has 1 rows, want 2");
  });
});

describe("derived rows", () => {
  test("outline rings the drawn pixels along their edges, not their corners", () => {
    expect(outline([".....", "..r..", ".....", "....."])).toEqual(["..k..", ".krk.", "..k..", "....."]);
  });

  test("outline takes another letter", () => {
    expect(outline(["...", ".y.", "..."], "o")).toEqual([".o.", "oyo", ".o."]);
  });

  test("mirrorX and mirrorY double a drawn half", () => {
    expect(mirrorX(["ab", "c."])).toEqual(["abba", "c..c"]);
    expect(mirrorY(["ab", "c."])).toEqual(["ab", "c.", "c.", "ab"]);
  });

  test("flipX and flipY turn a sprite round", () => {
    expect(flipX(["ab", "c."])).toEqual(["ba", ".c"]);
    expect(flipY(["ab", "c."])).toEqual(["c.", "ab"]);
  });

  test("recolour swaps only the letters in the map", () => {
    expect(recolour(["rrk", ".ro"], { r: "b", o: "y" })).toEqual(["bbk", ".by"]);
  });

  test("overlay draws a part on top, its blanks leave what is there", () => {
    expect(overlay(["kkkk", "kkkk", "kkkk"], ["w.", "ww"], 1, 1)).toEqual(["kkkk", "kwkk", "kwwk"]);
  });

  test("overlay throws when the part reaches outside", () => {
    expect(() => overlay(["kk", "kk"], ["ww"], 1, 0)).toThrow("a 2x1 part at (1, 0) reaches outside 2x2 rows");
  });
});
