// A prize as its minigame declares it (#272): what the prize counter says
// about it and which of the minigame's advantages owning it changes. Each
// minigame lists its own prizes beside its advantages; the hub's catalogue
// (src/arcade/prizes.ts) is derived from those lists and adds where each
// prize hangs on the wall.

/** A prize in a minigame whose advantages are `A`. */
export interface PrizeSpec<A> {
  /** Stored in save files, so it never changes. */
  readonly id: string;
  /** Player-facing name, as the prize counter menu shows it. */
  readonly name: string;
  /** Tickets it costs. */
  readonly price: number;
  /** What it does, as the prize counter's info panel says it. */
  readonly effect: string;
  /** The one advantage owning it changes. */
  readonly advantage: keyof A & string;
  /** That advantage's value with the prize, given its value without. */
  give(value: number): number;
}

/** The advantages `owned` prizes give, starting from `none`; prizes not in `prizes` do nothing. */
export function advantagesFrom<A extends { [K in keyof A]: number }>(
  none: Readonly<A>,
  prizes: readonly PrizeSpec<A>[],
  owned: readonly string[],
): A {
  const a: A = { ...none };
  for (const p of prizes) {
    if (owned.includes(p.id)) Object.assign(a, { [p.advantage]: p.give(a[p.advantage]) });
  }
  return a;
}
