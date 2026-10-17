// Chiptune source for every sound: the title music, the hub song, the
// cabinets' attract loops, the menu sounds and the minigames' sounds. Notes are
// MIDI numbers (69 = A4), lengths are in eighth notes. Each sound is declared
// once, next to its notes, with `defineSound`. scripts/gen-ui-sounds.ts
// synthesises them into the WAVs in src/assets/sounds/ and writes
// src/engine/sounds.generated.ts; the runtime only plays the WAVs.

/** Samples per second of every generated sound. */
export const sampleRate = 22050;

/** A note (or a rest, `null`) held for `len` eighth notes. */
export type Note = readonly [midi: number | null, len: number];

/**
 * A sound's Channel: `minigame` sounds stop when the minigame pause menu
 * opens (Resume restarts the ones that were playing); `arcade` sounds play on.
 */
export type Channel = "minigame" | "arcade";

/** What `bun run sounds` synthesises a sound from. */
export type SoundSource =
  { song: Song } | { tune: Tune } | { effect: Effect } | { blip: readonly Note[] } | { screenOn: ScreenOnSound };

/** One sound, as `defineSound` declared it. */
export interface SoundDeclaration {
  /** camelCase; its WAV is src/assets/sounds/<kebab-case name>.wav. */
  readonly name: string;
  readonly source: SoundSource;
  readonly channel: Channel;
  /** Loops (the songs and attract loops) or plays once. */
  readonly loop: boolean;
  /** 0 to 1: how loud the browser plays it. */
  readonly volume: number;
}

const declarations: SoundDeclaration[] = [];

/** Every sound `defineSound` declared, in order. */
export const soundDeclarations: readonly SoundDeclaration[] = declarations;

/**
 * Declare a sound: `bun run sounds` renders `source` to its WAV and adds it
 * to src/engine/sounds.generated.ts as `sounds[name]`.
 */
function defineSound(
  name: string,
  source: SoundSource,
  opts: { channel: Channel; loop?: boolean; volume?: number },
): void {
  declarations.push({ name, source, channel: opts.channel, loop: opts.loop ?? false, volume: opts.volume ?? 1 });
}

/** Am – F – C – G, twice: the bass plays the root in octaves on every eighth. */
const roots = [45, 41, 48, 43, 45, 41, 48, 43] as const;
const bass: readonly Note[] = roots.flatMap((r) =>
  Array.from({ length: 8 }, (_, i): Note => [i % 2 === 0 ? r : r + 12, 1]),
);

/** A broken chord over each bar. */
const chords = [
  [69, 72, 76, 81],
  [65, 69, 72, 77],
  [67, 72, 76, 79],
  [67, 71, 74, 79],
] as const;
const arpeggio: readonly Note[] = [...chords, ...chords].flatMap(([a, b, c, d]) =>
  [a, b, c, b, a, b, c, d].map((n): Note => [n, 1]),
);

const melody: readonly Note[] = [
  [76, 4],
  [74, 2],
  [72, 2],
  [72, 4],
  [69, 4],
  [67, 2],
  [72, 2],
  [76, 2],
  [79, 2],
  [77, 4],
  [74, 4],
  [76, 2],
  [81, 2],
  [79, 2],
  [76, 2],
  [77, 4],
  [72, 4],
  [76, 2],
  [74, 2],
  [72, 2],
  [76, 2],
  [74, 6],
  [71, 2],
];

/** The title music: 140 bpm. */
export const titleSong: Song = { eighthsPerMinute: 280, bass, arpeggio, melody, hats: 0.05 };
defineSound("title", { song: titleSong }, { channel: "arcade", loop: true });

