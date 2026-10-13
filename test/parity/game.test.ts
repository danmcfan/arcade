// Parity: the top-level Game (hub + software switching) against the Go traces.
// Minigames started directly (`software` in the script) live in their own files.
import { parityTest } from "./harness.ts";

parityTest("arcade-walk");
parityTest("arcade-enter-brass-monkey");
parityTest("arcade-enter-sweet-sam");
parityTest("arcade-enter-firefly");
parityTest("sweet-sam-highscore");
