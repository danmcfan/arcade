import { afterEach, describe, expect, test } from "bun:test";
import { cabinetInsetLeft, cabinetInsetTop, cabinetPlayfieldHeight, cabinetPlayfieldWidth } from "../ui/cabinet.ts";
import { images } from "../engine/assets.ts";
import { makeSolid, type Sprite } from "../engine/image.ts";
import { NO_INPUT, type Input } from "../engine/input.ts";
import { defined } from "../engine/defined.testutil.ts";
import { stubSurface } from "../engine/fakeCanvas.testutil.ts";
import type { DrawOpts, PremulColor, Surface } from "../engine/surface.ts";
import { bandRows, cell, charset, glyphHeight, inkOrder, sheetColumns, type Ink } from "../ui/glyphs.ts";
import { iconRects, type IconName } from "../ui/icons.ts";
import { dimColour } from "../ui/menu.ts";
import { prizeGreyY, prizeRects } from "../ui/prizeArt.ts";
import { sweetie } from "../ui/sweetie16.ts";
import {
  tickerBulbs,
  tickerGlyphHeight,
  tickerGlyphX,
  tickerInkOrder,
  tickerRect,
  tickerRight,
  type TickerInk,
} from "../ui/tickerArt.ts";
import { prizes as catalogue, type PrizeId } from "../arcade/prizes.ts";
import { Game } from "./game.ts";
import { fakeBrassMonkeySnapshot } from "./snapshot.testutil.ts";
import type { BrassMonkeySnapshot } from "./snapshot.ts";
import type { FixedViewport, Software, SoftwareName } from "./software.ts";

// debugPrint draws glyphs on the surface; record its calls instead.
// (Not `mock.module`: Bun module mocks leak into every later test file.)
const printed: [string, number, number][] = [];
const debugPrint = (_s: Surface, text: string, x: number, y: number): void => {
  printed.push([text, x, y]);
};

type Call =
  | ["draw", string, number, number, number, number, number, number]
  | ["draw", string, number, number, number, number, number, number, number]
  | ["strokeRect", number, number, number, number, PremulColor]
  | ["fillPremul", number, number, number, number, PremulColor];

interface Glyph {
  ch: string;
  ink: Ink;
  x: number;
  y: number;
  /** Rows of the glyph drawn (7 unless cut, as on a rolling digit). */
  h: number;
}

interface Icon {
  name: IconName;
  x: number;
  y: number;
  w: number;
  h: number;
}

function isIconName(k: string): k is IconName {
  return k in iconRects;
}

/** A lit letter on the hub's LED scoreboard. */
interface Lit {
  ch: string;
  ink: TickerInk;
  x: number;
  y: number;
}

interface Recording {
  calls: Call[];
  glyphs: Glyph[];
  icons: Icon[];
  lit: Lit[];
  /** The scoreboard's letters left to right, optionally of one ink. */
  board: (ink?: TickerInk) => string;
  /** The scoreboard letters below the board (the prize counter cards' prices), in reading order. */
  cards: (ink?: TickerInk) => string;
  /** Every rect drawn or filled: [x, y, w, h]. */
  boxes: [number, number, number, number][];
  text: (ink?: Ink) => string;
  surface: Surface;
  fills: () => number;
  /** Each single pixel filled in `css`, as "x,y". */
  dots: (css: string) => string[];
  dimmed: () => [number, number, number, number] | null;
  /** Each clip rect, in order. */
  clips: [number, number, number, number][];
}

/**
 * Records the Surface calls the hub makes (only the ones it uses). Pixel-font
 * glyphs and HUD icons are decoded into `glyphs` and `icons` instead of
 * `calls`; panel and key-cap fills are counted in `fills`.
 */
