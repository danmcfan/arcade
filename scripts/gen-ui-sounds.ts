// Synthesise the title music and menu sounds from src/ui/sounds.ts:
//
//   bun run sounds   # writes src/assets/sounds/title.wav, move.wav, select.wav, ticket.wav, deny.wav
//
// Square-wave lead and arpeggio over a triangle bass, with a soft noise
// hi-hat on the off-beats. Output is 8-bit mono PCM to keep the files small.
// gen-ui-sounds.test.ts fails when the committed WAVs no longer match the
// source.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  arpeggio,
  bass,
  blipEighth,
  denyBuzz,
  eighthsPerMinute,
  melody,
  moveBlip,
  sampleRate,
  selectChirp,
  ticketDing,
  type Note,
} from "../src/ui/sounds.ts";
import { repoRoot } from "../test/parity/fixtures.ts";

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

export function renderTitle(): Buffer {
  const eighth = 60 / eighthsPerMinute;
  const out = new Float64Array(Math.round(eighths(melody) * eighth * sampleRate));
  voice(out, bass, eighth, triangle, 0.3, 0.8);
  voice(out, arpeggio, eighth, square(0.125), 0.07, 0.3);
  voice(out, melody, eighth, square(0.25), 0.14, 0.6);
  hats(out, eighth, 0.05);
  return wav(out);
}

function blip(notes: readonly Note[]): Buffer {
  const out = new Float64Array(Math.round(eighths(notes) * blipEighth * sampleRate));
  voice(out, notes, blipEighth, square(0.5), 0.25, 0.5);
  return wav(out);
}

export const renderMove = (): Buffer => blip(moveBlip);
export const renderSelect = (): Buffer => blip(selectChirp);
export const renderTicket = (): Buffer => blip(ticketDing);
export const renderDeny = (): Buffer => blip(denyBuzz);

const dir = join(repoRoot, "src/assets/sounds");
export const titlePath = join(dir, "title.wav");
export const movePath = join(dir, "move.wav");
export const selectPath = join(dir, "select.wav");
export const ticketPath = join(dir, "ticket.wav");
export const denyPath = join(dir, "deny.wav");

if (import.meta.main) {
  for (const [path, render] of [
    [titlePath, renderTitle],
    [movePath, renderMove],
    [selectPath, renderSelect],
    [ticketPath, renderTicket],
    [denyPath, renderDeny],
  ] as const) {
    const data = render();
    writeFileSync(path, data);
    console.log(`wrote ${path} (${data.length} bytes)`);
  }
}
