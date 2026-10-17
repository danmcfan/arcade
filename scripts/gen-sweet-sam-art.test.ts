import { describe, expect, test } from "bun:test";
import {
  bearDeath,
  bearWalk,
  beeBeats,
  beeBodies,
  beeEye,
  beeEyes,
  beeFlight,
  beeOrder,
  dazedFace,
  dialDigitsArt,
  flowers,
  honeyDropArt,
  honeyDropShadow,
  honeyPotArt,
  honeyPotShadow,
  honeyPotTop,
  itemBob,
  mazeHeight,
  mazeTiles,
  mazeWidth,
  pointsArt,
  pointsFrameSize,
  pointsTop,
  readyArt,
  walkCycle,
} from "../src/sweet-sam/art.ts";
import { scoreLabelsArt, scoreLabelsX } from "../src/ui/hudArt.ts";
import {
  newCorners,
  newEnemies,
  newItems,
  newPlayer,
  tileSize,
  tunnelLeftX,
  tunnelRightX,
  tunnelRowY,
  type Entity,
} from "../src/sweet-sam/entity.ts";
import { flowerKinds } from "../src/sweet-sam/flower.ts";
import { sweetie16 } from "../src/ui/sweetie16.ts";
import { checkRows, colours, flipX, type Rows } from "./pixel-art.ts";
import {
  bearFrames,
  dazedBear,
  beeFrame,
  liftRows,
  beeFrames,
  isWax,
  mazeLetter,
  mazeTileAt,
  sweetSamArtFiles,
} from "./gen-sweet-sam-art.ts";

/** The black pixels of `rows` next to a blank pixel or the frame's edge, as "x,y". */
function blackOnEdge(rows: Rows): string[] {
  const blank = (x: number, y: number): boolean => (rows[y]?.[x] ?? ".") === ".";
  const out: string[] = [];
  rows.forEach((row, y) => {
    Array.from(row).forEach((px, x) => {
      if (px === "k" && (blank(x - 1, y) || blank(x + 1, y) || blank(x, y - 1) || blank(x, y + 1)))
        out.push(`${x},${y}`);
    });
  });
  return out;
}

