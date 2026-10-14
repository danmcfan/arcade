// The art studio page (`bun run studio`, served by scripts/studio.ts): draw on
// one export's rows with a Sweetie 16 palette, step through its frames, try
// the agent's variants and save the rows back into the source.

import type { RowsValue, StudioItem } from "./studio-source.ts";

/** One image: rows of letters, `.` blank, as mutable cells. */
type Grid = string[][];

interface Opened {
  value: RowsValue;
  glyph: boolean;
  variants: Record<string, RowsValue>;
}

type Tool = "pencil" | "eraser" | "fill" | "eyedropper";

const blank = ".";
const checkerDark = "#8c8c8c";
const checkerLight = "#a0a0a0";

function byId<T extends HTMLElement>(id: string, type: new () => T): T {
  const node = document.querySelector(`#${id}`);
  if (!(node instanceof type)) throw new Error(`#${id} is missing`);
  return node;
}

function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (ctx === null) throw new Error("no 2d context");
  return ctx;
}

const ui = {
  spec: byId("spec", HTMLInputElement),
  specs: byId("specs", HTMLDataListElement),
  open: byId("open", HTMLButtonElement),
  dirty: byId("dirty", HTMLSpanElement),
  undo: byId("undo", HTMLButtonElement),
  redo: byId("redo", HTMLButtonElement),
  save: byId("save", HTMLButtonElement),
  filter: byId("filter", HTMLInputElement),
  items: byId("items", HTMLDivElement),
  editor: byId("editor", HTMLCanvasElement),
  tools: byId("tools", HTMLDivElement),
  view: byId("view", HTMLDivElement),
  palette: byId("palette", HTMLDivElement),
  preview1: byId("preview1", HTMLCanvasElement),
  preview4: byId("preview4", HTMLCanvasElement),
  fps: byId("fps", HTMLInputElement),
  variants: byId("variants", HTMLDivElement),
  status: byId("status", HTMLDivElement),
  frames: byId("frames", HTMLElement),
};

interface State {
  spec: string;
  isFrames: boolean;
  glyph: boolean;
  frames: Grid[];
  current: number;
  tool: Tool;
  letter: string;
  ink: string;
  mirror: boolean;
  grid: boolean;
  onion: boolean;
  zoom: number;
  palette: Record<string, string>;
  undo: Grid[][];
  redo: Grid[][];
  /** The rows as last opened or saved, as JSON, for the dirty marker. */
  saved: string;
}

const state: State = {
  spec: "",
  isFrames: false,
  glyph: false,
  frames: [],
  current: 0,
  tool: "pencil",
  letter: "k",
  ink: "w",
  mirror: false,
  grid: true,
  onion: true,
  zoom: 16,
  palette: {},
  undo: [],
  redo: [],
  saved: "",
};

function isStrings(v: unknown): v is readonly string[] {
  return Array.isArray(v) && v.every((s) => typeof s === "string");
}

function toGrids(value: RowsValue): Grid[] {
  const frames = isStrings(value) ? [value] : value;
  return frames.map((rows) => rows.map((row) => row.split("")));
}

function toValue(): string[] | string[][] {
  const rows = state.frames.map((g) => g.map((r) => r.join("")));
  return state.isFrames ? rows : (rows[0] ?? []);
}

function frame(): Grid {
  const g = state.frames[state.current];
  if (g === undefined) throw new Error("no frame open");
  return g;
}

/** The CSS colour a cell's letter draws in, or undefined for blank. */
function colourOf(letter: string): string | undefined {
  if (letter === blank) return undefined;
  return state.palette[letter === "#" ? state.ink : letter];
}

function cloneFrames(): Grid[] {
  return state.frames.map((g) => g.map((r) => [...r]));
}

function markDirty(): void {
  const dirty = JSON.stringify(toValue()) !== state.saved;
  ui.dirty.textContent = dirty ? "● unsaved" : "";
  document.title = `${dirty ? "● " : ""}${state.spec || "Art studio"}`;
}

/** Remember the frames before an edit, for undo. */
function checkpoint(): void {
  state.undo.push(cloneFrames());
  state.redo = [];
}

function paintChecker(ctx: CanvasRenderingContext2D, w: number, h: number, cell: number): void {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? checkerDark : checkerLight;
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
}

