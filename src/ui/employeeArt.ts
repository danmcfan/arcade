// Pixel-art source for the prize desk's employee (#75): green visor, red vest,
// 16x24 like the player, standing behind the desk with their back to us,
// facing the player. Drawn as the left half and mirrored. Three idle frames:
// standing, breathing (a pixel lower) and waving. scripts/gen-ui-art.ts
// writes them left to right to src/assets/images/employee.png; the hub plays
// them by `employeeIdle` (src/arcade/employee.ts).

export const employeeWidth = 16;
export const employeeHeight = 24;

/** The left half, front view: the visor, the face, the vest, the legs. */
const half: readonly string[] = [
  "........",
  "........",
  "........",
  "......kk",
  "....kkkk",
  "...kkkpk",
  "..kkpkkk",
  "..kGGGGG",
  ".kGGGGGG",
  ".kkkkkkk",
  "..kkyyyy",
  "..kyykyy",
  "..kyyyyy",
  "...kyyyr",
  "....kkyy",
  "..kkrrkw",
  ".kwwkrrw",
  ".kyykrrw",
  "..kkrrrw",
  "...kkkkk",
  "...kbbkk",
  "...kwbbk",
  "...kwwk.",
  "....kk..",
];

const mirror = (rows: readonly string[]): string[] => rows.map((r) => r + Array.from(r).toReversed().join(""));

/** Seen from behind: the face rows (10..13) become the back of the head, with a highlight. */
function backOf(rows: readonly string[]): string[] {
  return rows.map((r, y) =>
    y >= 10 && y <= 13
      ? r.replaceAll(/[yrw]/gu, (c, i: number) => (i > 2 && i < 13 ? "k" : c)).replace(/k(?=k{3,})/u, "p")
      : r,
  );
}

/** `rows` with each [x, y, px] set. */
function put(rows: readonly string[], pts: readonly (readonly [number, number, string])[]): string[] {
  const g = rows.map((r) => Array.from(r));
  for (const [x, y, c] of pts) {
    const row = g[y];
    if (row === undefined || row[x] === undefined) throw new Error(`employee art: no pixel at ${x},${y}`);
    row[x] = c;
  }
  return g.map((r) => r.join(""));
}

/** Standing, back to us. */
const stand = backOf(mirror(half));
/** Breathing: everything above the feet a pixel lower. */
const breathe = ["................", ...stand.slice(0, 19), ...stand.slice(20)];
/** Waving: the right arm raised by the head. */
const wave = put(stand, [
  [14, 10, "k"],
  [14, 11, "y"],
  [15, 11, "k"],
  [14, 12, "y"],
  [15, 12, "k"],
  [14, 13, "w"],
  [15, 13, "k"],
  [14, 14, "w"],
  [15, 14, "k"],
  [12, 16, "."],
  [13, 16, "."],
  [14, 16, "."],
  [12, 17, "."],
  [13, 17, "."],
  [14, 17, "."],
  [11, 16, "k"],
  [11, 17, "k"],
]);

/** The idle frames, in employee.png's order. */
export const employeeFrames: readonly (readonly string[])[] = [stand, breathe, wave];

/** employee.png: the frames left to right. */
export function employeeSheetRows(): string[] {
  return Array.from({ length: employeeHeight }, (_, y) => employeeFrames.map((f) => f[y] ?? "").join(""));
}
