// The one blink rule for every blinking prompt.

/** Ticks in one blink cycle: 2 s at 60 ticks a second. */
const blinkPeriod = 120;
/** Ticks of each cycle the prompt shows. */
const blinkShown = 90;

/** Whether a blinking prompt shows on `tick`. */
export function blinkOn(tick: number): boolean {
  return tick % blinkPeriod < blinkShown;
}
