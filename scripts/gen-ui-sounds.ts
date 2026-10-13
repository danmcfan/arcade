// Synthesise the title music, the hub song, the cabinets' attract loops, the
// menu sounds and Firefly's sounds from src/ui/sounds.ts:
//
//   bun run sounds   # writes title.wav, hub.wav, attract-*.wav, screen-on.wav, move.wav, select.wav, ticket.wav, deny.wav,
//                    spark.wav, hit.wav, life-lost.wav, stage.wav, monkey-*.wav
//
// Songs are a square-wave lead and arpeggio over a triangle bass, with a soft
// noise hi-hat on the off-beats. Output is 8-bit mono PCM to keep the files small.
// gen-ui-sounds.test.ts fails when the committed WAVs no longer match the
// source.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  arpeggio,
  attractLoops,
  bass,
  blipEighth,
  brassMonkeyJingles,
  denyBuzz,
  eighthsPerMinute,
  fireflyEffects,
  hubSong,
  melody,
  moveBlip,
  sampleRate,
  screenOn,
  selectChirp,
  ticketDing,
  type Attract,
  type Effect,
  type Note,
  type Song,
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

function renderSong(song: Song): Buffer {
  const eighth = 60 / song.eighthsPerMinute;
  const out = new Float64Array(Math.round(eighths(song.melody) * eighth * sampleRate));
  voice(out, song.bass, eighth, triangle, 0.3, 0.8);
  voice(out, song.arpeggio, eighth, square(0.125), 0.07, 0.3);
  voice(out, song.melody, eighth, square(0.25), 0.14, 0.6);
  hats(out, eighth, song.hats);
  return wav(out);
}

export const renderTitle = (): Buffer => renderSong({ eighthsPerMinute, bass, arpeggio, melody, hats: 0.05 });
export const renderHub = (): Buffer => renderSong(hubSong);

function renderAttract(loop: Attract): Buffer {
  const out = new Float64Array(Math.round(eighths(loop.notes) * loop.eighth * sampleRate));
  if (loop.wave === "square") voice(out, loop.notes, loop.eighth, square(0.25), 0.2, 0.4);
  else voice(out, loop.notes, loop.eighth, triangle, 0.3, 0.4);
  return wav(out);
}

export const renderAttractBrassMonkey = (): Buffer => renderAttract(attractLoops.brassMonkey);
export const renderAttractSweet = (): Buffer => renderAttract(attractLoops.sweet);
export const renderAttractFirefly = (): Buffer => renderAttract(attractLoops.firefly);

/** The thunk, then a sine whine sweeping up that swells in and dies away. */
export function renderScreenOn(): Buffer {
  const s = screenOn;
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

export const renderSpark = (): Buffer => effect(fireflyEffects.spark);
export const renderHit = (): Buffer => effect(fireflyEffects.hit);
export const renderLifeLost = (): Buffer => effect(fireflyEffects.lifeLost);
export const renderStage = (): Buffer => effect(fireflyEffects.stage);

export const renderMove = (): Buffer => blip(moveBlip);
export const renderSelect = (): Buffer => blip(selectChirp);
export const renderTicket = (): Buffer => blip(ticketDing);
export const renderDeny = (): Buffer => blip(denyBuzz);

const dir = join(repoRoot, "src/assets/sounds");

/** Brass Monkey's sound effects: where each is written and how to render it. */
export const brassMonkeySoundFiles: readonly { path: string; render: () => Buffer }[] = Object.entries(
  brassMonkeyJingles,
).map(([name, jingle]) => ({ path: join(dir, `monkey-${name}.wav`), render: () => effect(jingle) }));
export const titlePath = join(dir, "title.wav");
export const hubPath = join(dir, "hub.wav");
export const screenOnPath = join(dir, "screen-on.wav");
export const attractBrassMonkeyPath = join(dir, "attract-brass-monkey.wav");
export const attractSweetPath = join(dir, "attract-sweet.wav");
export const attractFireflyPath = join(dir, "attract-firefly.wav");
export const movePath = join(dir, "move.wav");
export const selectPath = join(dir, "select.wav");
export const ticketPath = join(dir, "ticket.wav");
export const denyPath = join(dir, "deny.wav");
export const sparkPath = join(dir, "spark.wav");
export const hitPath = join(dir, "hit.wav");
export const lifeLostPath = join(dir, "life-lost.wav");
export const stagePath = join(dir, "stage.wav");

if (import.meta.main) {
  for (const [path, render] of [
    [titlePath, renderTitle],
    [hubPath, renderHub],
    [screenOnPath, renderScreenOn],
    [attractBrassMonkeyPath, renderAttractBrassMonkey],
    [attractSweetPath, renderAttractSweet],
    [attractFireflyPath, renderAttractFirefly],
    [movePath, renderMove],
    [selectPath, renderSelect],
    [ticketPath, renderTicket],
    [denyPath, renderDeny],
    [sparkPath, renderSpark],
    [hitPath, renderHit],
    [lifeLostPath, renderLifeLost],
    [stagePath, renderStage],
    ...brassMonkeySoundFiles.map((f) => [f.path, f.render] as const),
  ] as const) {
    const data = render();
    writeFileSync(path, data);
    console.log(`wrote ${path} (${data.length} bytes)`);
  }
}
