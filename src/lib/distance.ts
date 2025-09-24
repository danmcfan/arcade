import { Entity } from "@/lib/entity";
import { DISTANCE_THRESHOLD } from "@/lib/constant";

export function withinDistanceCorner(
  entity: Entity,
  corners: Entity[]
): Entity | null {
  for (const corner of corners) {
    if (withinDistance(entity, corner)) {
      return corner;
    }
  }
  return null;
}

export function withinDistance(entity1: Entity, entity2: Entity) {
  return (
    Math.abs(entity1.x - entity2.x) <= DISTANCE_THRESHOLD &&
    Math.abs(entity1.y - entity2.y) <= DISTANCE_THRESHOLD
  );
}

export function distance(entity1: Entity, entity2: Entity) {
  return Math.sqrt(
    Math.pow(entity1.x - entity2.x, 2) + Math.pow(entity1.y - entity2.y, 2)
  );
}
