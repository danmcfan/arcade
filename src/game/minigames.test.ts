import { describe, expect, test } from "bun:test";
import { basename } from "node:path";
import { cabinets } from "../../scripts/gen-cabinets.ts";
import { tickerLetters, tickerTextWidth } from "../arcade/ticker.ts";
import { cabinetHeight, cabinetWidth } from "../ui/cabinet.ts";
import { tickerLeft, tickerRight } from "../ui/tickerArt.ts";
import { createSoftware, minigame, minigames, minigameTitled } from "./minigames.ts";
import { isFixedViewport } from "./software.ts";

describe("minigames", () => {
  test("one entry per minigame, each with its own name and title", () => {
    expect(minigames.map((m) => m.name).toSorted()).toEqual(["brassMonkey", "firefly", "sweetSam"]);
    expect(new Set(minigames.map((m) => m.title)).size).toBe(minigames.length);
    for (const m of minigames) {
      expect(minigame(m.name)).toBe(m);
      expect(minigameTitled(m.title)).toBe(m);
    }
  });

  for (const m of minigames) {
    test(`${m.name}: its cabinet strip is its art/cabinets.json outline, the cabinet's size`, () => {
      const source = cabinets.find((c) => c.name === m.name);
      expect(source).toBeDefined();
      expect(basename(m.cabinetStrip.asset.url)).toBe(source?.file ?? "");
      expect([m.cabinetStrip.w, m.cabinetStrip.h]).toEqual([cabinetWidth, cabinetHeight]);
    });

    test(`${m.name}: its title card fits the scoreboard beside PRESS SPACE TO PLAY`, () => {
      expect(m.titleCard.text.length).toBeGreaterThan(0);
      const letters = tickerLetters({ tokens: 0, tickets: 0, faced: m.title });
      expect(letters.some((l) => l.ink === m.titleCard.ink)).toBe(true);
      expect(tickerLeft + tickerTextWidth(`${m.titleCard.text}  PRESS SPACE TO PLAY`)).toBeLessThanOrEqual(tickerRight);
    });

    test(`${m.name}: builds its own software, sized to its cabinet, with controls`, () => {
      const sw = createSoftware(m.name, 0);
      expect(sw.name).toBe(m.name);
      expect(isFixedViewport(sw) && sw.fixedViewportSize()).toEqual([cabinetWidth, cabinetHeight]);
      expect(m.controls.length).toBeGreaterThan(0);
    });
  }

  test("the cabinets stand apart in the hub", () => {
    const xs = minigames.map((m) => m.hubRect.x).toSorted((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect((xs[i] ?? 0) - (xs[i - 1] ?? 0)).toBeGreaterThanOrEqual(16);
  });
});