function recordingSurface(): Recording {
  const calls: Call[] = [];
  const glyphs: Glyph[] = [];
  const icons: Icon[] = [];
  const lit: Lit[] = [];
  const boxes: [number, number, number, number][] = [];
  const dots: [number, number, string][] = [];
  let fills = 0;
  let dimmed: [number, number, number, number] | null = null;
  const clips: [number, number, number, number][] = [];
  const surface = stubSurface({
    clipped(x: number, y: number, w: number, h: number, draw: () => void): void {
      clips.push([x, y, w, h]);
      draw();
    },
    draw(s: Sprite, x: number, y: number, opts?: DrawOpts): void {
      boxes.push([x, y, s.w, s.h]);
      if (s.asset === images.ticker) {
        const ch = defined(Object.entries(tickerGlyphX).find(([, gx]) => gx === s.sx)?.[0]);
        lit.push({ ch, ink: defined(tickerInkOrder[s.sy / tickerGlyphHeight]), x, y });
        return;
      }
      if (s.asset === images.font) {
        const row = Math.trunc(s.sy / cell);
        const band = Math.trunc(row / bandRows);
        const i = (row % bandRows) * sheetColumns + s.sx / cell;
        glyphs.push({ ch: defined(charset[i]), ink: defined(inkOrder[band]), x, y, h: s.h });
        return;
      }
      if (s.asset === images.icons) {
        const name = defined(
          Object.keys(iconRects)
            .filter((k) => isIconName(k))
            .find((n) => iconRects[n].x === s.sx),
        );
        icons.push({ name, x, y, w: s.w, h: s.h });
        return;
      }
      const name = Object.entries(images).find(([, a]) => a === s.asset)?.[0] ?? "?";
      if (opts?.alpha === undefined) calls.push(["draw", name, s.sx, s.sy, s.w, s.h, x, y]);
      else calls.push(["draw", name, s.sx, s.sy, s.w, s.h, x, y, opts.alpha]);
    },
    fillRect(x: number, y: number, w: number, h: number, css: string): void {
      boxes.push([x, y, w, h]);
      if (w === 1 && h === 1) dots.push([x, y, css]);
      fills++;
    },
    strokeRect(x: number, y: number, w: number, h: number, c: PremulColor): void {
      calls.push(["strokeRect", x, y, w, h, c]);
    },
    fillPremul(x: number, y: number, w: number, h: number, c: PremulColor): void {
      boxes.push([x, y, w, h]);
      if (c.r === dimColour.r && c.a === dimColour.a) {
        dimmed = [x, y, w, h];
        return;
      }
      calls.push(["fillPremul", x, y, w, h, c]);
    },
  });
  /** Text drawn (whole glyphs only), in reading order, optionally of one ink. */
  const text = (ink?: Ink): string =>
    glyphs
      .filter((g) => g.h === glyphHeight && (ink === undefined || g.ink === ink))
      .toSorted((a, b) => a.y - b.y || a.x - b.x)
      .map((g) => g.ch)
      .join("");
  // The hub draws at the 16 px buffer.
  const onBoard = (g: Lit): boolean => g.y < 16 + tickerRect.y + tickerRect.h;
  const board = (ink?: TickerInk): string =>
    lit
      .filter((g) => onBoard(g) && (ink === undefined || g.ink === ink))
      .toSorted((a, b) => a.x - b.x)
      .map((g) => g.ch)
      .join("");
  const cards = (ink?: TickerInk): string =>
    lit
      .filter((g) => !onBoard(g) && (ink === undefined || g.ink === ink))
      .toSorted((a, b) => a.y - b.y || a.x - b.x)
      .map((g) => g.ch)
      .join("");
  return {
    calls,
    glyphs,
    icons,
    lit,
    board,
    cards,
    boxes,
    text,
    surface,
    fills: () => fills,
    dots: (css) => dots.filter(([, , c]) => c === css).map(([x, y]) => `${x},${y}`),
    dimmed: () => dimmed,
    clips,
  };
}

class FakeSoftware implements Software {
  margins: number[] = [];
  over = false;
  points = 0;
  readonly name: SoftwareName;

  constructor(name: SoftwareName) {
    this.name = name;
  }
  background(): Sprite {
    return makeSolid(224, 256, "#000");
  }
  update(): void {}
  draw(_screen: Surface, buffer: number): void {
    this.margins.push(buffer);
  }
  gameOver(): boolean {
    return this.over;
  }
  score(): number {
    return this.points;
  }
  snapshot(): BrassMonkeySnapshot {
    return fakeBrassMonkeySnapshot;
  }
}
class FakeFixed extends FakeSoftware implements FixedViewport {
  fixedViewportSize(): [number, number] {
    return [240, 304];
  }
}

const built: FakeSoftware[] = [];
const factory = (name: SoftwareName): Software => {
  const sw = name === "sweetSam" ? new FakeFixed(name) : new FakeSoftware(name);
  built.push(sw);
  return sw;
};

