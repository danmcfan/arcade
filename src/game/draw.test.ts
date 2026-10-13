import { afterEach, describe, expect, test } from "bun:test";
import { images } from "../engine/assets.ts";
import { makeSolid, type Sprite } from "../engine/image.ts";
import { NO_INPUT, type Input } from "../engine/input.ts";
import type { PremulColor, Surface } from "../engine/surface.ts";
import { bandRows, cell, charset, glyphHeight, inkOrder, sheetColumns, type Ink } from "../ui/glyphs.ts";
import { iconRects, type IconName } from "../ui/icons.ts";
import { dimColour } from "../ui/menu.ts";
import { keyHeight, keyWidth } from "../ui/text.ts";
import { Game } from "./game.ts";
import type { GearheadSnapshot } from "./snapshot.ts";
import type { FixedViewport, Software, SoftwareName } from "./software.ts";

// debugPrint draws glyphs on the surface; record its calls instead.
// (Not `mock.module`: Bun module mocks leak into every later test file.)
const printed: [string, number, number][] = [];
const debugPrint = (_s: Surface, text: string, x: number, y: number) => {
  printed.push([text, x, y]);
};

type Call =
  | ["draw", string, number, number, number, number, number, number]
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

/**
 * Records the Surface calls the hub makes (only the ones it uses). Pixel-font
 * glyphs and HUD icons are decoded into `glyphs` and `icons` instead of
 * `calls`; panel and key-cap fills are counted in `fills`.
 */
function recordingSurface() {
  const calls: Call[] = [];
  const glyphs: Glyph[] = [];
  const icons: Icon[] = [];
  let fills = 0;
  let dimmed: [number, number, number, number] | null = null;
  const surface = {
    draw(s: Sprite, x: number, y: number) {
      if (s.asset === images.font) {
        const row = Math.trunc(s.sy / cell);
        const band = Math.trunc(row / bandRows);
        const i = (row % bandRows) * sheetColumns + s.sx / cell;
        glyphs.push({ ch: charset[i]!, ink: inkOrder[band]!, x, y, h: s.h });
        return;
      }
      if (s.asset === images.icons) {
        const name = (Object.keys(iconRects) as IconName[]).find((n) => iconRects[n].x === s.sx)!;
        icons.push({ name, x, y, w: s.w, h: s.h });
        return;
      }
      const name = Object.entries(images).find(([, a]) => a === s.asset)?.[0] ?? "?";
      calls.push(["draw", name, s.sx, s.sy, s.w, s.h, x, y]);
    },
    fillRect() {
      fills++;
    },
    strokeRect(x: number, y: number, w: number, h: number, c: PremulColor) {
      calls.push(["strokeRect", x, y, w, h, c]);
    },
    fillPremul(x: number, y: number, w: number, h: number, c: PremulColor) {
      if (c.r === dimColour.r && c.a === dimColour.a) {
        dimmed = [x, y, w, h];
        return;
      }
      calls.push(["fillPremul", x, y, w, h, c]);
    },
  };
  /** Text drawn (whole glyphs only), in reading order, optionally of one ink. */
  const text = (ink?: Ink) =>
    glyphs
      .filter((g) => g.h === glyphHeight && (ink === undefined || g.ink === ink))
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((g) => g.ch)
      .join("");
  return { calls, glyphs, icons, text, surface: surface as unknown as Surface, fills: () => fills, dimmed: () => dimmed };
}

class FakeSoftware implements Software {
  margins: number[] = [];
  over = false;
  points = 0;
  constructor(readonly name: SoftwareName) {}
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
  snapshot(): GearheadSnapshot {
    return { x: 0, y: 0, frame: 0, left: false, moving: false, joystick: 0 };
  }
}
class FakeFixed extends FakeSoftware implements FixedViewport {
  fixedViewportSize(): [number, number] {
    return [336, 428];
  }
}

const built: FakeSoftware[] = [];
const factory = (name: SoftwareName): Software => {
  const sw = name === "hive" ? new FakeFixed(name) : new FakeSoftware(name);
  built.push(sw);
  return sw;
};

