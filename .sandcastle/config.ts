import { defineConfig } from "sandworm";

// The Sandcastle pipeline lives in sandworm (github.com/danmcfan/sandworm); this is what is
// particular to arcade. A file in .sandcastle/ named like one of sandworm's prompts replaces it:
// sync.md does, for the parity fixtures.
export default defineConfig({
  repo: "arcade",
  prompts: {
    verify:
      "For any change the player can see or hear, write and run a verify check (`docs/agents/visual-verification.md`). Commit the check; leave its output in `out/verify/`.",
    reverify: "If a fix changes what the player sees or hears, rerun the verify check for it.",
    evidence: "out/verify",
  },
  // The batch merges green bug PRs itself (ADR 0009).
  batch: { workers: 2, mergeBugs: true },
});
