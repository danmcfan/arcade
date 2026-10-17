import { describe, expect, test } from "bun:test";
import {
  beamDiveChance,
  beamHeight,
  beamTicks,
  beamWidth,
  breathe,
  breathePeriod,
  difficulty,
  entryWaves,
  fieldHeight,
  formation,
  formationPos,
  points,
  swayOffset,
  swayAmplitude,
  type EnemyKind,
} from "./rules.ts";

describe("formation", () => {
  const slots = formation();

  test("4 Owls on top, 2 rows of 8 Wasps, 2 rows of 10 Moths: 40 enemies", () => {
    expect(slots.length).toBe(40);
    const rows = [0, 1, 2, 3, 4].map((r) => slots.filter((s) => s.row === r).map((s) => s.kind));
    expect(rows).toEqual([
      Array.from({ length: 4 }, (): EnemyKind => "owl"),
      Array.from({ length: 8 }, (): EnemyKind => "wasp"),
      Array.from({ length: 8 }, (): EnemyKind => "wasp"),
      Array.from({ length: 10 }, (): EnemyKind => "moth"),
      Array.from({ length: 10 }, (): EnemyKind => "moth"),
    ]);
  });

  test("rows run top to bottom, each centred on the playfield; every row 16 px apart, rows 16 px apart", () => {
    for (let r = 0; r < 5; r++) {
      const row = slots.filter((s) => s.row === r);
      const ys = new Set(row.map((s) => s.y));
      expect(ys.size).toBe(1);
      const xs = row.map((s) => s.x);
      expect((Math.min(...xs) + Math.max(...xs)) / 2).toBe(112);
      xs.slice(1).forEach((x, i) => {
        expect(x - (xs[i] ?? 0)).toBe(16);
      });
    }
    const rowY = [0, 1, 2, 3, 4].map((r) => slots.find((s) => s.row === r)?.y ?? 0);
    expect(rowY.slice(1).map((y, i) => y - (rowY[i] ?? 0))).toEqual([16, 16, 16, 16]);
  });

  test("swaying keeps every slot on the playfield", () => {
    for (const s of slots) {
      expect(s.x - swayAmplitude - 8).toBeGreaterThanOrEqual(0);
      expect(s.x + swayAmplitude + 8).toBeLessThanOrEqual(224);
    }
    const offsets = Array.from({ length: 400 }, (_, t) => swayOffset(t));
    expect(Math.max(...offsets)).toBe(swayAmplitude);
    expect(Math.min(...offsets)).toBe(-swayAmplitude);
  });
});

describe("formationPos", () => {
  const slots = formation();
  const peak = breathePeriod / 2;

  test("while the formation fills, every slot sways by the same x offset", () => {
    for (const t of [0, 10, 40, 100]) {
      for (const s of slots)
        expect(formationPos(s, { phase: "sway", ticks: t, breatheFrom: 0 })).toEqual({
          x: s.x + swayOffset(t),
          y: s.y,
        });
    }
  });

  test("breathing starts and ends each pulse at the slots themselves, widest halfway", () => {
    expect(breathe(0)).toBe(1);
    expect(breathe(breathePeriod)).toBe(1);
    expect(breathe(peak)).toBeGreaterThan(1);
    for (let t = 0; t < breathePeriod; t++) expect(breathe(t)).toBeLessThanOrEqual(breathe(peak));
  });

  test("breathing keeps the centre column fixed and moves outer columns apart at the peak", () => {
    const owls = slots.filter((s) => s.row === 0);
    const [left, right] = [owls[0], owls.at(-1)];
    if (left === undefined || right === undefined) throw new Error("no owls");
    const width = (t: number): number =>
      formationPos(right, { phase: "breathe", ticks: t, breatheFrom: 0 }).x -
      formationPos(left, { phase: "breathe", ticks: t, breatheFrom: 0 }).x;
    expect(width(peak)).toBeGreaterThan(width(0));
    const centre = { kind: "moth" as const, row: 3, col: 0, x: 112, y: slots[30]?.y ?? 0 };
    for (let t = 0; t < breathePeriod; t++)
      expect(formationPos(centre, { phase: "breathe", ticks: t, breatheFrom: 0 }).x).toBe(112);
  });

  test("breathing moves the rows apart at the peak", () => {
    const top = slots[0];
    const bottom = slots.at(-1);
    if (top === undefined || bottom === undefined) throw new Error("no slots");
    const height = (t: number): number =>
      formationPos(bottom, { phase: "breathe", ticks: t, breatheFrom: 0 }).y -
      formationPos(top, { phase: "breathe", ticks: t, breatheFrom: 0 }).y;
    expect(height(peak)).toBeGreaterThan(height(0));
  });

  test("breathing keeps every slot on the playfield", () => {
    for (const s of slots) {
      const p = formationPos(s, { phase: "breathe", ticks: peak, breatheFrom: 0 });
      expect(p.x - 8).toBeGreaterThanOrEqual(0);
      expect(p.x + 8).toBeLessThanOrEqual(224);
    }
  });
});

