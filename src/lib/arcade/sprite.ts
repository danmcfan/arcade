import type { SpriteSheet } from "@/lib/engine/sprite";
import { createSpriteSheet } from "@/lib/engine/sprite";

export function createSpriteSheets(): Record<string, SpriteSheet> {
  return {
    player: createSpriteSheet("/images/Player.png", 32, 32),
    woodFloorTiles: createSpriteSheet("/images/Wood_Floor_Tiles.png", 16, 16),
    interiorWalls: createSpriteSheet("/images/Interior_Walls.png", 16, 16),
    machine: createSpriteSheet("/images/ArcadeMachine.png", 16, 32),
  };
}
