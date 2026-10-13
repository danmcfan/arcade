// Parity: the top-level Game (hub + software switching) against the Go traces.
// Minigames started directly (`software` in the script) live in their own files.
import { parityTest } from "./harness.ts";

parityTest("arcade-walk");
parityTest("arcade-enter-brass-monkey");
parityTest("arcade-enter-hive");
parityTest("arcade-enter-firefly");
parityTest("hive-highscore");