describe("difficulty", () => {
  test("pins every knob at stages 1, 5, 6, 10 and 15", () => {
    expect([1, 5, 6, 10, 15].map((s) => difficulty(s))).toEqual([
      {
        diveInterval: 150,
        diversPerDive: 1,
        shotsPerDive: 1,
        entryShotChance: 0.08,
        entryShots: 1,
        diveSpeed: 2,
        shotDrift: 1,
      },
      {
        diveInterval: 50,
        diversPerDive: 4,
        shotsPerDive: 4,
        entryShotChance: 0.24,
        entryShots: 2,
        diveSpeed: 2,
        shotDrift: 1,
      },
      {
        diveInterval: 40,
        diversPerDive: 4,
        shotsPerDive: 4,
        entryShotChance: 0.25,
        entryShots: 2,
        diveSpeed: 2.1,
        shotDrift: 1.1,
      },
      {
        diveInterval: 40,
        diversPerDive: 4,
        shotsPerDive: 4,
        entryShotChance: 0.25,
        entryShots: 2,
        diveSpeed: 2.5,
        shotDrift: 1.5,
      },
      {
        diveInterval: 40,
        diversPerDive: 4,
        shotsPerDive: 4,
        entryShotChance: 0.25,
        entryShots: 2,
        diveSpeed: 2.5,
        shotDrift: 1.5,
      },
    ]);
  });

  test("each stage dives more often, sends more divers and drops more shots", () => {
    for (let s = 1; s < 4; s++) {
      const now = difficulty(s);
      const next = difficulty(s + 1);
      expect(next.diveInterval).toBeLessThan(now.diveInterval);
      expect(next.diversPerDive).toBeGreaterThan(now.diversPerDive);
      expect(next.shotsPerDive).toBeGreaterThan(now.shotsPerDive);
    }
  });

  test("never gets easier on later stages", () => {
    for (let s = 1; s < 30; s++) {
      const now = difficulty(s);
      const next = difficulty(s + 1);
      expect(next.diveInterval).toBeLessThanOrEqual(now.diveInterval);
      expect(next.diversPerDive).toBeGreaterThanOrEqual(now.diversPerDive);
      expect(next.entryShotChance).toBeGreaterThanOrEqual(now.entryShotChance);
      expect(next.entryShots).toBeGreaterThanOrEqual(now.entryShots);
      expect(next.shotsPerDive).toBeGreaterThanOrEqual(now.shotsPerDive);
      expect(next.diveSpeed).toBeGreaterThanOrEqual(now.diveSpeed);
      expect(next.shotDrift).toBeGreaterThanOrEqual(now.shotDrift);
    }
  });
});

describe("points", () => {
  test("a diving kill is worth more than one in formation, and the Owl is worth the most", () => {
    for (const kind of ["moth", "wasp", "owl"] as const) {
      expect(points(kind, true)).toBeGreaterThan(points(kind, false));
    }
    expect(points("owl", false)).toBeGreaterThan(points("wasp", false));
    expect(points("wasp", false)).toBeGreaterThan(points("moth", false));
    expect(points("owl", true)).toBeGreaterThan(points("wasp", true));
  });
});

describe("entryWaves", () => {
  const slots = formation();
  const kindAt = (row: number, col: number): EnemyKind | undefined =>
    slots.find((s) => s.row === row && s.col === col)?.kind;

  test("5 waves of 8 fill every slot exactly once", () => {
    expect(entryWaves.length).toBe(5);
    const seen = entryWaves.flatMap((w) => {
      expect(w.pairs.length).toBe(4);
      return w.pairs.flat().map((s) => `${s.row},${s.col}`);
    });
    expect(seen.length).toBe(40);
    expect(new Set(seen)).toEqual(new Set(slots.map((s) => `${s.row},${s.col}`)));
  });

  test("Galaga's mix: 4 Moths and 4 Wasps, 4 Owls and 4 Wasps, 8 Wasps, 8 Moths, 8 Moths", () => {
    const mix = entryWaves.map((w) => {
      const kinds = w.pairs.flat().map((s) => kindAt(s.row, s.col));
      return {
        moth: kinds.filter((k) => k === "moth").length,
        wasp: kinds.filter((k) => k === "wasp").length,
        owl: kinds.filter((k) => k === "owl").length,
      };
    });
    expect(mix).toEqual([
      { moth: 4, wasp: 4, owl: 0 },
      { moth: 0, wasp: 4, owl: 4 },
      { moth: 0, wasp: 8, owl: 0 },
      { moth: 8, wasp: 0, owl: 0 },
      { moth: 8, wasp: 0, owl: 0 },
    ]);
    expect(entryWaves.map((w) => w.curve)).toEqual(["topCentre", "lowerLeft", "lowerRight", "topRight", "topLeft"]);
  });
});

describe("points for a diving Owl", () => {
  test("400 alone, 800 after 1 escort is shot, 1600 after both (Galaga's escort-kill bonus)", () => {
    expect([0, 1, 2].map((n) => points("owl", true, n))).toEqual([400, 800, 1600]);
  });

  test("escorts shot earlier count for nothing in formation or for other kinds", () => {
    expect(points("owl", false, 2)).toBe(points("owl", false));
    expect(points("wasp", true, 2)).toBe(points("wasp", true));
  });
});

describe("tractor beam", () => {
  test("an Owl beams from the bottom third, a beam 24 px wide, for 3 seconds, on half its dives", () => {
    expect(fieldHeight - (264 - beamHeight)).toBeLessThanOrEqual(fieldHeight / 3);
    expect([beamHeight, beamWidth, beamTicks, beamDiveChance]).toEqual([72, 24, 180, 0.5]);
  });
});