describe("Sweet Sam art source", () => {
  test("every bear and bee frame is 16×16, in Sweetie 16 letters and .", () => {
    for (const [facing, frames] of Object.entries(bearWalk))
      frames.forEach((f, i) => {
        checkRows(`bear ${facing} ${i}`, f, { w: 16, h: 16 });
      });
    bearDeath.forEach((f, i) => {
      checkRows(`bear death ${i}`, f, { w: 16, h: 16 });
    });
    beeFlight.forEach((f, i) => {
      checkRows(`bee ${i}`, f, { w: 16, h: 16 });
    });
    beeEyes.forEach((f, i) => {
      checkRows(`bee eyes ${i}`, f, { w: 16, h: 16 });
    });
    checkRows("dazed face", dazedFace, { w: 12, h: 2 });
  });

  test("no sprite drawn on the black maze has black on its outer edge: it would vanish into the background", () => {
    const sprites: [string, Rows][] = [
      ...bearFrames().flatMap((row, r) => row.map((f, c): [string, Rows] => [`bear ${r},${c}`, f])),
      ...beeOrder.flatMap((kind) =>
        beeFrames(kind).flatMap((row, r) => row.map((f, c): [string, Rows] => [`${kind} bee ${r},${c}`, f])),
      ),
      ...flowers.map((f, i): [string, Rows] => [`flower ${i + 1}`, f]),
      ["honey pot", honeyPotArt],
    ];
    for (const [name, rows] of sprites) expect({ name, edge: blackOnEdge(rows) }).toEqual({ name, edge: [] });
  });

  test("the bear sheet keeps the Go layout, 4 facings of 4 walk frames, and adds 4 death frames below", () => {
    expect(walkCycle.length).toBe(4);
    const rows = bearFrames();
    expect(rows.map((r) => r.length)).toEqual([4, 4, 4, 4, 4]);
  });

  test("derived frames: down and up step with mirrored feet, the dazed bear is the standing one with a new face", () => {
    const [down] = bearFrames();
    expect(down?.[3]).toEqual(flipX(bearWalk.down[1] ?? []));
    expect(dazedBear().filter((row, y) => row !== bearWalk.down[0]?.[y])).toHaveLength(2);
    expect(liftRows(["ab", "cd", "ef"], 1)).toEqual(["cd", "ef", ".."]);
  });

  test("each bee eye's pupil is dark in the body, and the 4 beats bob", () => {
    const [x, y] = beeEye;
    for (const rows of beeFlight) expect([rows[y]?.[x], rows[y - 1]?.[x]]).toEqual(["k", "y"]);
    expect(beeBeats.map((b) => b.bob)).toEqual([0, 0, 1, 1]);
  });

  test("the four bees look different, and sleepy and waking bees look different from all of them", () => {
    expect(new Set(beeOrder.map((k) => beeBodies[k])).size).toBe(4);
    const looks = [
      ...beeOrder.map((k) => beeFrame(k, 0, "awake").join("")),
      beeFrame("red", 0, "sleepy").join(""),
      beeFrame("red", 0, "waking").join(""),
    ];
    expect(new Set(looks).size).toBe(looks.length);
    // A sleepy bee looks the same whichever bee it is.
    expect(new Set(beeOrder.map((k) => beeFrame(k, 2, "sleepy").join(""))).size).toBe(1);
  });

  test("a bee sheet keeps the Go layout: 6 rows (flying, sleepy, waking; right then left) of 4 beats", () => {
    expect(beeFrames("teal").map((r) => r.length)).toEqual([4, 4, 4, 4, 4, 4]);
  });

  test("one 16×16 bonus flower per flower kind", () => {
    expect(flowers.length).toBe(flowerKinds);
    flowers.forEach((f, i) => {
      checkRows(`flower ${i + 1}`, f, { w: 16, h: 16 });
      // Drawn on the frame's bottom row: the flower stands on the corridor's wall, and the counter's on the screen's edge.
      expect(f.at(-1)).not.toBe(".".repeat(16));
    });
  });

  test("the honey drop and honey pot fit their 8×12 cells on every bob", () => {
    checkRows("honey drop", honeyDropArt, { w: 2, h: 2 });
    checkRows("honey drop shadow", honeyDropShadow, { w: 2, h: 1 });
    checkRows("honey pot", honeyPotArt, { w: 6, h: 7 });
    checkRows("honey pot shadow", honeyPotShadow, { w: 4, h: 1 });
    expect(itemBob.length).toBe(4);
    expect(honeyPotTop - Math.max(...itemBob)).toBeGreaterThanOrEqual(0);
  });

  test("the maze map is 28×36 tiles", () => {
    checkRows("maze", mazeTiles, { w: 28, h: 36 }, { "#": "", h: "", "=": "", " ": "" });
    expect(mazeTiles.length * tileSize).toBe(mazeHeight);
    expect((mazeTiles[0]?.length ?? 0) * tileSize).toBe(mazeWidth);
  });

  test("the text: labels in the maze's blank top row, READY! and the digits in 8×8 cells, points in 16×16 frames", () => {
    checkRows("score labels", scoreLabelsArt, { w: 126, h: 7 });
    expect(scoreLabelsX + 126).toBeLessThanOrEqual(mazeWidth);
    expect(mazeTiles[0]?.trim()).toBe("");
    checkRows("ready", readyArt, { w: 6 * 8, h: 8 });
    checkRows("dial digits", dialDigitsArt, { w: 10 * 8, h: 8 });
    checkRows("points", pointsArt, { w: 4 * pointsFrameSize, h: 7 });
    expect(pointsTop + pointsArt.length).toBeLessThanOrEqual(pointsFrameSize);
  });
});

/** The 16×16 box an entity at (x, y) fills has no wax in it. */
function openAround(x: number, y: number): boolean {
  for (let dy = -8; dy < 8; dy++) for (let dx = -8; dx < 8; dx++) if (isWax(x + dx, y + dy)) return false;
  return true;
}

