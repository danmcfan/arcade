import type { Position } from "@/lib/sweet/ecs";

export function overlaps(position: Position, target: Position) {
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < position.radius;
}
