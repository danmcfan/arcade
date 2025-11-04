import { SpriteSheetID, SpriteSheet } from "@/lib/sprite";
import { Entity, newEntity } from "@/lib/entity";
import { GameType } from "@/lib/game";

export type State = {
  container: HTMLDivElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  previous: number;
  lag: number;
  width: number;
  height: number;
  scale: number;
  resizeHandler: () => void;
  spriteSheets: Map<SpriteSheetID, SpriteSheet>;
  activeGame: GameType;
  levelWidth: number;
  levelHeight: number;
  levelSpriteSheetID: SpriteSheetID;
  gamer: Entity;
  title: boolean;
  bear: Entity;
  bees: Entity[];
  corners: Entity[];
  points: Entity[];
  powers: Entity[];
  score: number;
  keys: Set<string>;
};

export function createState() {
  const container = document.getElementById("app") as HTMLDivElement;
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  if (!container) throw new Error("Failed to get container");
  if (!canvas) throw new Error("Failed to get canvas");
  if (!ctx) throw new Error("Failed to get context");

  const state: State = {
    container,
    canvas,
    ctx,
    previous: 0,
    lag: 0,
    width: 0,
    height: 0,
    scale: 0,
    resizeHandler: () => {},
    spriteSheets: new Map(),
    activeGame: GameType.ARCADE,
    levelWidth: 160,
    levelHeight: 144,
    levelSpriteSheetID: SpriteSheetID.ARCADE,
    gamer: newEntity({}),
    title: false,
    bear: newEntity({}),
    bees: [],
    corners: [],
    points: [],
    powers: [],
    score: 0,
    keys: new Set(),
  };

  return state;
}
