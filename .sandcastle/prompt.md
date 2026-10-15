# Context

You work in the arcade repo. Read `AGENTS.md` first and obey it, and the docs it points to.

Your issue:

!`gh issue view {{ISSUE_NUMBER}} --comments`

# Task

You are on branch `{{TARGET_BRANCH}}`, with dependencies installed.

1. Build issue #{{ISSUE_NUMBER}}, following `docs/agents/delivery.md` steps 2–4. Commit as you go, in the style of `git log`.
2. `bun run check` must pass before you stop.
3. For any change the player can see or hear, write and run a verify check (`docs/agents/visual-verification.md`). Commit the check; leave its output in `out/verify/`.

Do not push, open a PR or merge. The owner opens the PR from your commits.

# Done

When `bun run check` passes and the work is committed, output <promise>COMPLETE</promise>.
