import { describe, expect, test } from "bun:test";
import type { Sprite } from "../engine/image.ts";
import type { Surface } from "../engine/surface.ts";
import { canDraw, textHeight, textWidth } from "./text.ts";
import { drawNotice, noticeHeight, noticeLines, noticeWidth, siteAddress } from "./notice.ts";

describe("keyboard notice", () => {
  test("says the arcade needs a keyboard and gives the site address", () => {
    const text = noticeLines.map(([t]) => t).join(" ");
    expect(text).toContain("NEEDS A KEYBOARD.");
    expect(text).toContain("VISIT ON A DESKTOP COMPUTER TO PLAY.");
    expect(noticeLines.at(-1)![0]).toBe(siteAddress);
  });

  test("every line is in the pixel font and fits on the notice", () => {
    for (const [line, , y] of noticeLines) {
      expect(canDraw(line)).toBe(true);
      expect(textWidth(line)).toBeLessThanOrEqual(noticeWidth - 8);
      expect(y + textHeight).toBeLessThanOrEqual(noticeHeight - 8);
    }
  });

  test("is drawn with sprites and filled rects inside its bounds", () => {
    const sprites: [Sprite, number, number][] = [];
    const rects: [number, number, number, number][] = [];
    const screen = {
      draw: (s: Sprite, x: number, y: number) => sprites.push([s, x, y]),
      fillRect: (x: number, y: number, w: number, h: number) => rects.push([x, y, w, h]),
    } as unknown as Surface;
    drawNotice(screen);
    expect(rects).toEqual([[0, 0, noticeWidth, noticeHeight]]);
    // The logo plus one glyph per character (a space is a blank glyph).
    const glyphs = noticeLines.reduce((n, [t]) => n + t.length, 0);
    expect(sprites.length).toBe(1 + glyphs);
    for (const [s, x, y] of sprites) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + s.w).toBeLessThanOrEqual(noticeWidth);
      expect(y + s.h).toBeLessThanOrEqual(noticeHeight);
    }
  });
});
