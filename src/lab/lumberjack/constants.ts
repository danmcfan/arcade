// The `const` block of internal/lumberjack/game.go. Split out of game.ts so
// tree.ts and player.ts can read it without an import cycle.

/** Draws hitboxes when true (Go `debug = false`). */
export const debug: boolean = false;

export const width = 512;
export const height = 288;

export const tileWidth = 16;
export const tileHeight = 16;

/** Go `scale = 1`: every `GeoM.Scale(scale, scale)` is the identity. */
export const scale = 1;
