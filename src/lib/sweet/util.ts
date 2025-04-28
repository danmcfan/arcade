export function overlaps(
  position: { x: number; y: number; radius: number },
  target: { x: number; y: number }
) {
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < position.radius;
}
