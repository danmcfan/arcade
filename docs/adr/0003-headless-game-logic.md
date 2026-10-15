# Game logic runs without a DOM

`bun test` has no DOM, and every minigame must be steppable there for the parity replays and unit tests. No module may touch the DOM at import time or inside `step()`/`update()`/`snapshot()` (D12). Image sizes are hard-coded where each art source declares its images (written into the image table `src/engine/images.generated.ts`) and checked by a test against the PNG headers. Decoded images, audio elements and offscreen surfaces are attached later, in the browser only. `src/main.ts` is the only place that wires the game to `window` and `document`.