const games: { dispose(): void }[] = [];
function newGame(initial: SoftwareName | null = null, tokens = 5, prizes: PrizeId[] = []): Game {
  const restore = { highScore: 0, tokens, tickets: 0, prizes, player: { x: 80, y: 92, dir: "DOWN" as const } };
  const g = new Game(initial, { createSoftware: factory, debugPrint, restore });
  games.push(g);
  return g;
}
afterEach(() => {
  for (const g of games.splice(0)) g.dispose();
  built.length = 0;
  printed.length = 0;
});

function input(keys: Partial<Input> = {}): Input {
  return { ...NO_INPUT, ...keys };
}

const green = { r: 0, g: 255, b: 0, a: 64 };
const red = { r: 255, g: 0, b: 0, a: 64 };
const yellow = { r: 255, g: 255, b: 0, a: 64 };

/** The hub image's place on the 192x176 screen: the 160x144 Game Boy frame. */
const frame = { x: 16, y: 16, w: 160, h: 144 };
function insideFrame(boxes: readonly [number, number, number, number][]): [number, number, number, number][] {
  return boxes.filter(
    ([x, y, w, h]) => x < frame.x || y < frame.y || x + w > frame.x + frame.w || y + h > frame.y + frame.h,
  );
}

describe("hub draw", () => {
  test("the room at the 16 px buffer, the employee in the desk, then the player frame centred on its position", () => {
    const game = newGame();
    const { calls, surface } = recordingSurface();
    game.draw(surface);
    expect(calls).toEqual([
      ["draw", "arcade", 0, 0, 160, 144, 16, 16],
      // At employeeSpot (72, 116) + the buffer.
      ["draw", "employee", 0, 0, 16, 24, 88, 132],
      // Facing down = row 1; frame 0; at (80 + 16 - 8, 92 + 16 - 12).
      ["draw", "player", 0, 24, 16, 24, 88, 96],
    ]);
  });

  test("the employee stands still: the one frame on every tick", () => {
    const game = newGame();
    for (let t = 0; t < 240; t++) {
      const { calls, surface } = recordingSurface();
      game.draw(surface);
      expect(calls.find((c) => c[1] === "employee")).toEqual(["draw", "employee", 0, 0, 16, 24, 88, 132]);
      game.step(input());
    }
  });

  test("Sweet Sam's prizes hang on the wall round its cabinet (art x 72..87, y 40..63), under the player", () => {
    const game = newGame(null, 5, ["honeyJar", "runningShoes", "sleepyBees"]);
    const { calls, surface } = recordingSurface();
    game.draw(surface);
    const r = prizeRects;
    expect(calls).toEqual([
      ["draw", "arcade", 0, 0, 160, 144, 16, 16],
      ["draw", "employee", 0, 0, 16, 24, 88, 132],
      // The jar left of the picture, the shoes right of it, the picture above the cabinet; + the buffer.
      ["draw", "prizes", r.honeyJar.x, 0, 8, 9, 79, 45],
      ["draw", "prizes", r.runningShoes.x, 0, 9, 6, 105, 47],
      ["draw", "prizes", r.sleepyBees.x, 0, 12, 11, 90, 44],
      ["draw", "player", 0, 24, 16, 24, 88, 96],
    ]);
    // On the wall: above the skirting (y 53), clear of the floor.
    for (const c of calls.filter((x) => x[1] === "prizes"))
      expect(Number(c[7]) - 16 + Number(c[5])).toBeLessThanOrEqual(53);
  });

  test("each owned Firefly prize hangs on the wall by the Firefly cabinet (art x 112..127, y 40..63)", () => {
    const game = newGame(null, 5, ["lantern", "glowStick", "wings"]);
    const { calls, surface } = recordingSurface();
    game.draw(surface);
    const r = prizeRects;
    // The lantern right of the cabinet, the glow stick left of it, the wings above it; + the buffer.
    expect(calls.filter((c) => c[1] === "prizes")).toEqual([
      ["draw", "prizes", r.lantern.x, 0, 8, 11, 145, 52],
      ["draw", "prizes", r.glowStick.x, 0, 3, 10, 124, 50],
      ["draw", "prizes", r.wings.x, 0, 12, 8, 130, 47],
    ]);
  });

  test("each owned Brass Monkey prize hangs on the wall by the Brass Monkey cabinet (art x 32..47, y 40..63)", () => {
    const game = newGame(null, 5, ["oilCan", "springBoots", "pocketWatch"]);
    const { calls, surface } = recordingSurface();
    game.draw(surface);
    const r = prizeRects;
    // The oil can on a shelf left of the cabinet, the boots and the watch on pegs above it; + the buffer.
    expect(calls.filter((c) => c[1] === "prizes")).toEqual([
      ["draw", "prizes", r.oilCan.x, 0, 12, 11, 35, 57],
      ["draw", "prizes", r.springBoots.x, 0, 10, 12, 48, 43],
      ["draw", "prizes", r.pocketWatch.x, 0, 9, 11, 62, 44],
    ]);
  });

  test("only owned prizes are drawn", () => {
    const game = newGame(null, 5, ["runningShoes"]);
    const { calls, surface } = recordingSurface();
    game.draw(surface);
    expect(calls.filter((c) => c[1] === "prizes")).toEqual([
      ["draw", "prizes", prizeRects.runningShoes.x, 0, 9, 6, 105, 47],
    ]);
  });

  test("the sprite column is int(frame); the row follows the facing direction", () => {
    const game = newGame();
    for (let t = 0; t < 25; t++) game.step(input({ left: true })); // frame 2.5, x 55
    const { calls, surface } = recordingSurface();
    game.draw(surface);
    expect(calls[2]).toEqual(["draw", "player", 32, 48, 16, 24, 63, 96]);
  });

  test("while the melody plays, the scoreboard shows the cabinet's name and PRESS SPACE TO PLAY", () => {
    const game = newGame();
    for (let t = 0; t < 25; t++) game.step(input({ up: true }));
    const { board, surface } = recordingSurface();
    game.draw(surface);
    expect(board("yellow")).toBe("SWEETSAM");
    expect(board("white")).toBe("PRESSSPACETOPLAY");
    expect(board("orange")).toBe("");
  });

  test("each cabinet's name in its own colour", () => {
    const game = newGame();
    const names: string[] = [];
    for (const [dx, ink] of [
      [-40, "green"],
      [40, "cyan"],
    ] as const) {
      const g = newGame();
      for (let t = 0; t < Math.abs(dx); t++) g.step(input(dx < 0 ? { left: true } : { right: true }));
      for (let t = 0; t < 25; t++) g.step(input({ up: true }));
      const r = recordingSurface();
      g.draw(r.surface);
      names.push(r.board(ink));
    }
    game.dispose();
    expect(names).toEqual(["BRASSMONKEY", "FIREFLY"]);
  });

  test("the faced cabinet's screen switches on over the room: its row of screens.png, a frame per step", () => {
    const game = newGame();
    for (let t = 0; t < 25; t++) game.step(input({ up: true }));
    const screen = (): unknown[] | undefined => {
      const { calls, surface } = recordingSurface();
      game.draw(surface);
      return calls.find((c) => c[1] === "screens");
    };
    // Sweet Sam is the second machine; its frame starts 6 px left of the cabinet (x 72, y 40), + the buffer.
    expect(screen()).toEqual(["draw", "screens", 0, 36, 28, 36, 82, 56]);
    for (let t = 0; t < 20; t++) game.step(input());
    expect(screen()).toEqual(["draw", "screens", 7 * 28, 36, 28, 36, 82, 56]);
    game.step(input({ down: true }));
    expect(screen()?.[2]).toBe(8 * 28);
    for (let t = 0; t < 10; t++) game.step(input());
    expect(screen()).toBeUndefined();
  });

  test("debug mode adds the overlay rects and the side panel", () => {
    const game = newGame();
    game.step(input({ shiftP: true }));
    const { calls, surface } = recordingSurface();
    game.draw(surface);
    expect(calls.slice(3)).toEqual([
      ["strokeRect", 88, 96, 15, 23, green],
      ["strokeRect", 16, 16, 159, 47, red],
      ["strokeRect", 16, 64, 23, 71, red],
      ["strokeRect", 152, 64, 23, 71, red],
      ["strokeRect", 16, 136, 159, 23, red],
      ["strokeRect", 48, 56, 15, 15, yellow],
      ["strokeRect", 88, 56, 15, 15, yellow],
      ["strokeRect", 128, 56, 15, 15, yellow],
      // The prize desk: the whole U, from its top down to the bottom wall.
      ["strokeRect", 52, 123, 87, 12, yellow],
      ["fillPremul", 192, 0, 120, 176, { r: 20, g: 20, b: 20, a: 200 }],
    ]);
    expect(printed).toEqual([["Player: (80,92)", 200, 8]]);
  });

  test("the overlay offsets copies: drawing twice gives the same rects", () => {
    const game = newGame();
    game.step(input({ shiftP: true }));
    const first = recordingSurface();
    game.draw(first.surface);
    const second = recordingSurface();
    game.draw(second.surface);
    expect(second.calls).toEqual(first.calls);
  });
});

