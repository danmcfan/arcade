/** Returns `value`, failing the test if it is `undefined` or `null`. A guard in place of `!`. */
export function defined<T>(value: T | undefined | null, what = "value"): T {
  if (value === undefined || value === null) throw new Error(`expected ${what} to be defined`);
  return value;
}
