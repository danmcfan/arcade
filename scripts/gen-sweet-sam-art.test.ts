import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import {
  bearDeath,
  bearWalk,
  beeBeats,
  beeBodies,
  beeEye,
  beeFlight,
  beeOrder,
  bonusFlowerArt,
  dazedFace,
  honeyDropArt,
  honeyDropShadow,
  honeycomb,
  itemBob,
  mazeHeight,
  mazeTiles,
  mazeWidth,
  smokePotArt,
  smokePotShadow,
  smokePotSmoke,
  smokePotTop,
  walkCycle,
} from "../src/sweet-sam/art.ts";
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
import { sweetie16 } from "../src/ui/sweetie16.ts";
import { checkRows, colours, flipX } from "./pixel-art.ts";
import {
  bearFrames,
  dazedBear,
  beeFrame,
  liftRows,
  beeFrames,
  isWax,
  mazeTileAt,
  sweetSamArtFiles,
  sweetSamImagesDir,
} from "./gen-sweet-sam-art.ts";

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
    checkRows("dazed face", dazedFace, { w: 12, h: 2 });
    checkRows("bonus flower", bonusFlowerArt, { w: 16, h: 16 });
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

  test("each bee eye's pupil is dark with its white above it, and the 4 beats bob", () => {
    const [x, y] = beeEye;
    for (const rows of beeFlight) expect([rows[y]?.[x], rows[y - 1]?.[x]]).toEqual(["k", "w"]);
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

  test("the honey drop and smoke pot fit their 8×12 cells on every bob, smoke included", () => {
    checkRows("honey drop", honeyDropArt, { w: 2, h: 2 });
    checkRows("honey drop shadow", honeyDropShadow, { w: 2, h: 1 });
    checkRows("smoke pot", smokePotArt, { w: 6, h: 5 });
    checkRows("smoke pot shadow", smokePotShadow, { w: 4, h: 1 });
    smokePotSmoke.forEach((s, i) => {
      checkRows(`smoke ${i}`, s, { w: 6 });
    });
    expect(itemBob.length).toBe(4);
    expect(smokePotSmoke.length).toBe(4);
    const highest = Math.max(...itemBob);
    expect(smokePotTop - highest - (smokePotSmoke[0]?.length ?? 0)).toBeGreaterThanOrEqual(0);
  });

  test("the maze map is 28×36 tiles and the honeycomb tiles evenly", () => {
    checkRows("maze", mazeTiles, { w: 28, h: 36 }, { "#": "", h: "", "=": "", " ": "" });
    expect(mazeTiles.length * tileSize).toBe(mazeHeight);
    expect((mazeTiles[0]?.length ?? 0) * tileSize).toBe(mazeWidth);
    checkRows("honeycomb", honeycomb, { w: 8, h: 4 });
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

  test("every honey drop and smoke pot sits on an open corridor", () => {
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

describe("committed Sweet Sam PNGs match src/sweet-sam/art.ts (run `bun run art` after editing it)", () => {
  test("src/assets/images/sweet-sam holds exactly the generated files", () => {
    expect(readdirSync(sweetSamImagesDir).toSorted()).toEqual(sweetSamArtFiles.map((f) => f.file).toSorted());
  });

  for (const { file, render } of sweetSamArtFiles) {
    test(file, () => {
      const onDisk = PNG.sync.read(readFileSync(join(sweetSamImagesDir, file)));
      const fresh = render();
      expect([onDisk.width, onDisk.height]).toEqual([fresh.width, fresh.height]);
      expect(Buffer.compare(onDisk.data, fresh.data)).toBe(0);
    });

    test(`${file} is only Sweetie 16 colours`, () => {
      const allowed = new Set<string>([...sweetie16, "transparent"]);
      for (const c of colours(render()).keys())
        expect({ file, colour: c, ok: allowed.has(c) }).toEqual({ file, colour: c, ok: true });
    });
  }

  test("the maze is opaque: no cabinet shows through", () => {
    const maze = sweetSamArtFiles.find((f) => f.file === "maze.png");
    if (maze === undefined) throw new Error("maze.png is not a generated file");
    expect(colours(maze.render()).has("transparent")).toBe(false);
  });
});