function tileOf(e: Entity): [number, number] {
  return [Math.trunc(e.x / tileSize), Math.trunc(e.y / tileSize)];
}

describe("the maze art matches the game's maze", () => {
  test("every corner sits on a corridor, and every way out of it is a corridor", () => {
    const step = { UP: [0, -1], DOWN: [0, 1], LEFT: [-1, 0], RIGHT: [1, 0] } as const;
    for (const c of newCorners()) {
      const [tx, ty] = tileOf(c);
      expect({ corner: [tx, ty], tile: mazeTileAt(tx, ty), open: openAround(c.x, c.y) }).toEqual({
        corner: [tx, ty],
        tile: ".",
        open: true,
      });
      for (const d of c.directions) {
        const [dx, dy] = step[d];
        expect({ corner: [tx, ty], d, next: mazeTileAt(tx + dx, ty + dy) }).toEqual({ corner: [tx, ty], d, next: "." });
      }
    }
  });

  test("every honey drop and honey pot sits on an open corridor", () => {
    for (const item of newItems()) {
      if (item === null) continue;
      const [tx, ty] = tileOf(item);
      expect({ item: [tx, ty], tile: mazeTileAt(tx, ty), open: openAround(item.x, item.y) }).toEqual({
        item: [tx, ty],
        tile: ".",
        open: true,
      });
    }
  });

  test("the tunnel is open from each side of the maze to where the bees slow down", () => {
    for (let x = 0; x < mazeWidth; x++) {
      if (x > tunnelLeftX + 8 && x < tunnelRightX - 8) continue;
      expect({ x, open: openAround(x, tunnelRowY) }).toEqual({ x, open: true });
    }
    const row = mazeTiles[Math.trunc(tunnelRowY / tileSize)] ?? "";
    expect([row[0], row.at(-1)]).toEqual([".", "."]);
  });

  test("the bear starts on a corridor and the bees start on a corridor or in the bee home", () => {
    const p = newPlayer();
    expect(mazeTileAt(...tileOf(p))).toBe(".");
    expect(openAround(p.x, p.y)).toBe(true);
    expect(newEnemies().map((e) => mazeTileAt(...tileOf(e)))).toEqual([".", "h", "h", "h"]);
  });
});

describe("the maze's wax", () => {
  test("is solid yellow with an orange border: only y, o, the background k and the white door and labels", () => {
    const used = new Set<string>();
    for (let y = 0; y < mazeHeight; y++) for (let x = 0; x < mazeWidth; x++) used.add(mazeLetter(x, y));
    expect([...used].toSorted()).toEqual(["k", "o", "w", "y"]);
  });

  test("outer corners are rounded and the border hugs the curve", () => {
    // The outer wall's top-left corner: its top row starts 2 px in, the next 1 px, then the edge.
    let i = 0;
    while (!isWax(i % mazeWidth, Math.floor(i / mazeWidth))) i++;
    const [x, y] = [i % mazeWidth, Math.floor(i / mazeWidth)];
    expect(x).toBe(2);
    expect([isWax(x - 2, y + 1), isWax(x - 1, y + 1), isWax(x - 2, y + 2)]).toEqual([false, true, true]);
    expect([mazeLetter(x, y), mazeLetter(x - 1, y + 1), mazeLetter(x - 2, y + 2)]).toEqual(["o", "o", "o"]);
  });
});

describe("generated Sweet Sam PNGs", () => {
  for (const { file, render } of sweetSamArtFiles) {
    test(`${file} is only Sweetie 16 colours`, () => {
      const allowed = new Set<string>([...sweetie16, "transparent"]);
      for (const c of colours(render()).keys())
        expect({ file, colour: c, ok: allowed.has(c) }).toEqual({ file, colour: c, ok: true });
    });
  }

  test("the maze is opaque: no cabinet shows through", () => {
    const maze = sweetSamArtFiles.find((f) => f.file.endsWith("/maze.png"));
    if (maze === undefined) throw new Error("maze.png is not a generated file");
    expect(colours(maze.render()).has("transparent")).toBe(false);
  });
});
