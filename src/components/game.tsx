import type { RefObject } from "react";
import { useRef, useEffect } from "react";
import type { GameState } from "@/lib/game";
import {
  getKeyDownHandler,
  getKeyUpHandler,
  getMouseMoveHandler,
  getAnimationHandler,
  initializeGame,
} from "@/lib/game";

export function Game({ initialState }: { initialState: GameState }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const state = useRef<GameState>(initialState);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    window.addEventListener("resize", () => {
      handleResize(container, canvas, ctx, state);
    });
    window.addEventListener("keydown", getKeyDownHandler(state));
    window.addEventListener("keyup", getKeyUpHandler(state));
    window.addEventListener("mousemove", getMouseMoveHandler(state));

    handleResize(container, canvas, ctx, state);
    initializeGame(state);
    const animationHandler = getAnimationHandler(ctx, state);
    requestAnimationFrame(animationHandler);

    return () => {
      window.removeEventListener("resize", () =>
        handleResize(container, canvas, ctx, state)
      );
      window.removeEventListener("keydown", getKeyDownHandler(state));
      window.removeEventListener("keyup", getKeyUpHandler(state));
      window.removeEventListener("mousemove", getMouseMoveHandler(state));
    };
  }, []);

  return (
    <div ref={containerRef} className="w-screen h-screen cursor-none">
      <canvas className="w-full h-full" ref={canvasRef} />
    </div>
  );
}

function handleResize(
  container: HTMLDivElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  state: RefObject<GameState>
) {
  const pixelRatio = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();

  canvas.width = rect.width * pixelRatio;
  canvas.height = rect.height * pixelRatio;

  state.current.width = rect.width;
  state.current.height = rect.height;

  state.current.scale = 8;
  if (state.current.width < 1800 || state.current.height < 1200) {
    state.current.scale = 4;
  }
  if (state.current.width < 600 || state.current.height < 400) {
    state.current.scale = 2;
  }

  ctx.imageSmoothingEnabled = false;
  ctx.scale(pixelRatio, pixelRatio);
}