describe("software draw", () => {
  test("normal software draws with the 16 px margin and nothing else is drawn", () => {
    const game = newGame("brassMonkey");
    game.step(input());
    const { calls, surface } = recordingSurface();
    game.draw(surface);
    expect(calls).toEqual([]);
    expect(built[0]?.margins).toEqual([16]);
  });

  test("a FixedViewport draws with margin 0", () => {
    const game = newGame("sweetSam");
    game.step(input());
    game.draw(recordingSurface().surface);
    expect(built[0]?.margins).toEqual([0]);
  });

  test("debug mode inside a software draws no panel (layout still grows)", () => {
    const game = newGame("brassMonkey");
    game.step(input({ shiftP: true }));
    const { calls, surface } = recordingSurface();
    game.draw(surface);
    expect(calls).toEqual([]);
    expect(printed).toEqual([]);
    expect(game.layout()).toEqual([376, 288]);
  });
});

describe("hub scoreboard", () => {
  test("TOKENS and its count on the left, TICKETS and its count on the right, lit on the board in the room", () => {
    const game = newGame();
    const r = recordingSurface();
    game.draw(r.surface);
    expect(r.board("orange")).toBe("TOKENSTICKETS");
    expect(r.board("yellow")).toBe("50");
    // No overlay counts in the margin any more: no font glyphs or icons at all.
    expect(r.glyphs).toEqual([]);
    expect(r.icons).toEqual([]);
    const board = { x: tickerRect.x + 16, y: tickerRect.y + 16, w: tickerRect.w, h: tickerRect.h };
    for (const g of r.lit) {
      expect(g.x).toBeGreaterThan(board.x);
      expect(g.y).toBeGreaterThan(board.y);
      expect(g.y + tickerGlyphHeight).toBeLessThan(board.y + board.h);
    }
    const [tokens, tickets] = [r.lit.find((g) => g.ch === "5"), r.lit.find((g) => g.ch === "0")];
    expect(defined(tokens).x).toBeLessThan(defined(tickets).x);
  });

  test("a spent token shows at once; at 0 tokens the count reads FREE PLAY", () => {
    const game = newGame(null, 1);
    const r1 = recordingSurface();
    game.draw(r1.surface);
    expect(r1.board("yellow")).toBe("10");
    for (let t = 0; t < 31; t++) game.step(input({ up: true }));
    game.step(input({ up: true, space: true }));
    for (const keys of [{ escape: true }, {}, { down: true }, {}, { down: true }, {}, { space: true }])
      game.step(input(keys));
    game.step(input({ down: true }));
    const r0 = recordingSurface();
    game.draw(r0.surface);
    expect(r0.board("orange")).toBe("TOKENSFREEPLAYTICKETS");
    expect(r0.board("yellow")).toBe("0");
  });

  test("large ticket counts fit, right-aligned on the board; past 999999 it reads 999999", () => {
    for (const [tickets, shown] of [
      [1250, "1250"],
      [99_999, "99999"],
      [1_234_567, "999999"],
    ] as const) {
      const g = new Game(null, {
        createSoftware: factory,
        debugPrint,
        restore: { highScore: 0, tokens: 0, tickets, prizes: [], player: { x: 80, y: 92, dir: "DOWN" } },
      });
      games.push(g);
      const r = recordingSurface();
      g.draw(r.surface);
      expect(r.board("yellow")).toBe(shown);
      const right = Math.max(...r.lit.map((l) => l.x + 3));
      expect(right).toBe(tickerRight + 16);
      const label = Math.max(...r.lit.filter((l) => l.ink === "orange").map((l) => l.x + 3));
      const count = Math.min(...r.lit.filter((l) => l.ink === "yellow").map((l) => l.x));
      expect(count).toBeGreaterThan(label);
    }
  });

  test("the marquee's bulbs chase round the board: two of every three lit, stepping every 8 ticks", () => {
    const game = newGame();
    const lit = (): string[] => {
      const r = recordingSurface();
      game.draw(r.surface);
      return r.dots(sweetie.y);
    };
    const bulbs = new Set(tickerBulbs.map((b) => `${b.x + 16},${b.y + 16}`));
    const first = lit();
    expect(first.length).toBeGreaterThanOrEqual(Math.floor((tickerBulbs.length * 2) / 3));
    expect(first.length).toBeLessThanOrEqual(Math.ceil((tickerBulbs.length * 2) / 3));
    for (const b of first) expect(bulbs.has(b)).toBe(true);
    const steps = (n: number): void => {
      for (let t = 0; t < n; t++) game.step(input());
    };
    steps(8);
    expect(lit()).not.toEqual(first);
    steps(16);
    expect(lit()).toEqual(first);
  });

  test("the hub pause dims only the hub image, so the counts stay readable (title scene)", () => {
    const game = newGame();
    const r = recordingSurface();
    game.draw(r.surface);
    expect(r.dimmed()).toBeNull();
  });
});

