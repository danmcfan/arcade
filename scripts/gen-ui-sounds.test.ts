import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { arpeggio, bass, melody, type Note } from "../src/ui/sounds.ts";
import {
  denyPath,
  movePath,
  renderDeny,
  renderMove,
  renderSelect,
  renderTicket,
  renderTitle,
  selectPath,
  ticketPath,
  titlePath,
} from "./gen-ui-sounds.ts";

const length = (notes: readonly Note[]) => notes.reduce((t, [, len]) => t + len, 0);

describe("UI sound source", () => {
  test("the title music's voices are the same length, so the loop lines up", () => {
    expect(length(bass)).toBe(length(melody));
    expect(length(arpeggio)).toBe(length(melody));
  });
});

describe("committed WAVs match src/ui/sounds.ts (run `bun run sounds` after editing it)", () => {
  for (const [name, path, render] of [
    ["title.wav", titlePath, renderTitle],
    ["move.wav", movePath, renderMove],
    ["select.wav", selectPath, renderSelect],
    ["ticket.wav", ticketPath, renderTicket],
    ["deny.wav", denyPath, renderDeny],
  ] as const) {
    test(name, () => {
      expect(Buffer.compare(readFileSync(path), render())).toBe(0);
    });
  }
});
