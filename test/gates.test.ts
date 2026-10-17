import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { PNG } from "pngjs";
import { evidenceFailures, noticeFailures, showsNotice } from "../.sandcastle/gates.ts";
import { repoRoot } from "../scripts/repo-root.ts";

const png = (path: string): PNG => PNG.sync.read(readFileSync(`${repoRoot}${path}`));
const reference = png(".sandcastle/notice.png");
const game = png("test/fixtures/gate/game.png");
const phone = png("test/fixtures/gate/notice-phone.png");

describe("notice gate", () => {
  test("a game screenshot is not the notice", () => {
    expect(showsNotice(game, reference)).toBe(false);
  });

  test("a phone screenshot of the notice is", () => {
    expect(showsNotice(phone, reference)).toBe(true);
  });

  test("the logical notice frame is", () => {
    expect(showsNotice(reference, reference)).toBe(true);
  });

  test("fails a run for each notice PNG it attaches", () => {
    const failures = noticeFailures(
      [
        ["out/verify/a/game.png", game],
        ["out/verify/a/phone.png", phone],
      ],
      reference,
    );
    expect(failures.map((f) => f.rule)).toEqual(["notice"]);
    expect(failures[0]?.message).toContain("out/verify/a/phone.png");
  });
});

describe("evidence gate", () => {
  test("a drawing diff with no evidence fails", () => {
    const failures = evidenceFailures(["src/sweet-sam/draw.ts", "src/sweet-sam/game.ts"], [], "out/verify");
    expect(failures.map((f) => f.rule)).toEqual(["visual-evidence"]);
    expect(failures[0]?.message).toContain("src/sweet-sam/draw.ts");
    expect(failures[0]?.message).not.toContain("game.ts");
  });

  test("a drawing diff with evidence passes", () => {
    expect(evidenceFailures(["src/sweet-sam/draw.ts"], ["out/verify/x/a.png"], "out/verify")).toEqual([]);
  });

  test("an evidence directory holding only empty subdirectories fails", () => {
    expect(evidenceFailures(["src/sweet-sam/draw.ts"], ["out/verify/x"], "out/verify")).toHaveLength(1);
  });

  test("a logic-only diff with no evidence passes", () => {
    expect(evidenceFailures(["src/sweet-sam/game.ts", "src/sweet-sam/draw.test.ts"], [], "out/verify")).toEqual([]);
  });

  test("art sources, generated art and sounds count as visible", () => {
    for (const file of [
      "art/cabinet.ase",
      "src/ui/hudArt.ts",
      "src/firefly/art.ts",
      "scripts/gen-ui-sounds.ts",
      "src/assets/images/firefly/moth.png",
      "src/assets/sounds/coin.wav",
      "src/engine/images.generated.ts",
      "src/ui/sounds.ts",
    ])
      expect(evidenceFailures([file], [], "out/verify")).toHaveLength(1);
  });
});
