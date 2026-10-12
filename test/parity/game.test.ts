// Parity: the top-level Game (hub + software switching) against the Go traces.
// The minigame parts pass once the matching porters have landed.
import { parityTest } from "./harness.ts";

parityTest("arcade-walk");
parityTest("arcade-enter-gearhead");
parityTest("arcade-enter-hive");
parityTest("arcade-enter-firefly");
parityTest("hive-highscore");
