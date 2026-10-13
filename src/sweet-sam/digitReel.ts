// Port of the Sweet Sam half of the Go port's digit_reel.go: Sweet Sam's score and
// high score dials. The reel itself is shared (src/ui/digitReel.ts).

import { digits6, syncAndTick } from "../ui/digitReel.ts";
import type { SweetSamSoftware } from "./software.ts";

export function syncAndTickScoreRollingDials(s: SweetSamSoftware): void {
  syncAndTick(s.scoreDial, digits6(s.scoreValue));
}

export function syncAndTickHighScoreRollingDials(s: SweetSamSoftware): void {
  syncAndTick(s.highScoreDial, digits6(Math.max(s.scoreValue, s.highScore)));
}
