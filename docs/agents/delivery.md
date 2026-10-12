# Delivery: branch, PR, hand off

Every change ships as a pull request that the repo owner reviews and merges on GitHub (ADR 0007). Finish each piece of work as an **open PR with green CI**: that is the definition of done. The owner merges it.

## Steps

1. **Branch** from an up-to-date `main`: `git switch -c <issue-number>-<slug>` (e.g. `16-tokens-hud`), or a short slug when there is no issue.
2. **Build it.** Commit as you go, with messages in the style of `git log` (`Title: hide Continue until a save exists`).
3. **Gate**: `bun run check` passes (typecheck, tests, build).
4. **Verify** any user-visible change with a verify check, and keep its screenshots and video (`docs/agents/visual-verification.md`).
5. **Push** the branch and **open the PR**, attaching the evidence:

   ```sh
   git push -u origin HEAD
   gh pr create --title "..." --body-file <body.md> \
     --attach 'out/verify/<name>/<shot>.png#What it shows' \
     --attach out/verify/<name>/<clip>.mp4
   ```

   - The body follows the `/pr` skill.
   - Include `Closes #<n>` for each issue it finishes.
   - Reference an attachment inline with `![alt](./out/verify/<name>/<shot>.png)` and `gh` rewrites the link to the uploaded file. Videos render as a player.
6. **Watch CI**: `gh pr checks --watch`. Fix any red check on the same branch.
7. **Follow-ups** (review comments, more changes): commit to the same branch and push. To replace the evidence, use `gh pr edit <n> --attach ...` or `gh pr comment <n> --attach ...`.

## Boundaries

- Work reaches `main` only through a PR the owner merges. Leave `gh pr merge` and pushes to `main` to the owner, even when asked to "push" (push the branch and update the PR).
- The pre-push hook (`.githooks/pre-push`) rejects pushes to `main` and runs `bun run check` before any push. `bun install` sets it up through the `prepare` script.
