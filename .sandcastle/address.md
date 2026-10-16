# Context

You work in the arcade repo. Read `AGENTS.md` first and obey it, and the docs it points to.

The pull request for issue #{{ISSUE_NUMBER}} is open, and the owner has commented on it. Their new comments are in `out/pipeline/feedback.md`: each has where it was left (a file and line, with the diff it points at, a review, or a conversation comment) and what it says.

The issue:

!`gh issue view {{ISSUE_NUMBER}} --comments`

Commits so far:

!`git log --oneline main..HEAD`

# Task

You are on branch `{{TARGET_BRANCH}}`, with dependencies installed.

1. Make every change the comments ask for. A question with no change asked for needs an answer, not code: leave it for the PR body. Use the `/tdd` skill wherever the code has a seam a test can drive.
2. Commit as you go, in the style of `git log`.
3. For any change the player can see or hear, write or rerun its verify check (`docs/agents/visual-verification.md`). Leave its output in `out/verify/`.
4. `bun run check` must pass before you stop.

Another agent reviews your work after you, so do not review it yourself. Do not push, edit the PR, reply to comments or merge.

# Done

When `bun run check` passes and the work is committed, output <promise>COMPLETE</promise>.
