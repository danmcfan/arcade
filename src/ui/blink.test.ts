import { describe, expect, test } from "bun:test";

import { blinkOn } from "./blink.ts";

describe("blinkOn", () => {
  test("a 2 s cycle at 60 ticks a second, on for the first 1.5 s", () => {
    const on = Array.from({ length: 240 }, (_, t) => blinkOn(t));
    expect(on.slice(0, 90).every(Boolean)).toBe(true);
    expect(on.slice(90, 120).some(Boolean)).toBe(false);
    expect(on.slice(120)).toEqual(on.slice(0, 120));
  });
});