const games: { dispose(): void }[] = [];
function newGame(initial: SoftwareName | null = null, tokens = 5) {
  const restore = { highScore: 0, tokens, tickets: 0, player: { x: 80, y: 92, dir: "DOWN" as const } };
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

describe("hub draw", () => {
  test("background at the 16 px buffer, the prize counter, then the player frame centred on its position", () => {
    const game = newGame();
    const { calls, surface } = recordingSurface();
    game.draw(surface);
    expect(calls).toEqual([
      ["draw", "arcade", 0, 0, 160, 144, 16, 16],
      // On the bottom wall, centred: counterRect (60, 106) + the buffer.
      ["draw", "counter", 0, 0, 40, 14, 76, 122],
      // Facing down = row 1; frame 0; at (80 + 16 - 8, 92 + 16 - 12).
      ["draw", "player", 0, 24, 16, 24, 88, 96],
    ]);
  });

  test("the sprite column is int(frame); the row follows the facing direction", () => {
    const game = newGame();
    for (let t = 0; t < 25; t++) game.step(input({ left: true })); // frame 2.5, x 55
    const { calls, surface } = recordingSurface();
    game.draw(surface);
    expect(calls[2]).toEqual(["draw", "player", 32, 48, 16, 24, 63, 96]);
  });

  test("the title is drawn over everything while the melody plays", () => {
    const game = newGame();
    for (let t = 0; t < 25; t++) game.step(input({ up: true }));
    const { calls, surface } = recordingSurface();
    game.draw(surface);
    expect(calls[3]).toEqual(["draw", "sweet", 0, 0, 160, 144, 16, 16]);
    expect(calls.length).toBe(4);
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
      ["strokeRect", 64, 56, 15, 15, yellow],
      ["strokeRect", 88, 56, 15, 15, yellow],
      ["strokeRect", 112, 56, 15, 15, yellow],
      ["strokeRect", 76, 122, 39, 13, yellow],
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

describe("use prompt", () => {
  /** Where the SPACE key cap's first letter lands for a key cap at hub-image (x, y). */
  const capText = (x: number, y: number) => ({ x: x + 16 + 3, y: y + 16 + 1 });
  /** Top-left of the white SPACE label, or null when no use prompt (or other SPACE key cap) is drawn. */
  function promptAt(game: Game, hubPaused = false): { x: number; y: number } | null {
    const r = recordingSurface();
    game.draw(r.surface, hubPaused);
    const s = r.glyphs.find((g) => g.ch === "S" && g.ink === "white");
    expect(r.text("white")).toBe(s === undefined ? "" : "SPACE");
    return s === undefined ? null : { x: s.x, y: s.y };
  }
  const centred = (x: number, w: number) => x + Math.trunc((w - keyWidth("SPACE")) / 2);

  test("none at the start position", () => {
    expect(promptAt(newGame())).toBeNull();
  });

  test("a SPACE key cap above the cabinet the player faces, bobbing, with its title", () => {
    const game = newGame();
    for (let t = 0; t < 30; t++) game.step(input({ up: true })); // tick 30, y 62: at the Sweet Sam cabinet
    expect(game.snapshot().arcade.title).toBe("sweet");
    // The Sweet Sam cabinet's rect is (72, 40, 16, 16); ticks 20..39 are the bob's raised half.
    expect(promptAt(game)).toEqual(capText(centred(72, 16), 40 - keyHeight - 2 - 1));
    for (let t = 0; t < 10; t++) game.step(input()); // tick 40: back down
    expect(promptAt(game)).toEqual(capText(centred(72, 16), 40 - keyHeight - 2));
  });

  test("above the player's head while they stand on the prize counter facing it", () => {
    const game = newGame();
    for (let t = 0; t < 2; t++) game.step(input({ down: true })); // tick 2, (80, 94): the player's top is y 82
    expect(promptAt(game)).toEqual(capText(80 - keyWidth("SPACE") / 2, 82 - keyHeight - 2));
  });

  test("hidden while the prize counter menu or the hub pause menu covers the hub", () => {
    const game = newGame();
    for (let t = 0; t < 2; t++) game.step(input({ down: true }));
    expect(promptAt(game, true)).toBeNull();
    game.step(input({ space: true }));
    expect(game.snapshot().menu).toBe("prizeCounter");
    const r = recordingSurface();
    game.draw(r.surface);
    // Only the menu's own hint key caps: CLOSE, then SPACE ESC (OK / BACK).
    expect(r.text("white")).toBe("CLOSESPACEESCOKBACK");
  });
});

describe("software draw", () => {
  test("normal software draws with the 16 px margin and nothing else is drawn", () => {
    const game = newGame("gearhead");
    game.step(input());
    const { calls, surface } = recordingSurface();
    game.draw(surface);
    expect(calls).toEqual([]);
    expect(built[0]?.margins).toEqual([16]);
  });

  test("a FixedViewport draws with margin 0", () => {
    const game = newGame("hive");
    game.step(input());
    game.draw(recordingSurface().surface);
    expect(built[0]?.margins).toEqual([0]);
  });

  test("debug mode inside a software draws no panel (layout still grows)", () => {
    const game = newGame("gearhead");
    game.step(input({ shiftP: true }));
    const { calls, surface } = recordingSurface();
    game.draw(surface);
    expect(calls).toEqual([]);
    expect(printed).toEqual([]);
    expect(game.layout()).toEqual([376, 288]);
  });
});

describe("hub HUD", () => {
  test("a coin and the token count on the left, a ticket and the ticket count on the right, in the top margin", () => {
    const game = newGame();
    const r = recordingSurface();
    game.draw(r.surface);
    expect(r.text("yellow")).toBe("50");
    expect(r.glyphs.every((g) => g.y >= 0 && g.y + glyphHeight <= 16)).toBe(true);
    const [coin, ticket] = r.icons;
    expect(r.icons.map((i) => i.name)).toEqual(["token", "ticket"]);
    expect(r.icons.every((i) => i.y >= 0 && i.y + i.h <= 16)).toBe(true);
    // Each icon is vertically centred on the text.
    expect(r.icons.every((i) => 2 * i.y + i.h === 2 * r.glyphs[0]!.y + glyphHeight)).toBe(true);
    expect(coin!.x).toBe(16);
    const [tokens, tickets] = r.glyphs;
    expect(tokens!.x).toBeGreaterThan(coin!.x + coin!.w);
    expect(ticket!.x).toBeGreaterThan(tokens!.x);
    expect(tickets!.x).toBeGreaterThan(ticket!.x + ticket!.w);
  });

  test("a spent token shows at once; at 0 tokens the count reads FREE PLAY", () => {
    const game = newGame(null, 1);
    const r1 = recordingSurface();
    game.draw(r1.surface);
    expect(r1.text("yellow")).toBe("10");
    for (let t = 0; t < 31; t++) game.step(input({ up: true }));
    game.step(input({ up: true, space: true }));
    for (const keys of [{ escape: true }, {}, { down: true }, {}, { down: true }, {}, { space: true }]) game.step(input(keys));
    const r0 = recordingSurface();
    game.draw(r0.surface);
    expect(r0.text("orange")).toBe("FREE PLAY");
    expect(r0.text("yellow")).toBe("0");
    expect(r0.icons.map((i) => i.name)).toEqual(["token", "ticket"]);
  });

  test("the hub pause dims only the hub image, so the counts stay readable (title scene)", () => {
    const game = newGame();
    const r = recordingSurface();
    game.draw(r.surface);
    expect(r.dimmed()).toBeNull();
  });
});

describe("menus over a minigame", () => {
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

  test("the minigame pause menu draws over the dimmed minigame: Resume, Controls, Quit game (no tickets)", () => {
    const game = atCabinet();
    tapKeys(game, "escape");
    const r = recordingSurface();
    game.draw(r.surface);
    expect(built[0]?.margins).toEqual([0]);
    expect(r.dimmed()).toEqual([0, 0, 336, 428]);
    expect(r.text("yellow")).toBe("PAUSED>RESUME<");
    expect(r.text("white")).toBe("CONTROLSQUIT GAME");
    expect(r.text("orange")).toBe("NO TICKETS");
    const quit = r.glyphs.find((g) => g.ch === "Q")!;
    const note = r.glyphs.find((g) => g.ink === "orange")!;
    expect(note.y).toBe(quit.y);
    expect(note.x).toBeGreaterThan(quit.x);
    // Centred on the minigame's layout.
    const paused = r.glyphs.filter((g) => g.ink === "yellow" && g.y === Math.min(...r.glyphs.map((x) => x.y)));
    const mid = (paused[0]!.x + paused[paused.length - 1]!.x + 6) / 2;
    expect(Math.abs(mid - 168)).toBeLessThan(4);
  });

  test("a minigame with a margin dims only its playfield", () => {
    const game = newGame(null);
    for (let t = 0; t < 31; t++) game.step(input({ up: true }));
    for (let t = 0; t < 24; t++) game.step(input({ left: true }));
    game.step(input({ up: true, space: true }));
    expect(game.snapshot()).toMatchObject({ software: "gearhead" });
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
    built[0]!.points = 1420;
    built[0]!.over = true;
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
    built[0]!.points = 1420;
    built[0]!.over = true;
    game.step(input());
    const r = recordingSurface();
    game.draw(r.surface);
    expect(r.text("orange")).toBe("FREE PLAY: 0 TICKETS");
    expect(r.text("white")).toBe("SCORE1420SPACEOK");
  });
});

describe("prize counter menu", () => {
  function atCounter(tokens: number, tickets: number): Game {
    const g = new Game(null, { createSoftware: factory, debugPrint, restore: { highScore: 0, tokens, tickets, player: { x: 80, y: 92, dir: "DOWN" } } });
    games.push(g);
    for (let t = 0; t < 2; t++) g.step(input({ down: true }));
    g.step(input({ space: true }));
    g.step(input());
    return g;
  }

  test("dims the hub image, not the counts, and lists the tickets, the token and CLOSE", () => {
    const r = recordingSurface();
    atCounter(2, 12).draw(r.surface);
    expect(r.dimmed()).toEqual([16, 16, 160, 144]);
    // HUD 2 and 12, the title, the selected token, the ticket count in the panel.
    expect(r.text("yellow")).toBe("212PRIZE COUNTER12>TOKEN: 5 TICKETS<");
    expect(r.text("white")).toBe("CLOSESPACEESCOKBACK") // key caps sit 1 px above their labels;
    expect(r.text("grey")).toBe("");
    expect(r.icons.map((i) => i.name)).toEqual(["token", "ticket", "ticket"]);
  });

  test("a bought token shows in the HUD at once", () => {
    const game = atCounter(2, 12);
    game.step(input({ space: true }));
    const r = recordingSurface();
    game.draw(r.surface);
    expect(r.text("yellow").startsWith("37PRIZE COUNTER7")).toBe(true);
  });

  test("with 0 tokens and too few tickets the token item is the last-chance token", () => {
    const game = atCounter(0, 3);
    // Tick 20 of 40: the selection arrows are at their furthest out.
    while (game.snapshot().tick % 40 !== 20) game.step(input());
    const r = recordingSurface();
    game.draw(r.surface);
    expect(r.text("yellow")).toContain(">LAST CHANCE: ALL TICKETS<");
    // Inside the 176-px panel (x 8..184) and clear of its 3-px frame.
    const arrows = r.glyphs.filter((g) => g.ch === ">" || g.ch === "<");
    expect(Math.min(...arrows.map((g) => g.x))).toBeGreaterThanOrEqual(8 + 3);
    expect(Math.max(...arrows.map((g) => g.x + 4))).toBeLessThanOrEqual(184 - 3);
  });

  test("with tokens left and too few tickets the token item is greyed out", () => {
    const r = recordingSurface();
    atCounter(1, 3).draw(r.surface);
    expect(r.text("grey")).toBe("TOKEN: 5 TICKETS");
    expect(r.text("yellow")).toBe("13PRIZE COUNTER3><");
  });
});
