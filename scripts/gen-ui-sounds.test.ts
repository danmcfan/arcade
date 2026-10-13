import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { arpeggio, attractLoops, bass, hubSong, melody, type Note } from "../src/ui/sounds.ts";
import {
  attractBrassMonkeyPath,
  attractFireflyPath,
  attractSweetPath,
  denyPath,
  hitPath,
  hubPath,
  lifeLostPath,
  movePath,
  renderAttractBrassMonkey,
  renderAttractFirefly,
  renderAttractSweet,
  renderDeny,
  renderHit,
  renderHub,
  renderLifeLost,
  renderMove,
  renderScreenOn,
  renderSelect,
  renderSpark,
  renderStage,
  renderTicket,
  renderTitle,
  screenOnPath,
  selectPath,
  sparkPath,
  stagePath,
  ticketPath,
  titlePath,
} from "./gen-ui-sounds.ts";

const length = (notes: readonly Note[]): number => notes.reduce((t, [, len]) => t + len, 0);

describe("UI sound source", () => {
  test("the hub song's voices are the same length, so the loop lines up", () => {
    expect(length(hubSong.bass)).toBe(length(hubSong.melody));
    expect(length(hubSong.arpeggio)).toBe(length(hubSong.melody));
  });

  test("every attract loop is four bars of eighths", () => {
    for (const loop of Object.values(attractLoops)) expect(length(loop.notes)).toBe(32);
  });

  test("the title music's voices are the same length, so the loop lines up", () => {
    expect(length(bass)).toBe(length(melody));
    expect(length(arpeggio)).toBe(length(melody));
  });
});

describe("committed WAVs match src/ui/sounds.ts (run `bun run sounds` after editing it)", () => {
  for (const [name, path, render] of [
    ["title.wav", titlePath, renderTitle],
    ["hub.wav", hubPath, renderHub],
    ["screen-on.wav", screenOnPath, renderScreenOn],
    ["attract-brass-monkey.wav", attractBrassMonkeyPath, renderAttractBrassMonkey],
    ["attract-sweet.wav", attractSweetPath, renderAttractSweet],
    ["attract-firefly.wav", attractFireflyPath, renderAttractFirefly],
    ["move.wav", movePath, renderMove],
    ["select.wav", selectPath, renderSelect],
    ["ticket.wav", ticketPath, renderTicket],
    ["deny.wav", denyPath, renderDeny],
    ["spark.wav", sparkPath, renderSpark],
    ["hit.wav", hitPath, renderHit],
    ["life-lost.wav", lifeLostPath, renderLifeLost],
    ["stage.wav", stagePath, renderStage],
  ] as const) {
    test(name, () => {
      expect(Buffer.compare(readFileSync(path), render())).toBe(0);
    });
  }
});
