// Synthesise every sound declared with `defineSound` in src/ui/sounds.ts, and
// write the sound table the game imports:
//
//   bun run sounds   # writes src/assets/sounds/<name>.wav for each sound, and src/engine/sounds.generated.ts
//
// Songs are a square-wave lead and arpeggio over a triangle bass, with a soft
// noise hi-hat on the off-beats. Output is 8-bit mono PCM to keep the files small.
// gen-ui-sounds.test.ts fails when the committed WAVs or the sound table no
// longer match the source.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { format, resolveConfig } from "prettier";
import {
  blipEighth,
  sampleRate,
  soundDeclarations,
  type Channel,
  type Effect,
  type Note,
  type ScreenOnSound,
  type Song,
  type SoundDeclaration,
  type SoundSource,
  type Tune,
} from "../src/ui/sounds.ts";
import { repoRoot } from "./repo-root.ts";

type Wave = (phase: number) => number;

const square =
  (duty: number): Wave =>
  (p) =>
    p % 1 < duty ? 1 : -1;
const triangle: Wave = (p) => 4 * Math.abs((p % 1) - 0.5) - 1;

function hz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Add `notes` into `out`: a fast attack, a decay to `sustain`, and a short release so nothing clicks. */
function voice(
  out: Float64Array,
  notes: readonly Note[],
  eighth: number,
  wave: Wave,
  gain: number,
  sustain: number,
): void {
  let start = 0;
  for (const [midi, len] of notes) {
    const n = Math.round(len * eighth * sampleRate);
    if (midi !== null) {
      const f = hz(midi);
      const attack = 0.004 * sampleRate;
      const decay = 0.08 * sampleRate;
      const release = Math.min(0.02 * sampleRate, n / 2);
      for (let i = 0; i < n && start + i < out.length; i++) {
        let env = i < attack ? i / attack : Math.max(sustain, 1 - ((1 - sustain) * (i - attack)) / decay);
        if (i > n - release) env *= (n - i) / release;
        mix(out, start + i, wave((f * i) / sampleRate) * env * gain);
      }
    }
    start += n;
  }
}

/** Adds `v` to sample `i`, which is inside `out`. */
function mix(out: Float64Array, i: number, v: number): void {
  out[i] = (out[i] ?? 0) + v;
}

/** A short burst of noise on every off-beat eighth. */
function hats(out: Float64Array, eighth: number, gain: number): void {
  let seed = 1;
  const n = Math.round(eighth * sampleRate);
  const len = Math.round(0.03 * sampleRate);
  for (let s = n; s < out.length; s += 2 * n) {
    for (let i = 0; i < len && s + i < out.length; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      mix(out, s + i, ((seed / 0x7fffffff) * 2 - 1) * (1 - i / len) * gain);
    }
  }
}

function eighths(notes: readonly Note[]): number {
  return notes.reduce((t, [, len]) => t + len, 0);
}

/** 8-bit unsigned mono WAV, `samples` in -1..1. */
export function wav(samples: Float64Array): Buffer {
  const b = Buffer.alloc(44 + samples.length);
  b.write("RIFF", 0);
  b.writeUInt32LE(36 + samples.length, 4);
  b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); // PCM
  b.writeUInt16LE(1, 22); // mono
  b.writeUInt32LE(sampleRate, 24);
  b.writeUInt32LE(sampleRate, 28); // bytes per second
  b.writeUInt16LE(1, 32); // block align
  b.writeUInt16LE(8, 34); // bits per sample
  b.write("data", 36);
  b.writeUInt32LE(samples.length, 40);
  samples.forEach((s, i) => {
    b.writeUInt8(Math.round(128 + 127 * Math.max(-1, Math.min(1, s))), 44 + i);
  });
  return b;
}

function renderSong(song: Song): Buffer {
  const eighth = 60 / song.eighthsPerMinute;
  const out = new Float64Array(Math.round(eighths(song.melody) * eighth * sampleRate));
  voice(out, song.bass, eighth, triangle, 0.3, 0.8);
  voice(out, song.arpeggio, eighth, square(0.125), 0.07, 0.3);
  voice(out, song.melody, eighth, square(0.25), 0.14, 0.6);
  hats(out, eighth, song.hats);
  return wav(out);
}

function renderTune(loop: Tune): Buffer {
  const out = new Float64Array(Math.round(eighths(loop.notes) * loop.eighth * sampleRate));
  if (loop.wave === "square") voice(out, loop.notes, loop.eighth, square(0.25), 0.2, 0.4);
  else voice(out, loop.notes, loop.eighth, triangle, 0.3, 0.4);
  return wav(out);
}