/** Cursor moved: one short square-wave blip. */
defineSound("move", { blip: [[84, 1]] }, { channel: "arcade" });
/** Choice made: a quick rising pair. */
defineSound(
  "select",
  {
    blip: [
      [79, 1],
      [91, 2],
    ],
  },
  { channel: "arcade" },
);
/** One ticket paid out: a short bright two-note ding. */
defineSound(
  "ticket",
  {
    blip: [
      [88, 1],
      [93, 1],
    ],
  },
  { channel: "arcade" },
);
/** A choice that can't be made (a token the player can't afford): a low falling pair. */
defineSound(
  "deny",
  {
    blip: [
      [50, 2],
      [45, 3],
    ],
  },
  { channel: "arcade" },
);
/**
 * Firefly's sounds: the notes and the length of one eighth, in seconds.
 * `bun run sounds` writes each as a square-wave chiptune WAV.
 */
export interface Effect {
  notes: readonly Note[];
  eighth: number;
}

/** Length of one eighth note in the menu sounds, in seconds. */
export const blipEighth = 0.035;

/** A song: three voices of equal length that loop, and the hi-hat's level. */
export interface Song {
  /** Tempo, in eighth notes per minute. */
  eighthsPerMinute: number;
  bass: readonly Note[];
  arpeggio: readonly Note[];
  melody: readonly Note[];
  hats: number;
}

/** Each bar's chord broken into eighths, playing its notes in `pattern`'s order. */
function broken(bars: readonly Chord[], pattern: readonly (0 | 1 | 2 | 3)[]): Note[] {
  return bars.flatMap((chord) => pattern.map((i): Note => [chord[i], 1]));
}

/** Four notes of a chord, low to high. */
type Chord = readonly [number, number, number, number];

/** Dm7 – G7 – Cmaj7 – A7. */
const loungeChords: readonly Chord[] = [
  [62, 65, 69, 72],
  [59, 62, 65, 67],
  [60, 64, 67, 71],
  [61, 64, 67, 69],
];

/** A walking bass: root, fifth, seventh, fifth in each bar. */
const loungeBass: readonly Note[] = [
  [38, 2],
  [45, 2],
  [48, 2],
  [45, 2],
  [43, 2],
  [50, 2],
  [53, 2],
  [50, 2],
  [36, 2],
  [43, 2],
  [47, 2],
  [43, 2],
  [45, 2],
  [52, 2],
  [55, 2],
  [49, 2],
];

/**
 * The hub song, "Neon Lounge": 104 bpm and laid back, a walking bass under a
 * soft arpeggio and a lazy lead. It loops, quietly, the whole time the player
 * is in the hub.
 */
export const hubSong: Song = {
  eighthsPerMinute: 208,
  bass: [...loungeBass, ...loungeBass],
  arpeggio: broken([...loungeChords, ...loungeChords], [0, 1, 2, 3, 2, 1, 0, 1]),
  melody: [
    [69, 3],
    [72, 1],
    [74, 2],
    [72, 2],
    [71, 4],
    [67, 2],
    [65, 2],
    [64, 2],
    [67, 2],
    [71, 3],
    [72, 1],
    [73, 6],
    [null, 2],
    [74, 3],
    [72, 1],
    [69, 2],
    [65, 2],
    [67, 2],
    [71, 2],
    [74, 2],
    [77, 2],
    [76, 4],
    [74, 2],
    [71, 2],
    [69, 6],
    [null, 2],
  ],
  hats: 0.03,
};
defineSound("hub", { song: hubSong }, { channel: "arcade", loop: true, volume: 0.3 });

/** A short single-voice tune: its notes, the length of an eighth in seconds, and its wave. */
export interface Tune {
  notes: readonly Note[];
  eighth: number;
  wave: "square" | "triangle";
}

/**
 * What a cabinet plays, quietly, while the player faces it: a few bleeps of
 * its game and a long rest, looped.
 */