function paintGrid(ctx: CanvasRenderingContext2D, g: Grid, cell: number, alpha = 1): void {
  ctx.globalAlpha = alpha;
  g.forEach((row, y) => {
    row.forEach((letter, x) => {
      const css = colourOf(letter);
      if (css === undefined) return;
      ctx.fillStyle = css;
      ctx.fillRect(x * cell, y * cell, cell, cell);
    });
  });
  ctx.globalAlpha = 1;
}

function size(g: Grid): { w: number; h: number } {
  return { w: g[0]?.length ?? 0, h: g.length };
}

function drawEditor(): void {
  const g = frame();
  const { w, h } = size(g);
  const z = state.zoom;
  ui.editor.width = w * z;
  ui.editor.height = h * z;
  const ctx = context(ui.editor);
  paintChecker(ctx, w, h, z);
  const prev = state.frames[state.current - 1];
  if (state.onion && prev !== undefined) paintGrid(ctx, prev, z, 0.3);
  paintGrid(ctx, g, z);
  if (state.grid && z >= 4) {
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    for (let x = 0; x <= w; x++) {
      ctx.moveTo(x * z + 0.5, 0);
      ctx.lineTo(x * z + 0.5, h * z);
    }
    for (let y = 0; y <= h; y++) {
      ctx.moveTo(0, y * z + 0.5);
      ctx.lineTo(w * z, y * z + 0.5);
    }
    ctx.stroke();
  }
}

function drawFrames(): void {
  ui.frames.replaceChildren(
    ...state.frames.map((g, i) => {
      const { w, h } = size(g);
      const c = document.createElement("canvas");
      c.width = w * 3;
      c.height = h * 3;
      c.className = i === state.current ? "frame on" : "frame";
      c.title = `frame ${i}`;
      paintGrid(context(c), g, 3);
      c.addEventListener("click", () => {
        state.current = i;
        render();
      });
      return c;
    }),
  );
}

function render(): void {
  if (state.frames.length === 0) return;
  drawEditor();
  drawFrames();
  markDirty();
}

function set(x: number, y: number, letter: string): void {
  const g = frame();
  const { w } = size(g);
  const row = g[y];
  if (row === undefined || x < 0 || x >= w) return;
  row[x] = letter;
  if (state.mirror) row[w - 1 - x] = letter;
}

function fill(x: number, y: number, letter: string): void {
  const g = frame();
  const from = g[y]?.[x];
  if (from === undefined || from === letter) return;
  const todo: [number, number][] = [[x, y]];
  for (let next = todo.pop(); next !== undefined; next = todo.pop()) {
    const [cx, cy] = next;
    if (g[cy]?.[cx] !== from) continue;
    set(cx, cy, letter);
    todo.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }
}

/** The letter the current tool paints. */
function drawLetter(): string {
  if (state.tool === "eraser") return blank;
  return state.glyph ? "#" : state.letter;
}

function cellAt(e: MouseEvent): [number, number] {
  const r = ui.editor.getBoundingClientRect();
  return [
    Math.floor((((e.clientX - r.left) / r.width) * ui.editor.width) / state.zoom),
    Math.floor((((e.clientY - r.top) / r.height) * ui.editor.height) / state.zoom),
  ];
}

function applyTool(e: MouseEvent, first: boolean): void {
  const [x, y] = cellAt(e);
  if (state.tool === "eyedropper") {
    const letter = frame()[y]?.[x];
    if (letter !== undefined && letter !== blank && !state.glyph) state.letter = letter;
    state.tool = "pencil";
    buildSide();
    return;
  }
  if (first) checkpoint();
  if (state.tool === "fill") fill(x, y, drawLetter());
  else set(x, y, drawLetter());
  render();
}

let drawing = false;
ui.editor.addEventListener("mousedown", (e) => {
  drawing = true;
  applyTool(e, true);
});
ui.editor.addEventListener("mousemove", (e) => {
  if (drawing && (state.tool === "pencil" || state.tool === "eraser")) applyTool(e, false);
});
window.addEventListener("mouseup", () => {
  drawing = false;
});

function toggle(label: string, on: boolean, click: () => void, title = ""): HTMLButtonElement {
  const b = document.createElement("button");
  b.textContent = label;
  b.title = title;
  b.className = on ? "on" : "";
  b.addEventListener("click", () => {
    click();
    buildSide();
    render();
  });
  return b;
}

