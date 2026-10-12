# TypeScript and Bun on a plain canvas

The game started as Go + Ebitengine compiled to Wasm, with an Odin + raylib prototype alongside it. It is a small 2D game, and the Wasm build cost a compile step, a 14 MB binary and slow start-up for no gain. We ported it to TypeScript drawing to a `<canvas>` with Canvas 2D, built, served and tested by Bun. There is no framework and no runtime dependency; dev dependencies are pinned exactly. The plan and its decision log (D1–D15) are in `docs/ts-port-plan.md`.

## Consequences

- Ebitengine's behaviour is emulated, not inherited: logical-resolution rendering with integer CSS upscale (D1), coordinate snapping (D13) and premultiplied colours (D15). Rendering changes have to keep these emulations in mind.
