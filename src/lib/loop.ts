import { areSpritesLoaded } from "@/lib/sprite";
import { State } from "@/lib/state";
import { handleInput } from "@/lib/input";
import { update } from "@/lib/update";
import { render } from "@/lib/render";
import { MS_PER_FRAME } from "@/lib/constant";

export function getGameLoop(state: State) {
  function animate(current: number) {
    if (!areSpritesLoaded(state.spriteSheets)) {
      return;
    }

    let elapsed = current - state.previous;
    state.previous = current;

    elapsed = Math.min(elapsed, MS_PER_FRAME * 10);
    state.lag += elapsed;

    handleInput(state);

    while (state.lag >= MS_PER_FRAME) {
      update(state);
      state.lag -= MS_PER_FRAME;
    }

    render(state);
  }

  function gameLoop(timestamp: number) {
    animate(timestamp);
    requestAnimationFrame(gameLoop);
  }

  return gameLoop;
}
