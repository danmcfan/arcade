import { describe, expect, test } from "bun:test";
import { tickerGlyphs, tickerRect, tickerTextY } from "../ui/tickerArt.ts";
import { maxShown, tickerLetters, tickerTextWidth, tickerTitles, type TickerView } from "./ticker.ts";

const text = (v: TickerView, ink?: string): string =>
  tickerLetters(v)
    .filter((g) => ink === undefined || g.ink === ink)
    .map((g) => g.ch)
    .join("");

/** Every letter's box sits on the board, clear of its 1 px frame, and no two overlap. */
function onBoard(v: TickerView): void {
  const letters = tickerLetters(v).map(({ ch, x, y }) => ({ ch, x, y, w: (tickerGlyphs[ch]?.[0] ?? "").length }));
  for (const g of letters) {
    expect(g.x).toBeGreaterThan(tickerRect.x);
    expect(g.x + g.w).toBeLessThan(tickerRect.x + tickerRect.w - 1);
    expect(g.y).toBe(tickerTextY);
    expect(g.y + 5).toBeLessThan(tickerRect.y + tickerRect.h - 1);
  }
  const sorted = letters.toSorted((a, b) => a.x - b.x);
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1];
    const b = sorted[i];
    if (a && b) expect(b.x).toBeGreaterThan(a.x + a.w - 1);
  }
}

describe("LED scoreboard", () => {
  test("reads TOKENS and the count, TICKETS and the count", () => {
    const v = { tokens: 3, tickets: 1250, title: null };
    expect(text(v, "orange")).toBe("TOKENSTICKETS");
    expect(text(v, "yellow")).toBe("31250");
    onBoard(v);
  });

  test("at 0 tokens the count reads FREE PLAY", () => {
    const v = { tokens: 0, tickets: 0, title: null };
    expect(text(v, "orange")).toBe("TOKENSFREEPLAYTICKETS");
    expect(text(v, "yellow")).toBe("0");
    onBoard(v);
  });

  test("the widest counts still fit beside their labels; more than 999999 reads 999999", () => {
    for (const v of [
      { tokens: 0, tickets: maxShown, title: null },
      { tokens: 9999, tickets: 123_456_789, title: null },
    ]) {
      onBoard(v);
      expect(text(v, "yellow").endsWith("999999")).toBe(true);
    }
  });

  test("the ticket count is right-aligned, 4 px in from the board's right edge", () => {
    for (const tickets of [7, 1250, 99_999]) {
      const letters = tickerLetters({ tokens: 1, tickets, title: null });
      const last = letters.at(-1);
      expect((last?.x ?? 0) + 3).toBe(tickerRect.x + tickerRect.w - 4);
    }
  });

  test("facing a cabinet, it shows the cabinet's name in its colour and PRESS SPACE TO PLAY", () => {
    for (const title of ["brassMonkey", "sweet", "firefly"] as const) {
      const t = tickerTitles[title];
      const v = { tokens: 3, tickets: 1250, title };
      expect(text(v, t.ink)).toBe(t.text.replaceAll(" ", ""));
      expect(text(v, "white")).toBe("PRESSSPACETOPLAY");
      onBoard(v);
    }
  });

  test("spaces are 2 px and letters 1 px apart", () => {
    expect(tickerTextWidth("A")).toBe(3);
    expect(tickerTextWidth("AA")).toBe(7);
    expect(tickerTextWidth("A A")).toBe(10);
    expect(tickerTextWidth("M")).toBe(5);
  });
});