/** The thunk, then a sine whine sweeping up that swells in and dies away. */
function renderScreenOn(s: ScreenOnSound): Buffer {
  const out = new Float64Array(Math.round(s.seconds * sampleRate));
  voice(out, s.thunk, s.thunkEighth, square(0.5), 0.25, 0.3);
  for (let i = 0; i < out.length; i++) {
    const p = i / out.length;
    const f = s.whineFrom + (s.whineTo - s.whineFrom) * p;
    mix(out, i, Math.sin((2 * Math.PI * f * i) / sampleRate) * s.whineGain * Math.min(1, p * 4) * (1 - p));
  }
  return wav(out);
}

function blip(notes: readonly Note[]): Buffer {
  const out = new Float64Array(Math.round(eighths(notes) * blipEighth * sampleRate));
  voice(out, notes, blipEighth, square(0.5), 0.25, 0.5);
  return wav(out);
}

function effect({ notes, eighth }: Effect): Buffer {
  const out = new Float64Array(Math.round(eighths(notes) * eighth * sampleRate));
  voice(out, notes, eighth, square(0.5), 0.25, 0.5);
  return wav(out);
}

/** The WAV for `source`. */
export function render(source: SoundSource): Buffer {
  if ("song" in source) return renderSong(source.song);
  if ("tune" in source) return renderTune(source.tune);
  if ("effect" in source) return effect(source.effect);
  if ("blip" in source) return blip(source.blip);
  return renderScreenOn(source.screenOn);
}

function kebab(name: string): string {
  return name.replaceAll(/[A-Z]/gu, (c) => `-${c.toLowerCase()}`);
}

/** Where `sound`'s WAV is committed. */
export const wavPath = (sound: SoundDeclaration): string =>
  join(repoRoot, "src/assets/sounds", `${kebab(sound.name)}.wav`);

/** The sound table the game imports, written by `bun run sounds`. */
export const tablePath = join(repoRoot, "src/engine/sounds.generated.ts");

const channels: readonly Channel[] = ["minigame", "arcade"];

/** The sounds' names, each a camelCase identifier used once; throws naming the first that is not. */
export function checkNames(sounds: readonly SoundDeclaration[]): void {
  const seen = new Set<string>();
  for (const { name } of sounds) {
    if (!/^[a-z][A-Za-z0-9]*$/u.test(name)) throw new Error(`sound name ${JSON.stringify(name)} is not camelCase`);
    if (seen.has(name)) throw new Error(`sound ${name} is declared twice`);
    seen.add(name);
  }
}

/** src/engine/sounds.generated.ts for `sounds`, formatted as Prettier would. */
export async function soundTable(sounds: readonly SoundDeclaration[] = soundDeclarations): Promise<string> {
  checkNames(sounds);
  const lines = [
    "// Generated by `bun run sounds` (scripts/gen-ui-sounds.ts) from the `defineSound` calls in src/ui/sounds.ts.",
    "// Do not edit: declare or change a sound there and run `bun run sounds`.",
    "",
    'import type { Channel } from "../ui/sounds.ts";',
    "",
    ...sounds.map((s) => `import ${s.name}Url from "../assets/sounds/${kebab(s.name)}.wav";`),
    "",
    `export type SoundName = ${sounds.map((s) => JSON.stringify(s.name)).join(" | ")};`,
    "",
    "/** Every sound, made by `make` from its name, WAV URL, whether it loops and its volume (0 to 1). */",
    "export function soundTable<S>(make: (name: SoundName, url: string, loop: boolean, volume: number) => S): Record<SoundName, S> {",
    "  return {",
    ...sounds.map((s) => `    ${s.name}: make("${s.name}", ${s.name}Url, ${s.loop}, ${s.volume}),`),
    "  };",
    "}",
    "",
    "/** The sounds on each Channel. */",
    "export const channels: Readonly<Record<Channel, readonly SoundName[]>> = {",
    ...channels.map(
      (c) =>
        `  ${c}: [${sounds
          .filter((s) => s.channel === c)
          .map((s) => JSON.stringify(s.name))
          .join(", ")}],`,
    ),
    "};",
  ];
  return format(lines.join("\n"), { ...(await resolveConfig(tablePath)), filepath: tablePath });
}

if (import.meta.main) {
  for (const sound of soundDeclarations) {
    const data = render(sound.source);
    writeFileSync(wavPath(sound), data);
    console.log(`wrote ${wavPath(sound)} (${data.length} bytes)`);
  }
  writeFileSync(tablePath, await soundTable());
  console.log(`wrote ${tablePath}`);
}
