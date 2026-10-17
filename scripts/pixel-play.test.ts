import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deskRows } from "../src/ui/deskArt.ts";
import { repoRoot } from "./repo-root.ts";
import { buildOption } from "./pixel-play.ts";

describe("buildOption", () => {
  test("writes the option's rows into a copy and builds the game there, leaving the repo as it was", () => {
    const source = join(repoRoot, "src/ui/deskArt.ts");
    const png = join(repoRoot, "src/assets/images/arcade.png");
    const before = [readFileSync(source, "utf8"), readFileSync(png)] as const;
    const red = deskRows.map((r) => r.replaceAll(/[^.]/gu, "r"));
    const dir = mkdtempSync(join(tmpdir(), "pixel-play-"));
    try {
      const dist = buildOption({ "src/ui/deskArt.ts:deskRows": { red } }, "red", dir);
      expect(readFileSync(join(dir, "src/ui/deskArt.ts"), "utf8")).toContain(JSON.stringify(red[20]));
      expect(readFileSync(join(dir, "src/assets/images/arcade.png")).equals(before[1])).toBe(false);
      expect(readFileSync(join(dist, "index.html"), "utf8")).toContain("<canvas");
      expect(readFileSync(source, "utf8")).toBe(before[0]);
      expect(readFileSync(png).equals(before[1])).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30_000);
});
