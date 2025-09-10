import { SpriteSheetID, SpriteSheet } from "@/lib/sprite";
import { Entity, newEntity } from "@/lib/entity";

export type State = {
  container: HTMLDivElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  previous: number;
  lag: number;
  width: number;
  height: number;
  scale: number;
  spriteSheets: Map<SpriteSheetID, SpriteSheet>;
  player: Entity;
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

  const state: State = {
    container,
    canvas,
    ctx,
    previous: 0,
    lag: 0,
    width: 0,
    height: 0,
    scale: 0,
    spriteSheets: new Map(),
    player: newEntity({}),
    bees: [],
    corners: [],
    points: [],
    powers: [],
    score: 0,
    keys: new Set(),
  };

  return state;
}