describe("the Game Boy frame", () => {
  test("nothing in the hub draws outside the 160x144 hub image: room, desk, prizes, scoreboard, player, menu", () => {
    const owned: PrizeId[] = [
      "honeyJar",
      "runningShoes",
      "sleepyBees",
      "lantern",
      "glowStick",
      "wings",
      "oilCan",
      "springBoots",
      "pocketWatch",
    ];
    const game = newGame(null, 0, owned);
    const outside: unknown[] = [];
    const check = (): void => {
      const r = recordingSurface();
      game.draw(r.surface);
      outside.push(...insideFrame(r.boxes));
    };
    check();
    // Walk the room's edges, face each cabinet, then open the prize counter menu and scroll it.
    for (const keys of [{ left: true }, { up: true }, { right: true }, { down: true }, { left: true }] as const) {
      for (let t = 0; t < 120; t++) {
        game.step(input(keys));
        if (t % 10 === 0) check();
      }
    }
    for (let t = 0; t < 60; t++) game.step(input({ right: true }));
    for (let t = 0; t < 60; t++) game.step(input({ down: true }));
    game.step(input({ space: true }));
    game.step(input());
    expect(game.snapshot().menu).toBe("prizeCounter");
    for (let i = 0; i < 12; i++) {
      check();
      game.step(input({ down: true }));
      game.step(input());
    }
    expect(outside).toEqual([]);
  });
});