export const attractLoops = {
  /** Brass Monkey: climbing the girders. */
  brassMonkey: {
    notes: [
      [60, 1],
      [64, 1],
      [67, 1],
      [72, 1],
      [null, 4],
      [67, 1],
      [72, 1],
      [76, 2],
      [null, 20],
    ],
    eighth: 0.1,
    wave: "square",
  },
  /** Sweet Sam: a bee's buzzing trill, then honey. */
  sweet: {
    notes: [
      [76, 1],
      [77, 1],
      [76, 1],
      [77, 1],
      [76, 1],
      [77, 1],
      [null, 2],
      [81, 2],
      [79, 2],
      [null, 20],
    ],
    eighth: 0.1,
    wave: "square",
  },
  /** Firefly: sparks winking on in the dark. */
  firefly: {
    notes: [
      [84, 1],
      [null, 3],
      [91, 1],
      [null, 5],
      [88, 1],
      [null, 3],
      [96, 1],
      [null, 17],
    ],
    eighth: 0.1,
    wave: "triangle",
  },
} as const satisfies Record<string, Tune>;
for (const [name, tune] of Object.entries(attractLoops)) {
  defineSound(`attract${capitalized(name)}`, { tune }, { channel: "arcade", loop: true, volume: 0.35 });
}

/** A cabinet screen switching on: a low thunk (eighths of `thunkEighth` s), then the tube's whine rising (Hz). */
export interface ScreenOnSound {
  thunk: readonly Note[];
  thunkEighth: number;
  seconds: number;
  whineFrom: number;
  whineTo: number;
  whineGain: number;
}

defineSound(
  "screenOn",
  {
    screenOn: {
      thunk: [[33, 1]],
      thunkEighth: 0.05,
      seconds: 0.35,
      whineFrom: 2000,
      whineTo: 5000,
      whineGain: 0.03,
    },
  },
  { channel: "arcade", volume: 0.5 },
);

/**
 * Sweet Sam's sounds (#47), each played once. The start jingle fits inside
 * READY (2 s), the lost life inside the death wait (2 s) and the level clear
 * inside its flash (2 s). The chomp alternates its two notes, one per honey
 * drop.
 */
export const sweetSamTunes = {
  /** A round starts: a bouncy bear's march up to honey. */
  start: {
    notes: [
      [72, 1],
      [76, 1],
      [79, 1],
      [76, 1],
      [74, 1],
      [77, 1],
      [81, 1],
      [77, 1],
      [76, 1],
      [79, 1],
      [84, 2],
      [83, 1],
      [79, 1],
      [84, 2],
    ],
    eighth: 0.11,
    wave: "square",
  },
  /** A honey drop eaten, the first of the pair. */
  chompHigh: { notes: [[67, 1]], eighth: 0.045, wave: "triangle" },
  /** A honey drop eaten, the second of the pair. */
  chompLow: { notes: [[60, 1]], eighth: 0.045, wave: "triangle" },
  /** A smoke pot: a falling puff. */
  smoke: {
    notes: [
      [84, 1],
      [79, 1],
      [76, 1],
      [72, 1],
      [67, 2],
    ],
    eighth: 0.04,
    wave: "square",
  },
  /** A sleepy bee eaten: a quick climb. */
  bee: {
    notes: [
      [72, 1],
      [79, 1],
      [84, 1],
      [91, 2],
    ],
    eighth: 0.045,
    wave: "square",
  },
  /** The bonus flower: a sparkle. */
  flower: {
    notes: [
      [84, 1],
      [88, 1],
      [91, 1],
      [96, 1],
      [91, 1],
      [96, 3],
    ],
    eighth: 0.05,
    wave: "square",
  },
  /** A life lost: a slow slide down, then a bump. */
  death: {
    notes: [
      [76, 2],
      [75, 2],
      [74, 2],
      [73, 2],
      [72, 2],
      [71, 2],
      [70, 2],
      [69, 2],
      [null, 1],
      [57, 1],
      [52, 3],
    ],
    eighth: 0.075,
    wave: "square",
  },
  /** A level cleared: a fanfare. */
  clear: {
    notes: [
      [72, 1],
      [76, 1],
      [79, 1],
      [84, 3],
      [79, 1],
      [84, 5],
    ],
    eighth: 0.1,
    wave: "square",
  },
} as const satisfies Record<string, Tune>;
for (const [name, tune] of Object.entries(sweetSamTunes)) {
  defineSound(`sweet${capitalized(name)}`, { tune }, { channel: "minigame" });
}

