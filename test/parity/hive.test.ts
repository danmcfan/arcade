// Parity: the hive minigame (seeded fuzz coverage, scripted clear, mode
// cycle) against the Go traces. hive-highscore runs through the hub in
// game.test.ts.
import { parityTest } from "./harness.ts";

parityTest("hive-fuzz-1");
parityTest("hive-fuzz-2");
parityTest("hive-fuzz-3");
parityTest("hive-fuzz-4");
parityTest("hive-clear");
parityTest("hive-modes");
