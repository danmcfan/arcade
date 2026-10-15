import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import {
  attractLoops,
  hubSong,
  soundDeclarations,
  sweetSamTunes,
  titleSong,
  tuneSeconds,
  type Note,
} from "../src/ui/sounds.ts";
import { checkNames, render, soundTable, tablePath, wavPath } from "./gen-ui-sounds.ts";

const length = (notes: readonly Note[]): number => notes.reduce((t, [, len]) => t + len, 0);

describe("UI sound source", () => {
  test("the hub song's voices are the same length, so the loop lines up", () => {
    expect(length(hubSong.bass)).toBe(length(hubSong.melody));
    expect(length(hubSong.arpeggio)).toBe(length(hubSong.melody));
  });

  test("every attract loop is four bars of eighths", () => {
    for (const loop of Object.values(attractLoops)) expect(length(loop.notes)).toBe(32);
  });

  test("Sweet Sam's start, lost life and level clear each fit inside their 2 s wait", () => {
    for (const t of [sweetSamTunes.start, sweetSamTunes.death, sweetSamTunes.clear]) {
      expect(tuneSeconds(t)).toBeLessThanOrEqual(2);
    }
  });

  test("the title music's voices are the same length, so the loop lines up", () => {
    expect(length(titleSong.bass)).toBe(length(titleSong.melody));
    expect(length(titleSong.arpeggio)).toBe(length(titleSong.melody));
  });
});

describe("sound names", () => {
  test("each is a camelCase identifier, used once", () => {
    const sound = soundDeclarations[0];
    if (sound === undefined) throw new Error("no sounds declared");
    expect(() => {
      checkNames(soundDeclarations);
    }).not.toThrow();
    expect(() => {
      checkNames([sound, sound]);
    }).toThrow(`sound ${sound.name} is declared twice`);
    expect(() => {
      checkNames([{ ...sound, name: "life-lost" }]);
    }).toThrow('sound name "life-lost" is not camelCase');
  });
});

describe("committed sounds match src/ui/sounds.ts (run `bun run sounds` after editing it)", () => {
  const generated: readonly (readonly [name: string, path: string, generate: () => Buffer | Promise<Buffer>])[] = [
    ...soundDeclarations.map(
      (sound) => [basename(wavPath(sound)), wavPath(sound), () => render(sound.source)] as const,
    ),
    [basename(tablePath), tablePath, async () => Buffer.from(await soundTable())],
  ];
  test.each(generated)("%s", async (_name, path, generate) => {
    expect(Buffer.compare(readFileSync(path), await generate())).toBe(0);
  });
});
