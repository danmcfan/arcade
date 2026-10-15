import { describe, expect, test } from "bun:test";
import {
  type Bulb,
  tickerBulbs,
  tickerFace,
  tickerGlyphs,
  tickerRect,
  tickerRight,
  tickerTextY,
} from "../ui/tickerArt.ts";
import { litBulbs, maxShown, tickerLetters, tickerTextWidth, type TickerView } from "./ticker.ts";
import { minigames } from "../game/minigames.ts";

const text = (v: TickerView, ink?: string): string =>
  tickerLetters(v)
    .filter((g) => ink === undefined || g.ink === ink)
    .map((g) => g.ch)
    .join("");

/** Every letter's box sits on the board's face, clear of its edges and the bulbs, and no two overlap. */
function onBoard(v: TickerView): void {
  const letters = tickerLetters(v).map(({ ch, x, y }) => ({ ch, x, y, w: (tickerGlyphs[ch]?.[0] ?? "").length }));
  const f = tickerFace;
  for (const g of letters) {
    expect(g.x).toBeGreaterThan(f.x);
    expect(g.x + g.w).toBeLessThan(f.x + f.w);
    expect(g.y).toBe(tickerTextY);
    expect(g.y).toBeGreaterThan(f.y);
    expect(g.y + 5).toBeLessThan(f.y + f.h);
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

  test("the ticket count is right-aligned, 8 px in from the board's right edge", () => {
    expect(tickerRight).toBe(tickerRect.x + tickerRect.w - 8);
    for (const tickets of [7, 1250, 99_999]) {
      const letters = tickerLetters({ tokens: 1, tickets, title: null });
      const last = letters.at(-1);
      expect((last?.x ?? 0) + 3).toBe(tickerRight);
    }
  });

  test("facing a cabinet, it shows the cabinet's name in its colour and PRESS SPACE TO PLAY", () => {
    for (const { title, titleCard: t } of minigames) {
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

const key = (b: Bulb): string => `${b.x},${b.y}`;
/** The lit bulbs on `tick`, as "x,y". */
const litOn = (tick: number): string[] => litBulbs(tick).map((b) => key(b));

describe("marquee bulbs", () => {
  const r = tickerRect;

  test("ring the board 1 px in from its edge, 3 px apart all the way round, the last to the first too", () => {
    expect(tickerBulbs.length).toBeGreaterThan(90);
    for (const b of tickerBulbs) {
      const onRing =
        ((b.x === r.x + 1 || b.x === r.x + r.w - 2) && b.y > r.y && b.y < r.y + r.h - 1) ||
        ((b.y === r.y + 1 || b.y === r.y + r.h - 2) && b.x > r.x && b.x < r.x + r.w - 1);
      expect(onRing).toBe(true);
    }
    tickerBulbs.forEach((b, i) => {
      const next = tickerBulbs[(i + 1) % tickerBulbs.length];
      if (next === undefined) throw new Error(`no bulb after ${i}`);
      expect(Math.abs(next.x - b.x) + Math.abs(next.y - b.y)).toBe(3);
    });
    expect(new Set(tickerBulbs.map((b) => key(b))).size).toBe(tickerBulbs.length);
  });

  test("two of every three are lit, and the dark one steps along every 8 ticks", () => {
    expect(litOn(0)).toHaveLength(tickerBulbs.filter((_, i) => i % 3 !== 0).length);
    tickerBulbs.forEach((b, i) => {
      expect(litOn(0).includes(key(b))).toBe(i % 3 !== 0);
    });
    expect(litOn(7)).toEqual(litOn(0));
    expect(litOn(8)).not.toEqual(litOn(0));
    expect(litOn(16)).not.toEqual(litOn(8));
    expect(litOn(24)).toEqual(litOn(0));
    // Over one cycle every bulb is dark once.
    for (const b of tickerBulbs) expect([0, 8, 16].filter((t) => !litOn(t).includes(key(b)))).toHaveLength(1);
  });
});
