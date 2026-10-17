import { defineConfig } from "sandworm";
import { BASE, evidenceGate, noticeGate } from "./gates.ts";

// The Sandcastle pipeline lives in sandworm (github.com/danmcfan/sandworm); this is what is
// particular to arcade. A file in .sandcastle/ named like one of sandworm's prompts replaces it.
export default defineConfig({
  repo: "arcade",
  base: BASE,
  prompts: {
    verify:
      "For any change the player can see or hear, capture screenshots and video with a throwaway script in `out/capture/` (`docs/agents/visual-verification.md`). Leave the script uncommitted and its output in `out/verify/`.",
    reverify: "If a fix changes what the player sees or hears, rerun its capture script.",
    evidence: "out/verify",
  },
  // A run whose evidence would mislead the owner opens no PR.
  gates: [noticeGate, evidenceGate],
  // The batch merges green bug PRs itself (ADR 0009).
  batch: { workers: 2, mergeBugs: true },
});
