import type { GameState } from "@/lib/game";
import type { Sprite } from "@/lib/sprite";

export const FRAMES_PER_SECOND = 60;
export const MILLISECONDS_PER_FRAME = 1000 / FRAMES_PER_SECOND;
export const TILE_SIZE = 16;
export const GRID_SIZE = 200;

export function probabilityHash(x: number, y: number, seed: number = 0) {
  // Implement a better seeded random number generator using xorshift
  let state = seed + (x * 1000 + y) * 7919; // Use prime number for better distribution

  // Xorshift algorithm for better randomness
  state ^= state << 13;
  state ^= state >> 17;
  state ^= state << 5;

  // Ensure positive value and normalize to 0-100
  return Math.abs(state % 100000) / 1000;
}

export function calculateFrame(
  sprite: Sprite,
  frame: number,
  deltaFrame: number
) {
  const frameFactor =
    FRAMES_PER_SECOND / (sprite.cyclesPerSecond * sprite.animationFrames);
  frame += deltaFrame / frameFactor;
  frame %= sprite.animationFrames;
  return frame;
}

export function screenPosition(x: number, y: number, scale: number) {
  return {
    x: Math.floor(x * TILE_SIZE * scale),
    y: Math.floor(y * TILE_SIZE * scale),
  };
}

export function screenCenter(state: GameState) {
  return {
    x: Math.floor(state.width / 2),
    y: Math.floor(state.height / 2),
  };
}
