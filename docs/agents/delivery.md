# Delivery: commit to main, push

Every change is committed straight to `main` and pushed; there is no branch and no pull request. Finish each piece of work as **commits on `origin/main` with `bun run check` green and the evidence in front of the owner**: that is the definition of done.

## Steps

1. **Start** from an up-to-date `main`: `git pull --ff-only`.
2. **Build it.** Commit as you go, with messages in the style of `git log` (`Title: hide Continue until a save exists`). Add `Closes #<n>` to the commit that finishes each issue.
3. **Gate**: `bun run check` passes before every push (typecheck, lint, format, unused code, tests, build; `docs/agents/quality-gate.md`).
4. **Capture** any user-visible change: screenshots and video from a throwaway capture script (`docs/agents/visual-verification.md`).
5. **Push**: `git push origin main`. If it is rejected because `main` moved, `git pull --rebase` your unpushed commits, rerun the gate and push again.
6. **Show the evidence**: publish the screenshots, video and any `pixel before` sheet as an Artifact page, and give the owner its link with a short summary of the change (or report them to the owner directly when a page is overkill).
7. **Watch CI** on the pushed commit (`gh run watch`). Fix any red check with a new commit on `main`.
