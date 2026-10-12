// Chiptune source for the title music and the menu sounds. Notes are MIDI
// numbers (69 = A4), lengths are in eighth notes. scripts/gen-ui-sounds.ts
// synthesises these into src/assets/sounds/title.wav, move.wav,
// select.wav, ticket.wav and deny.wav; the runtime only plays the WAVs.

/** Samples per second of every generated sound. */
export const sampleRate = 22050;

/** Title music tempo: eighth notes per minute (140 bpm). */
export const eighthsPerMinute = 280;

/** A note (or a rest, `null`) held for `len` eighth notes. */
export type Note = readonly [midi: number | null, len: number];

/** Am – F – C – G, twice: the bass plays the root in octaves on every eighth. */
const roots = [45, 41, 48, 43, 45, 41, 48, 43] as const;
export const bass: readonly Note[] = roots.flatMap((r) => Array.from({ length: 8 }, (_, i): Note => [i % 2 === 0 ? r : r + 12, 1]));

/** A broken chord over each bar. */
const chords = [
  [69, 72, 76, 81],
  [65, 69, 72, 77],
  [67, 72, 76, 79],
  [67, 71, 74, 79],
] as const;
export const arpeggio: readonly Note[] = [...chords, ...chords].flatMap(([a, b, c, d]) =>
  [a, b, c, b, a, b, c, d].map((n): Note => [n, 1]),
);

export const melody: readonly Note[] = [
  [76, 4], [74, 2], [72, 2],
  [72, 4], [69, 4],
  [67, 2], [72, 2], [76, 2], [79, 2],
  [77, 4], [74, 4],
  [76, 2], [81, 2], [79, 2], [76, 2],
  [77, 4], [72, 4],
  [76, 2], [74, 2], [72, 2], [76, 2],
  [74, 6], [71, 2],
];

/** Cursor moved: one short square-wave blip. */
export const moveBlip: readonly Note[] = [[84, 1]];
/** Choice made: a quick rising pair. */
export const selectChirp: readonly Note[] = [[79, 1], [91, 2]];
/** One ticket paid out: a short bright two-note ding. */
export const ticketDing: readonly Note[] = [[88, 1], [93, 1]];
/** A choice that can't be made (a token the player can't afford): a low falling pair. */
export const denyBuzz: readonly Note[] = [[50, 2], [45, 3]];
/** Length of one eighth note in the menu sounds, in seconds. */
export const blipEighth = 0.035;
