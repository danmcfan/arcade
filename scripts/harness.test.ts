import { describe, expect, test } from "bun:test";
import { withKeyboard } from "./harness.ts";

describe("withKeyboard", () => {
  test("adds `keyboard` to the page's query, with or without one already", () => {
    expect(withKeyboard("")).toBe("?keyboard");
    expect(withKeyboard("?debug")).toBe("?debug&keyboard");
    expect(withKeyboard("?debug&scene=game")).toBe("?debug&scene=game&keyboard");
    expect(withKeyboard("scene=game")).toBe("?scene=game&keyboard");
  });
});
