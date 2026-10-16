import { describe, expect, test } from "bun:test";
import { looksTouchFirst, readPointer, showsKeyboardNotice } from "./device.ts";

describe("looksTouchFirst", () => {
  test("a coarse pointer with no hover is touch-first, at any size", () => {
    expect(looksTouchFirst({ coarseNoHover: true, width: 390, height: 844 })).toBe(true);
    expect(looksTouchFirst({ coarseNoHover: true, width: 844, height: 390 })).toBe(true);
    expect(looksTouchFirst({ coarseNoHover: true, width: 1024, height: 1366 })).toBe(true);
  });

  test("a fine pointer or hover is never touch-first, at any size", () => {
    expect(looksTouchFirst({ coarseNoHover: false, width: 1280, height: 800 })).toBe(false);
    expect(looksTouchFirst({ coarseNoHover: false, width: 390, height: 844 })).toBe(false);
    expect(looksTouchFirst({ coarseNoHover: false, width: 300, height: 200 })).toBe(false);
  });

  test("when the pointer is unknown, a shortest side under 768 CSS px breaks the tie", () => {
    expect(looksTouchFirst({ coarseNoHover: null, width: 390, height: 844 })).toBe(true);
    expect(looksTouchFirst({ coarseNoHover: null, width: 1024, height: 767 })).toBe(true);
    expect(looksTouchFirst({ coarseNoHover: null, width: 1024, height: 768 })).toBe(false);
    expect(looksTouchFirst({ coarseNoHover: null, width: 768, height: 1024 })).toBe(false);
    expect(looksTouchFirst({ coarseNoHover: null, width: 1280, height: 800 })).toBe(false);
  });
});

function media(matching: string[]): (q: string) => { matches: boolean } {
  return (q) => ({ matches: matching.includes(q) });
}

describe("readPointer", () => {
  test("coarse with no hover is true", () => {
    expect(readPointer(media(["(pointer: coarse) and (hover: none)"]))).toBe(true);
  });

  test("a fine pointer or hover is false", () => {
    expect(readPointer(media(["(pointer: fine)", "(hover: hover)"]))).toBe(false);
    expect(readPointer(media(["(hover: hover)"]))).toBe(false);
  });

  test("neither reported is null", () => {
    expect(readPointer(media([]))).toBe(null);
  });
});

describe("showsKeyboardNotice", () => {
  const phone = { coarseNoHover: true, width: 390, height: 844 };
  test("a touch-first device shows the notice", () => {
    expect(showsKeyboardNotice(phone, new URLSearchParams(""))).toBe(true);
  });
  test("?keyboard says a keyboard is there, so the notice never shows", () => {
    expect(showsKeyboardNotice(phone, new URLSearchParams("debug&keyboard"))).toBe(false);
  });
  test("a desktop shows no notice", () => {
    expect(showsKeyboardNotice({ ...phone, coarseNoHover: false }, new URLSearchParams(""))).toBe(false);
  });
});
