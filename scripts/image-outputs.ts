// The image outputs each art source declares once: where the PNG goes, its
// hard-coded size (ADR-0003) and how to draw it. scripts/gen-art.ts writes
// every PNG from these and the image table src/engine/images.generated.ts
// from the ones under src/assets/images; gen-art.test.ts is the one drift
// check over all of them.

import type { PNG } from "pngjs";

export interface ImageOutput {
  /** Repo-relative path of the PNG. Under src/assets/images it joins the image table. */
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly render: () => PNG;
}

/** One image output: `file` drawn by `render`, `width`×`height`. */
export function imageOutput(file: string, width: number, height: number, render: () => PNG): ImageOutput {
  return { file, width, height, render };
}
