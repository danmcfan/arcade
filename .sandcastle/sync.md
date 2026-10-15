# Context

You work in the arcade repo on branch `{{TARGET_BRANCH}}`, for issue #{{ISSUE_NUMBER}}. Read `AGENTS.md` first and obey it.

The branch's pull request conflicts with `origin/main`: other work merged after the branch was cut. GitHub runs no CI on a conflicting pull request, so it can't merge until this is fixed.

!`git log --oneline origin/main..HEAD`

# Task

1. Run `git merge origin/main` (a merge, not a rebase: the branch is already pushed).
2. Resolve each conflict so that the branch keeps both what main changed and what this issue changed. Read the main commits that touched the file (`git log origin/main -- <file>`) to see why it changed.
   - A text conflict: combine both sides by hand.
   - A parity fixture under `test/fixtures/` (traces and frames are binary and cannot be merged by hand): take main's version, then re-record the fixtures this branch changed on purpose, from the merged code, following "Re-recording a deliberately changed fixture from TypeScript" in `test/fixtures/README.md`. Keep both sides' entries in that README's list of re-recorded fixtures.
3. Commit the merge. Keep git's default merge message and list the resolved files under it.
4. `bun run check` must pass. Fix any failure the merge caused, in a commit of its own.

Do not change what this issue built beyond what the merge needs. Do not push, open a PR or merge the PR.

# Done

When the merge is committed and `bun run check` passes, output <promise>COMPLETE</promise>.
