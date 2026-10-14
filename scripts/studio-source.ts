// Write rows back into an art source (`bun run studio`'s save): find one
// export's array literal, or one entry of it, and replace only that span, so
// every other byte of the file stays as it was.

import type { Rows } from "./pixel-art.ts";

/** Rows, or a list of frames of rows. */
export type RowsValue = Rows | readonly Rows[];

const printWidth = 120;

/** The index just past the string literal that opens at `i`. */
function skipString(src: string, i: number): number {
  const quote = src[i];
  let j = i + 1;
  while (j < src.length && src[j] !== quote) j += src[j] === "\\" ? 2 : 1;
  if (j >= src.length) throw new Error(`unterminated string at ${i}`);
  return j + 1;
}

/** The index just past the comment that opens at `i`, or `i` when none does. */
function skipComment(src: string, i: number): number {
  if (src.startsWith("//", i)) {
    const end = src.indexOf("\n", i);
    return end < 0 ? src.length : end;
  }
  if (src.startsWith("/*", i)) {
    const end = src.indexOf("*/", i + 2);
    if (end < 0) throw new Error(`unterminated comment at ${i}`);
    return end + 2;
  }
  return i;
}

/** The index just past the bracketed literal that opens at `open`. */
function matchClose(src: string, open: number): number {
  let depth = 0;
  let i = open;
  while (i < src.length) {
    const ch = src[i] ?? "";
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipString(src, i);
      continue;
    }
    const after = skipComment(src, i);
    if (after !== i) {
      i = after;
      continue;
    }
    if (ch === "[" || ch === "{" || ch === "(") depth++;
    if (ch === "]" || ch === "}" || ch === ")") {
      depth--;
      if (depth === 0) return i + 1;
    }
    i++;
  }
  throw new Error(`unclosed bracket at ${open}`);
}

/** The index of the first non-space, non-comment character from `i`. */
function skipBlank(src: string, i: number): number {
  let j = i;
  for (;;) {
    while (/\s/u.test(src[j] ?? "")) j++;
    const after = skipComment(src, j);
    if (after === j) return j;
    j = after;
  }
}

/** The [start, end) span of the value of `key:` directly inside the object literal at `open`. */
function entrySpan(src: string, open: number, key: string): [number, number] | undefined {
  const close = matchClose(src, open) - 1;
  let i = skipBlank(src, open + 1);
  while (i < close) {
    const name = /^(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(\w+))\s*:\s*/u.exec(src.slice(i));
    if (!name) return undefined;
    const start = i + name[0].length;
    let end = start;
    // The value runs to the next comma at this depth.
    while (end < close && src[end] !== ",") {
      const ch = src[end] ?? "";
      if (ch === '"' || ch === "'" || ch === "`") end = skipString(src, end);
      else if (ch === "[" || ch === "{" || ch === "(") end = matchClose(src, end);
      else end = Math.max(end + 1, skipComment(src, end));
    }
    if ((name[1] ?? name[2] ?? name[3]) === key) return [start, src.slice(start, end).trimEnd().length + start];
    i = skipBlank(src, end + 1);
  }
  return undefined;
}

/** Only brackets, commas, string literals, spaces and comments: rows written out, not computed. */
function isRowsLiteral(text: string): boolean {
  if (!text.startsWith("[")) return false;
  let i = 0;
  while (i < text.length) {
    const ch = text[i] ?? "";
    if (ch === '"' || ch === "'") i = skipString(text, i);
    else if (skipComment(text, i) !== i) i = skipComment(text, i);
    else if (/[[\],\s]/u.test(ch)) i++;
    else return false;
  }
  return true;
}

function isFrames(value: RowsValue): value is readonly Rows[] {
  return value.some((v) => typeof v !== "string");
}

/** `value` as Prettier prints it, starting at column `column` of a line indented `indent`. */
function format(value: RowsValue, indent: number, column: number): string {
  const pad = " ".repeat(indent);
  if (isFrames(value)) {
    const items = value.map((rows) => format(rows, indent + 2, indent + 2));
    const flat = `[${items.join(", ")}]`;
    // Prettier breaks a list of two or more arrays that each hold more than one item.
    const mustBreak = value.length > 1 && value.every((rows) => rows.length > 1);
    if (!mustBreak && !flat.includes("\n") && column + flat.length + 1 <= printWidth) return flat;
    return `[\n${items.map((s) => `${pad}  ${s},\n`).join("")}${pad}]`;
  }
  const items = value.map((row) => JSON.stringify(row));
  const flat = `[${items.join(", ")}]`;
  if (column + flat.length + 1 <= printWidth) return flat;
  return `[\n${items.map((s) => `${pad}  ${s},\n`).join("")}${pad}]`;
}

/**
 * `source` with export `name` (its entry `key` when given) replaced by
 * `value`. Throws when the export or entry is missing, or is not written out
 * as rows (a call such as `mirrorX(...)` cannot be saved into).
 */
export function writeRows(source: string, name: string, key: string | undefined, value: RowsValue): string {
  const head = new RegExp(`^export const ${name}\\b[^=]*=\\s*`, "mu").exec(source);
  if (!head) throw new Error(`the source has no export "${name}"`);
  let start = head.index + head[0].length;
  let end: number;
  if (key === undefined) {
    if (source[start] !== "[") throw new Error(`${name} is not a literal of rows`);
    end = matchClose(source, start);
  } else {
    if (source[start] !== "{") throw new Error(`${name} is not a literal record`);
    const span = entrySpan(source, start, key);
    if (span === undefined) throw new Error(`${name} has no entry "${key}"`);
    [start, end] = span;
  }
  const label = key === undefined ? name : `${name}.${key}`;
  if (!isRowsLiteral(source.slice(start, end))) throw new Error(`${label} is not a literal of rows`);
  const lineStart = source.lastIndexOf("\n", start) + 1;
  const indent = /^ */u.exec(source.slice(lineStart))?.[0].length ?? 0;
  return source.slice(0, start) + format(value, indent, start - lineStart) + source.slice(end);
}
