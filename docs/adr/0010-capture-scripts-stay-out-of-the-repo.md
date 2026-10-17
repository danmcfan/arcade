# Capture scripts stay out of the repo

PRs used to commit a verify check in `scripts/verify/` for every user-visible change, meant to be rerun the next time that screen changed. By October 2026 there were 59 of them (about 7,700 lines), and 38 had been touched only once or twice: they were written for one PR's screenshots and never rerun. Nothing ran them in CI, so they could rot unseen, and their copied helpers produced a stream of duplicate cleanup issues (#274, #278, #279, #280, #285, #290). Their assertions repeated what the unit tests check through the headless game (ADR 0003).

So unit tests carry the proof of behaviour, and screenshots and video come from a throwaway capture script in `out/capture/`, run against `scripts/harness.ts` and attached to the PR, then dropped. The harness and the test hook (ADR 0005) stay as the shared, maintained part. A later change to the same screen writes a new capture script; with the harness that is a few lines.
