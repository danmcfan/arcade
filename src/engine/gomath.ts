// Go-semantics helpers shared by every port (§4.3 hashes, §6 checklist).

/** Go `math.Round`: half away from zero (JS `Math.round` rounds half up). */
export function goRound(x: number): number {
  return x < 0 ? -Math.round(-x) : Math.round(x);
}

const OFFSET_BASIS = 2166136261;
const PRIME = 16777619;

/** FNV-1a 32-bit over raw bytes. */
export function fnv1a32Bytes(data: Uint8Array): number {
  let h = OFFSET_BASIS;
  for (const b of data) {
    h = Math.imul(h ^ b, PRIME) >>> 0;
  }
  return h >>> 0;
}

/**
 * FNV-1a 32-bit over each value as a little-endian uint32: the hash used by
 * `itemsHash` and `cellsHash` (§4.3). The Go harness implements the same.
 */
export function fnv1a32(values: readonly number[]): number {
  const buf = new Uint8Array(values.length * 4);
  const view = new DataView(buf.buffer);
  values.forEach((v, i) => {
    view.setUint32(i * 4, v >>> 0, true);
  });
  return fnv1a32Bytes(buf);
}