/** Firefly's sounds. */
const fireflyEffects = {
  /** The firefly shoots a spark: a quick chirp up. */
  spark: {
    notes: [
      [84, 1],
      [91, 1],
      [96, 1],
    ],
    eighth: 0.02,
  },
  /** A spark hits an enemy: a short crunch falling away. */
  hit: {
    notes: [
      [64, 1],
      [57, 1],
      [52, 1],
      [45, 2],
    ],
    eighth: 0.03,
  },
  /** The firefly is eaten or shot: a long slide down. */
  lifeLost: {
    notes: [
      [76, 2],
      [72, 2],
      [69, 2],
      [64, 2],
      [60, 2],
      [57, 2],
      [52, 4],
    ],
    eighth: 0.06,
  },
  /** The Owl's tractor beam: a wobbling hum up and down. */
  beam: {
    notes: [
      [60, 1],
      [67, 1],
      [72, 1],
      [67, 1],
      [60, 1],
      [67, 1],
      [72, 1],
      [67, 1],
    ],
    eighth: 0.08,
  },
  /** The beam takes the firefly: a slide up into the Owl. */
  capture: {
    notes: [
      [60, 2],
      [64, 2],
      [67, 2],
      [72, 2],
      [76, 2],
      [79, 4],
    ],
    eighth: 0.06,
  },
  /** A captive set free: a bright run up and a trill as it docks beside the firefly. */
  rescue: {
    notes: [
      [67, 1],
      [72, 1],
      [76, 1],
      [79, 1],
      [84, 2],
      [79, 1],
      [84, 1],
      [79, 1],
      [84, 3],
    ],
    eighth: 0.07,
  },
  /** STAGE n: a little fanfare. */
  stage: {
    notes: [
      [72, 1],
      [76, 1],
      [79, 1],
      [84, 2],
      [null, 1],
      [79, 1],
      [84, 4],
    ],
    eighth: 0.09,
  },
} as const satisfies Record<string, Effect>;
for (const [name, effect] of Object.entries(fireflyEffects)) defineSound(name, { effect }, { channel: "minigame" });

/** Seconds a tune lasts. */
export function tuneSeconds(t: Tune): number {
  return t.notes.reduce((sum, [, len]) => sum + len, 0) * t.eighth;
}

/**
 * Brass Monkey's sound effects (#39), `monkey<Name>` each. They play on when
 * the minigame pause menu opens, as they always have.
 */
const brassMonkeyJingles = {
  /** A jump: a quick upward slide. */
  jump: {
    notes: [
      [67, 1],
      [72, 1],
      [79, 1],
    ],
    eighth: 0.03,
  },
  /** A bolt collected: a bright metallic ping. */
  bolt: {
    notes: [
      [96, 1],
      [91, 1],
      [96, 2],
    ],
    eighth: 0.03,
  },
  /** A hazard jumped over: a little two-note cheer. */
  hazard: {
    notes: [
      [76, 1],
      [84, 2],
    ],
    eighth: 0.04,
  },
  /** A life lost: a falling chromatic run down to a low thud. */
  death: {
    notes: [
      [72, 1],
      [71, 1],
      [70, 1],
      [69, 1],
      [68, 1],
      [67, 1],
      [55, 1],
      [43, 4],
    ],
    eighth: 0.06,
  },
  /** A floor finished: a rising major arpeggio. */
  floor: {
    notes: [
      [60, 1],
      [64, 1],
      [67, 1],
      [72, 1],
      [76, 1],
      [79, 1],
      [84, 4],
    ],
    eighth: 0.07,
  },
  /** The escape: the attract loop's tune played out in full into the daylight. */
  escape: {
    notes: [
      [60, 1],
      [64, 1],
      [67, 1],
      [72, 2],
      [67, 1],
      [72, 1],
      [76, 2],
      [74, 1],
      [76, 1],
      [79, 2],
      [84, 6],
    ],
    eighth: 0.12,
  },
} as const satisfies Record<string, Effect>;
for (const [name, effect] of Object.entries(brassMonkeyJingles)) {
  defineSound(`monkey${capitalized(name)}`, { effect }, { channel: "arcade" });
}

function capitalized(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
