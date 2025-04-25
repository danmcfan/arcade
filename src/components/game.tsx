import type { RefObject } from "react";
import { useRef, useEffect } from "react";
import type { State } from "@/lib/engine/game";
import {
  createState,
  getAnimationHandler,
  getKeyDownHandler,
  getKeyUpHandler,
} from "@/lib/engine/game";
import { initialize } from "@/lib/arcade";

const debug = false;

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

    state.current = createState(container, canvas, ctx, 10, 10, 1, 16, debug);

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
      state.current = null;
      canvasRef.current = null;
      containerRef.current = null;
    };
  }, []);

  return (
    <div ref={containerRef} className="w-screen h-[80vh] md:h-screen">
      <canvas className="w-full h-full md:h-full" ref={canvasRef} />
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

  state.current.offsetRatioX = 0.5;
  state.current.offsetRatioY = 0.5;
  state.current.scale = 4;

  if (state.current.height < 800) {
    state.current.scale = 2.5;
  }

  if (state.current.width <= 600 || state.current.height <= 600) {
    state.current.offsetRatioY = 0.25;
    state.current.scale = 2;
  }

  if (state.current.width <= 400 || state.current.height <= 400) {
    state.current.offsetRatioY = 0.1;
    state.current.scale = 1.75;
  }

  state.current.ctx.imageSmoothingEnabled = false;
  state.current.ctx.scale(pixelRatio, pixelRatio);
}
