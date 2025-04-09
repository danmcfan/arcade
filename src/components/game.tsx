import type { RefObject } from "react";
import { useRef, useEffect } from "react";
import type { State } from "@/lib/game";
import {
  createState,
  getAnimationHandler,
  getKeyDownHandler,
  getKeyUpHandler,
  initialize,
} from "@/lib/game";

export function Game() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useRef<State | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    state.current = createState(container, canvas, ctx);

    const keyDownHandler = getKeyDownHandler(state);
    const keyUpHandler = getKeyUpHandler(state);

    window.addEventListener("keydown", keyDownHandler);
    window.addEventListener("keyup", keyUpHandler);
    window.addEventListener("resize", () => {
      handleResize(state);
    });

    handleResize(state);
    initialize(state);
    requestAnimationFrame(getAnimationHandler(state));

    return () => {
      window.removeEventListener("keydown", keyDownHandler);
      window.removeEventListener("keyup", keyUpHandler);
      window.removeEventListener("resize", () => handleResize(state));
    };
  }, []);

  return (
    <div ref={containerRef} className="w-screen h-screen">
      <canvas className="w-full h-full" ref={canvasRef} />
    </div>
  );
}

function handleResize(state: RefObject<State | null>) {
  if (!state.current) return;

  const pixelRatio = window.devicePixelRatio || 1;
  const rect = state.current.container.getBoundingClientRect();

  state.current.canvas.width = rect.width * pixelRatio;
  state.current.canvas.height = rect.height * pixelRatio;

  state.current.width = rect.width;
  state.current.height = rect.height;

  state.current.ctx.imageSmoothingEnabled = false;
  state.current.ctx.scale(pixelRatio, pixelRatio);
}
