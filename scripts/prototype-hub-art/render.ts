// PROTOTYPE (throwaway, #17 / PR #43): render the hub art options.
//
//   bun scripts/prototype-hub-art/render.ts
//
// Writes to out/prototype-hub-art/: each option's raw PNG, in-room composites
// (the room exactly as the hub lays it out: cabinets on tiles 6/9/12 of row 5,
// the counter at 60,106) and viewer.html, a mix-and-match page that picks each
// asset separately and lets you walk the player round with the arrow keys.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PNG } from "pngjs";
import { counterRect } from "../../src/arcade/prizeCounter.ts";
import { newWalls } from "../../src/arcade/collision.ts";
import { blank, paint } from "../pixel-art.ts";
import { cabinetColours, cabinetRows, cabinets, counters, pal, players, roomH, roomRows, rooms, roomW, titles, type Title } from "./art.ts";

const out = join(import.meta.dir, "../../out/prototype-hub-art");
mkdirSync(out, { recursive: true });

/** Where each cabinet's art stands: its collision rect's top-left (machine.ts). */
const cabinetAt: Readonly<Record<Title, { x: number; y: number }>> = {
  brassMonkey: { x: 48, y: 40 },
  sweet: { x: 72, y: 40 },
  firefly: { x: 96, y: 40 },
};

function rowsPng(rows: readonly string[]): PNG {
  const png = blank(rows[0]!.length, rows.length);
  paint(png, rows, pal);
  return png;
}

function save(name: string, png: PNG): string {
  const path = join(out, name);
  writeFileSync(path, PNG.sync.write(png));
  return path;
}

/** The room with its cabinets baked in, as arcade.png would be. */
function roomWithCabinets(r: number, c: number): string[] {
  const grid = roomRows(rooms[r]!.art).map((row) => [...row]);
  const art = cabinets[c]!.art;
  for (const t of titles) {
    const at = cabinetAt[t];
    if (art.glow) {
      // A dithered pool of the cabinet's light on the floor in front of it.
      const cx = at.x + 7.5;
      const cy = at.y + 24;
      for (let y = at.y + 24; y < at.y + 29; y++) {
        for (let x = at.x - 4; x < at.x + 20; x++) {
          const d = ((x - cx) / 10) ** 2 + ((y - cy) / 4.5) ** 2;
          if (d < 1 && (x + y) % 2 === 0) grid[y]![x] = cabinetColours[t].mid;
        }
      }
    }
    cabinetRows(art, t).forEach((row, dy) => {
      [...row].forEach((px, dx) => {
        if (px !== ".") grid[at.y + dy]![at.x + dx] = px;
      });
    });
  }
  return grid.map((row) => row.join(""));
}

interface Pick {
  player: number;
  cabinet: number;
  room: number;
  counter: number;
}

/** The hub as the game draws it: room, counter, then the player centred on (x, y). */
function compose(p: Pick, x: number, y: number, dirRow: number, frame: number): PNG {
  const png = rowsPng(roomWithCabinets(p.room, p.cabinet));
  paint(png, counters[p.counter]!.art, pal, counterRect.x, counterRect.y);
  const sheet = players[p.player]!.art;
  const frameRows = sheet.slice(dirRow * 24, dirRow * 24 + 24).map((r) => r.slice(frame * 16, frame * 16 + 16).join(""));
  paint(png, frameRows, pal, x - 8, y - 12);
  return png;
}

function scaled(png: PNG, k: number): PNG {
  const big = new PNG({ width: png.width * k, height: png.height * k });
  for (let y = 0; y < big.height; y++) {
    for (let x = 0; x < big.width; x++) {
      const s = (Math.trunc(y / k) * png.width + Math.trunc(x / k)) * 4;
      const d = (y * big.width + x) * 4;
      for (let i = 0; i < 4; i++) big.data[d + i] = png.data[s + i]!;
    }
  }
  return big;
}

const toB64 = (png: PNG) => `data:image/png;base64,${PNG.sync.write(png).toString("base64")}`;

// Raw option art, for the viewer and close-ups.
const raw = {
  player: players.map((o) => rowsPng(o.art.map((r) => r.join("")))),
  cabinet: cabinets.map((_o, i) => {
    const png = blank(16 * 3 + 8, 32);
    titles.forEach((t, j) => paint(png, cabinetRows(cabinets[i]!.art, t), pal, j * 20, 0));
    return png;
  }),
  room: rooms.map((_o, i) => rowsPng(roomWithCabinets(i, 0))),
  counter: counters.map((o) => rowsPng(o.art)),
};
raw.player.forEach((png, i) => save(`player-${players[i]!.key}.png`, scaled(png, 6)));
raw.cabinet.forEach((png, i) => save(`cabinet-${cabinets[i]!.key}.png`, scaled(png, 6)));
raw.counter.forEach((png, i) => save(`counter-${counters[i]!.key}.png`, scaled(png, 6)));

// In-room composites: vary one asset, hold the others at `base`.
const base: Pick = { player: 0, cabinet: 0, room: 0, counter: 0 };
const kinds = ["player", "cabinet", "room", "counter"] as const;
for (const kind of kinds) {
  for (let i = 0; i < 3; i++) {
    const pick = { ...base, [kind]: i };
    const key = "ABC"[i];
    // Player at the Sweet Sam cabinet, facing up; then a second standing on the floor, facing down.
    save(`hub-${kind}-${key}.png`, scaled(compose(pick, 80, 70, 0, 0), 4));
  }
}
// Every room with every player, standing mid-floor facing down, to judge readability.
for (let r = 0; r < 3; r++) {
  for (let p = 0; p < 3; p++) {
    const png = compose({ ...base, room: r, player: p }, 52, 84, 1, 0);
    paint(png, players[p]!.art.slice(48, 72).map((row) => row.slice(0, 16).join("")), pal, 100, 78);
    save(`read-room${"ABC"[r]}-player${"ABC"[p]}.png`, scaled(png, 4));
  }
}

// The viewer: every option's raw art inlined, composited live on a canvas.
const data = {
  rooms: rooms.map((o, i) => ({ key: o.key, name: o.name, note: o.note, src: toB64(rowsPng(roomRows(o.art))) })),
  cabinets: cabinets.map((o, i) => ({
    key: o.key,
    name: o.name,
    note: o.note,
    // Each option: its room-independent overlay (cabinets plus any glow) on a transparent room-sized image.
    src: toB64(
      (() => {
        const png = blank(roomW, roomH);
        const rows = roomWithCabinets(0, i);
        const bare = roomRows(rooms[0]!.art);
        const diff = rows.map((row, y) => [...row].map((px, x) => (px === bare[y]![x] ? "." : px)).join(""));
        paint(png, diff, pal);
        return png;
      })(),
    ),
  })),
  counters: counters.map((o) => ({ key: o.key, name: o.name, note: o.note, src: toB64(rowsPng(o.art)) })),
  players: players.map((o, i) => ({ key: o.key, name: o.name, note: o.note, src: toB64(raw.player[i]!) })),
  counterRect,
  walls: newWalls(),
  cabinets_at: cabinetAt,
};

const html = await Bun.file(join(import.meta.dir, "viewer.html")).text();
writeFileSync(join(out, "viewer.html"), html.replace("/*DATA*/null", JSON.stringify(data)));
console.log(`wrote ${out}`);