/** Each tool, its button label and its key. */
const tools: [Tool, string, string][] = [
  ["pencil", "Pencil", "b"],
  ["eraser", "Eraser", "e"],
  ["fill", "Fill", "g"],
  ["eyedropper", "Pick", "i"],
];

function zoom(by: number): void {
  state.zoom = Math.max(1, Math.min(64, state.zoom * by));
}

function buildSide(): void {
  ui.tools.replaceChildren(
    ...tools.map(([tool, label, key]) =>
      toggle(
        label,
        state.tool === tool,
        () => {
          state.tool = tool;
        },
        `${label} (${key.toUpperCase()})`,
      ),
    ),
    toggle(
      "Mirror X",
      state.mirror,
      () => {
        state.mirror = !state.mirror;
      },
      "Mirror X (M)",
    ),
  );
  ui.view.replaceChildren(
    toggle("Grid", state.grid, () => {
      state.grid = !state.grid;
    }),
    toggle("Onion", state.onion, () => {
      state.onion = !state.onion;
    }),
    toggle(
      "−",
      false,
      () => {
        zoom(1 / 2);
      },
      "Zoom out (-)",
    ),
    toggle(
      "+",
      false,
      () => {
        zoom(2);
      },
      "Zoom in (+)",
    ),
  );
  // Glyph rows draw in one ink: the swatches pick the ink, not the letter.
  const chosen = state.glyph ? state.ink : state.letter;
  ui.palette.replaceChildren(
    ...Object.entries(state.palette).map(([letter, css]) => {
      const b = document.createElement("button");
      b.className = letter === chosen ? "swatch on" : "swatch";
      b.style.background = css;
      b.textContent = letter;
      b.title = `${letter} ${css}`;
      b.addEventListener("click", () => {
        if (state.glyph) state.ink = letter;
        else state.letter = letter;
        if (state.tool === "eraser" || state.tool === "eyedropper") state.tool = "pencil";
        buildSide();
        render();
      });
      return b;
    }),
  );
}

function buildVariants(variants: Opened["variants"], opened: Opened["value"]): void {
  const all: [string, Opened["value"]][] = [["(source)", opened], ...Object.entries(variants)];
  ui.variants.replaceChildren(
    ...all.map(([label, value]) => {
      const b = document.createElement("button");
      b.textContent = label;
      b.title = label;
      b.addEventListener("click", () => {
        checkpoint();
        state.frames = toGrids(value);
        state.current = Math.min(state.current, state.frames.length - 1);
        showStatus(`loaded ${label}`);
        render();
      });
      return b;
    }),
  );
  if (all.length === 1) ui.variants.append("none in out/studio/variants/");
}

function showStatus(text: string): void {
  ui.status.textContent = text;
}

async function api<T>(path: string, is: (v: unknown) => v is T, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  const body: unknown = await res.json();
  if (!res.ok) {
    const err = typeof body === "object" && body !== null && "error" in body ? String(body.error) : "";
    const out = typeof body === "object" && body !== null && "output" in body ? String(body.output) : "";
    throw new Error(err || out || res.statusText);
  }
  if (!is(body)) throw new Error(`${path}: unexpected reply`);
  return body;
}

function isOpened(v: unknown): v is Opened {
  return typeof v === "object" && v !== null && "value" in v && "glyph" in v && "variants" in v;
}

function isItems(v: unknown): v is StudioItem[] {
  return Array.isArray(v) && v.every((i) => typeof i === "object" && i !== null && "spec" in i);
}

function isPalette(v: unknown): v is Record<string, string> {
  return typeof v === "object" && v !== null && Object.values(v).every((c) => typeof c === "string");
}

function isSaved(v: unknown): v is { ok: boolean; output: string } {
  return typeof v === "object" && v !== null && "ok" in v;
}

async function open(spec: string): Promise<void> {
  if (ui.dirty.textContent !== "" && !confirm("Discard unsaved changes?")) return;
  const opened = await api(`/api/open?spec=${encodeURIComponent(spec)}`, isOpened);
  state.spec = spec;
  state.isFrames = !isStrings(opened.value);
  state.glyph = opened.glyph;
  state.frames = toGrids(opened.value);
  state.current = 0;
  state.undo = [];
  state.redo = [];
  state.saved = JSON.stringify(opened.value);
  const { w, h } = size(frame());
  state.zoom = Math.max(2, Math.min(32, 2 ** Math.floor(Math.log2(512 / Math.max(w, h)))));
  ui.spec.value = spec;
  history.replaceState(null, "", `?spec=${encodeURIComponent(spec)}`);
  buildVariants(opened.variants, opened.value);
  buildSide();
  showStatus(`opened ${spec}: ${w}x${h}, ${state.frames.length} frame(s)`);
  render();
}