/** The cabinet's screen in its 336x428 layout: `[x, y, w, h]`. */
const cabinetScreen: [number, number, number, number] = [
  cabinetInsetLeft,
  cabinetInsetTop,
  cabinetPlayfieldWidth,
  cabinetPlayfieldHeight,
];

function atCabinet(tokens = 5): Game {
  const game = newGame(null, tokens);
  for (let t = 0; t < 31; t++) game.step(input({ up: true }));
  game.step(input({ up: true, space: true }));
  return game;
}
function tapKeys(game: Game, ...keys: (keyof Input)[]): void {
  for (const k of keys) {
    game.step(input({ [k]: true }));
    game.step(input());
  }
}

describe("menus over a minigame", () => {
  test("the minigame pause menu draws over the dimmed minigame: Resume, Controls, Quit game (no tickets)", () => {
    const game = atCabinet();
    tapKeys(game, "escape");
    const r = recordingSurface();
    game.draw(r.surface);
    expect(built[0]?.margins).toEqual([0]);
    expect(r.dimmed()).toEqual(cabinetScreen);
    expect(r.text("yellow")).toBe("PAUSED>RESUME<");
    expect(r.text("white")).toBe("CONTROLSQUIT GAME");
    expect(r.text("orange")).toBe("NO TICKETS");
    const quit = defined(r.glyphs.find((g) => g.ch === "Q"));
    const note = defined(r.glyphs.find((g) => g.ink === "orange"));
    expect(note.y).toBe(quit.y);
    expect(note.x).toBeGreaterThan(quit.x);
    // Centred on the cabinet's screen.
    const paused = r.glyphs.filter((g) => g.ink === "yellow" && g.y === Math.min(...r.glyphs.map((x) => x.y)));
    const mid = (defined(paused[0]).x + defined(paused.at(-1)).x + 6) / 2;
    expect(Math.abs(mid - 120)).toBeLessThan(4);
  });

  test("over a cabinet, every menu fits inside the 224x288 screen and is clipped to it", () => {
    const [sx, sy, sWidth, sHeight] = cabinetScreen;
    const inside = ([x, y, w, h]: [number, number, number, number]): boolean =>
      x >= sx && y >= sy && x + w <= sx + sWidth && y + h <= sy + sHeight;
    const shown: Array<[string, Game]> = [];
    const paused = atCabinet();
    tapKeys(paused, "escape");
    shown.push(["paused", paused]);
    const controls = atCabinet();
    tapKeys(controls, "escape", "down", "space");
    shown.push(["controls", controls]);
    const payout = atCabinet();
    const sw = defined(built.at(-1));
    sw.points = 1420;
    sw.over = true;
    payout.step(input());
    shown.push(["payout", payout]);
    for (const [menu, game] of shown) {
      const r = recordingSurface();
      game.draw(r.surface);
      expect([menu, r.clips]).toEqual([menu, [cabinetScreen]]);
      expect([menu, r.boxes.filter((b) => !inside(b))]).toEqual([menu, []]);
    }
  });

  test("a minigame with a margin dims only its playfield", () => {
    const game = newGame(null);
    for (let t = 0; t < 31; t++) game.step(input({ up: true }));
    for (let t = 0; t < 40; t++) game.step(input({ left: true }));
    game.step(input({ up: true, space: true }));
    expect(game.snapshot()).toMatchObject({ software: "brassMonkey" });
    tapKeys(game, "escape");
    const r = recordingSurface();
    game.draw(r.surface);
    expect(r.dimmed()).toEqual([16, 16, 224, 256]);
  });

  test("Controls lists the minigame's three controls", () => {
    const game = atCabinet();
    tapKeys(game, "escape", "down", "space");
    const r = recordingSurface();
    game.draw(r.surface);
    const all = r.text();
    expect(all).toContain("CONTROLS");
    for (const label of ["MOVE", "ACTION", "PAUSE", "BACK", "SPACE", "ESC", "WASD"]) expect(all).toContain(label);
  });

  test("the payout shows the score and tickets on rolling digits, then the totals", () => {
    const game = atCabinet();
    const sw = defined(built[0]);
    sw.points = 1420;
    sw.over = true;
    game.step(input());
    let r = recordingSurface();
    game.draw(r.surface);
    expect(r.text("yellow")).toBe("PAYOUT0");
    expect(r.text("white")).toBe("SCORE1420TICKETSSPACESKIP");

    // Mid-spin, digits are cut: the old one leaving, the new one arriving.
    for (let t = 0; t < 25; t++) game.step(input());
    r = recordingSurface();
    game.draw(r.surface);
    expect(r.glyphs.some((g) => g.h < glyphHeight)).toBe(true);

    for (let t = 0; t < 14 * 20 + 40; t++) game.step(input());
    r = recordingSurface();
    game.draw(r.surface);
    expect(r.text("yellow")).toBe("PAYOUT14");
    expect(r.text("white")).toBe("SCORE0TICKETSSPACEOK");
  });

  test("after free play the payout reads FREE PLAY: 0 TICKETS", () => {
    const game = atCabinet(0);
    const sw = defined(built[0]);
    sw.points = 1420;
    sw.over = true;
    game.step(input());
    const r = recordingSurface();
    game.draw(r.surface);
    expect(r.text("orange")).toBe("FREE PLAY: 0 TICKETS");
    expect(r.text("white")).toBe("SCORE1420SPACEOK");
  });
});

