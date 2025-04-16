import type { Player } from "@/lib/sweet/player";

export function overlaps(player: Player, x: number, y: number) {
  const dx = x - player.x;
  const dy = y - player.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < player.radius;
}
