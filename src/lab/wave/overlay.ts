// HTML stand-in for wave's debugui window (D6), browser only. Go draws a
// "Wave" window at (10,10)-(160,160) with two sliders (grid size 64..256 step
// 64, seconds 1..30), FPS, TPS and `collapsed / total`. Here it sits outside
// the canvas in CSS pixels, so Go's `ctx.SetScale(activeGridSize / 64)` (which
// compensates for the downscaled 2048+ px canvas) has no equivalent.

/** What the overlay reads and writes on the scene. */
export interface WaveOverlayModel {
  /** Pending slider values (Go `gridSize`, `seconds`). */
  gridSize: number;
  seconds: number;
  readonly activeGridSize: number;
  collapsedCount(): number;
  /** Monotonic counters for the FPS/TPS readouts. */
  frameCount(): number;
  tickCount(): number;
}

/** Mount the overlay into `parent`; the returned function removes it. */
export function mountWaveOverlay(parent: HTMLElement, model: WaveOverlayModel): () => void {
  const doc = parent.ownerDocument;
  const root = doc.createElement("div");
  root.setAttribute("aria-label", "Wave");
  Object.assign(root.style, {
    position: "fixed",
    left: "10px",
    top: "10px",
    width: "150px",
    padding: "6px 8px",
    background: "rgba(20, 20, 20, 0.85)",
    color: "#ddd",
    font: "12px/1.5 monospace",
    border: "1px solid #444",
    borderRadius: "3px",
    zIndex: "1",
    userSelect: "none",
  } satisfies Partial<CSSStyleDeclaration>);

  const title = doc.createElement("div");
  title.textContent = "Wave";
  title.style.fontWeight = "bold";
  root.append(title);

  const slider = (
    label: string,
    min: number,
    max: number,
    step: number,
    get: () => number,
    set: (v: number) => void,
  ): void => {
    const row = doc.createElement("label");
    row.style.display = "block";
    const input = doc.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(get());
    input.style.width = "100%";
    const value = doc.createElement("span");
    value.textContent = `${label}: ${get()}`;
    input.addEventListener("input", () => {
      set(Number(input.value));
      value.textContent = `${label}: ${get()}`;
    });
    // Hand the keyboard back to the game (Space applies the settings).
    input.addEventListener("change", () => input.blur());
    row.append(value, input);
    root.append(row);
  };
  slider(
    "grid",
    64,
    256,
    64,
    () => model.gridSize,
    (v) => (model.gridSize = v),
  );
  slider(
    "seconds",
    1,
    30,
    1,
    () => model.seconds,
    (v) => (model.seconds = v),
  );

  const fps = doc.createElement("div");
  const tps = doc.createElement("div");
  const count = doc.createElement("div");
  root.append(fps, tps, count);
  parent.append(root);

  // Go's ActualFPS/ActualTPS: rates over the last ~1 s window.
  const view = doc.defaultView;
  let raf = 0;
  let windowStart = performance.now();
  let frames0 = model.frameCount();
  let ticks0 = model.tickCount();
  let fpsValue = 0;
  let tpsValue = 0;
  const render = (now: number): void => {
    const elapsed = now - windowStart;
    if (elapsed >= 1000) {
      fpsValue = ((model.frameCount() - frames0) * 1000) / elapsed;
      tpsValue = ((model.tickCount() - ticks0) * 1000) / elapsed;
      windowStart = now;
      frames0 = model.frameCount();
      ticks0 = model.tickCount();
    }
    fps.textContent = `FPS: ${fpsValue.toFixed(2)}`;
    tps.textContent = `TPS: ${tpsValue.toFixed(2)}`;
    count.textContent = `${model.collapsedCount()} / ${model.activeGridSize * model.activeGridSize}`;
    raf = view?.requestAnimationFrame(render) ?? 0;
  };
  render(windowStart);

  return () => {
    view?.cancelAnimationFrame(raf);
    root.remove();
  };
}