function atCounter(tokens: number, tickets: number, prizes: PrizeId[] = []): Game {
  const g = new Game(null, {
    createSoftware: factory,
    debugPrint,
    restore: { highScore: 0, tokens, tickets, prizes, player: { x: 80, y: 92, dir: "DOWN" } },
  });
  games.push(g);
  for (let t = 0; t < 3; t++) g.step(input({ down: true }));
  g.step(input({ space: true }));
  g.step(input());
  return g;
}

const prizeIds = catalogue.map((p) => p.id);

/** The prize pictures drawn, in reading order, each with its alpha (1 when drawn plain). */
function shelfPictures(r: Recording): [PrizeId, boolean][] {
  return r.calls
    .filter((c) => c[0] === "draw" && c[1] === "prizes")
    .toSorted((a, b) => bottom(a) - bottom(b) || Number(a[6]) - Number(b[6]))
    .map((c) => [defined(prizeIds.find((id) => prizeRects[id].x === c[2])), c[3] === prizeGreyY]);
}

/** A drawn picture's bottom edge: the shelf lines up each row's pictures along it. */
function bottom(c: Call): number {
  return Number(c[7]) + Number(c[5]);
}

describe("prize counter menu", () => {
  test("fills the room under the scoreboard: the room dims there, the board stays lit", () => {
    const r = recordingSurface();
    atCounter(2, 120).draw(r.surface);
    const below = tickerRect.y + tickerRect.h;
    expect(r.dimmed()).toEqual([16, 16 + below, 160, 144 - below]);
    expect(r.board("yellow")).toBe("2120");
    expect(insideFrame(r.boxes)).toEqual([]);
  });

  test("a shelf of nine prize pictures, a column per cabinet in hub order, each with its price", () => {
    const r = recordingSurface();
    atCounter(2, 120).draw(r.surface);
    expect(shelfPictures(r)).toEqual([
      ["pocketWatch", false],
      ["sleepyBees", false],
      ["wings", false],
      ["springBoots", false],
      ["runningShoes", false],
      ["glowStick", false],
      ["oilCan", false],
      ["honeyJar", false],
      ["lantern", false],
    ]);
    // No title, ticket count or key hints (the scoreboard shows the counts): the prices row by row, in the
    // scoreboard's small letters, then the selected BUY TOKEN.
    expect(r.cards("yellow")).toBe("100100100505050252525");
    expect(r.text("yellow")).toBe(">BUY TOKEN");
    expect(r.text("red")).toBe("");
    expect(r.icons).toEqual([]);
  });

  test("the info panel describes what the cursor is on, and changes as it moves", () => {
    const game = atCounter(2, 120);
    let r = recordingSurface();
    game.draw(r.surface);
    expect(r.text("white")).toBe("CLOSEBUY TOKEN5ONE PLAY ON A CABINET");
    for (const key of ["up", "right"] as const) {
      game.step(input({ [key]: true }));
      game.step(input());
    }
    r = recordingSurface();
    game.draw(r.surface);
    expect(r.text("white")).toBe("BUY TOKENCLOSEHONEY JAR25+1 LIFE IN SWEET SAM");
  });

  test("an owned prize is greyed out and reads OWNED; on a grey card; one the player can't afford is on a red card, its price white", () => {
    const r = recordingSurface();
    atCounter(1, 60, ["honeyJar"]).draw(r.surface);
    const pictures = shelfPictures(r);
    expect(pictures.filter(([, grey]) => grey).map(([id]) => id)).toEqual(["honeyJar"]);
    expect(r.cards("white")).toBe("100100100");
    expect(r.cards("pale")).toBe("OWNED");
  });

  test("a bought token shows on the scoreboard at once", () => {
    const game = atCounter(2, 12);
    game.step(input({ space: true }));
    const r = recordingSurface();
    game.draw(r.surface);
    expect(r.board("yellow")).toBe("37");
  });

  test("with 0 tokens and too few tickets the token item is the last-chance token", () => {
    const game = atCounter(0, 3);
    const r = recordingSurface();
    game.draw(r.surface);
    expect(r.text("yellow")).toContain(">LAST CHANCE");
  });

  test("with tokens left and too few tickets BUY TOKEN is greyed out", () => {
    const r = recordingSurface();
    atCounter(1, 3).draw(r.surface);
    expect(r.text("grey")).toBe("BUY TOKEN");
    expect(r.cards("white")).toBe("100100100505050252525");
  });

  test("the text and the cursor stay inside the panel, clear of its frame, wherever the cursor is", () => {
    const game = atCounter(5, 60);
    const panel = { x: 18, w: 156 };
    for (let t = 0; t < 40; t++) {
      const r = recordingSurface();
      game.draw(r.surface);
      for (const g of r.glyphs) {
        expect(g.x).toBeGreaterThanOrEqual(panel.x + 3);
        expect(g.x + 6).toBeLessThanOrEqual(panel.x + panel.w - 3);
      }
      expect(insideFrame(r.boxes)).toEqual([]);
      game.step(input(t % 4 === 0 ? { down: true } : t % 4 === 2 ? { right: true } : {}));
    }
  });
});