async function save(): Promise<void> {
  if (state.spec === "") return;
  showStatus("saving, then bun run art…");
  const value = toValue();
  const result = await api("/api/save", isSaved, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ spec: state.spec, value }),
  });
  state.saved = JSON.stringify(value);
  showStatus(`saved ${state.spec}\n${result.output}`);
  markDirty();
}

function undoRedo(from: Grid[][], to: Grid[][]): void {
  const prev = from.pop();
  if (prev === undefined) return;
  to.push(cloneFrames());
  state.frames = prev;
  state.current = Math.min(state.current, prev.length - 1);
  render();
}

function report(p: Promise<void>): void {
  p.catch((e: unknown) => {
    showStatus(`error: ${e instanceof Error ? e.message : String(e)}`);
  });
}

ui.open.addEventListener("click", () => {
  report(open(ui.spec.value.trim()));
});
ui.spec.addEventListener("keydown", (e) => {
  if (e.key === "Enter") report(open(ui.spec.value.trim()));
});
ui.save.addEventListener("click", () => {
  report(save());
});
ui.undo.addEventListener("click", () => {
  undoRedo(state.undo, state.redo);
});
ui.redo.addEventListener("click", () => {
  undoRedo(state.redo, state.undo);
});

window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement) return;
  const mod = e.ctrlKey || e.metaKey;
  const keyed = tools.find(([, , key]) => key === e.key);
  if (mod && e.key.toLowerCase() === "z")
    undoRedo(e.shiftKey ? state.redo : state.undo, e.shiftKey ? state.undo : state.redo);
  else if (mod && e.key === "s") report(save());
  else if (mod) return;
  else if (keyed !== undefined) state.tool = keyed[0];
  else if (e.key === "m") state.mirror = !state.mirror;
  else if (e.key === "+" || e.key === "=") zoom(2);
  else if (e.key === "-") zoom(1 / 2);
  else if (e.key === "ArrowRight") state.current = (state.current + 1) % state.frames.length;
  else if (e.key === "ArrowLeft") state.current = (state.current - 1 + state.frames.length) % state.frames.length;
  else return;
  e.preventDefault();
  buildSide();
  render();
});

function buildItems(items: StudioItem[]): void {
  const shown = items.filter((i) => i.spec.toLowerCase().includes(ui.filter.value.toLowerCase()));
  ui.items.replaceChildren(
    ...shown.map((item) => {
      const b = document.createElement("button");
      b.textContent = `${item.spec.split("/").pop() ?? item.spec}${item.frames ? " ▸" : ""}`;
      b.title = item.spec;
      b.addEventListener("click", () => {
        report(open(item.spec));
      });
      return b;
    }),
  );
}

let tick = 0;
function animate(): void {
  const fps = Math.max(1, Number(ui.fps.value) || 6);
  const g = state.frames[Math.floor(tick / (60 / fps)) % Math.max(1, state.frames.length)];
  tick++;
  if (g !== undefined) {
    for (const [canvas, k] of [
      [ui.preview1, 1],
      [ui.preview4, 4],
    ] as const) {
      const { w, h } = size(g);
      canvas.width = w * k;
      canvas.height = h * k;
      paintGrid(context(canvas), g, k);
    }
  }
  requestAnimationFrame(animate);
}

async function start(): Promise<void> {
  state.palette = await api("/api/palette", isPalette);
  const items = await api("/api/items", isItems);
  ui.specs.replaceChildren(
    ...items.map((i) => {
      const o = document.createElement("option");
      o.value = i.spec;
      return o;
    }),
  );
  ui.filter.addEventListener("input", () => {
    buildItems(items);
  });
  buildItems(items);
  buildSide();
  requestAnimationFrame(animate);
  const spec = new URLSearchParams(location.search).get("spec");
  if (spec !== null) await open(spec);
}

try {
  await start();
} catch (e: unknown) {
  showStatus(`error: ${e instanceof Error ? e.message : String(e)}`);
}
