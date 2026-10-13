import { describe, expect, test } from "bun:test";
import { fnv1a32, fnv1a32Bytes, goRound } from "./gomath.ts";

const bytes = (s: string): Uint8Array => new TextEncoder().encode(s);

describe("FNV-1a 32-bit", () => {
  test("matches the published test vectors", () => {
    expect(fnv1a32Bytes(bytes(""))).toBe(0x811c9dc5);
    expect(fnv1a32Bytes(bytes("a"))).toBe(0xe40c292c);
    expect(fnv1a32Bytes(bytes("foobar"))).toBe(0xbf9cf968);
  });

  test("hashes uint32 values as little-endian bytes", () => {
    expect(fnv1a32([0x6f6f66, 0x726162])).toBe(fnv1a32Bytes(bytes("foo\0bar\0")));
    expect(fnv1a32([])).toBe(0x811c9dc5);
  });
});

describe("goRound (Go math.Round: half away from zero)", () => {
  test("rounds halves away from zero", () => {
    expect(goRound(2.5)).toBe(3);
    expect(goRound(-2.5)).toBe(-3);
    expect(goRound(2.4)).toBe(2);
    expect(goRound(-0.4)).toBe(-0);
  });
});
