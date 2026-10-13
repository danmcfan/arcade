// Parity: the Sweet Sam minigame (seeded fuzz coverage, scripted clear, mode
// cycle) against the Go traces. sweet-sam-highscore runs through the hub in
// game.test.ts.
import { parityTest } from "./harness.ts";

parityTest("sweet-sam-fuzz-1");
parityTest("sweet-sam-fuzz-2");
parityTest("sweet-sam-fuzz-3");
parityTest("sweet-sam-fuzz-4");
parityTest("sweet-sam-clear");
parityTest("sweet-sam-modes");
