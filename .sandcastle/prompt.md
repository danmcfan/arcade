# Context

You work in the arcade repo. Read `AGENTS.md` first and obey it, and the docs it points to.

Open issues that are ready for an agent:

!`gh issue list --label ready-for-agent --state open --limit 20 --json number,title,labels --jq '.[] | "#\(.number) \(.title)"'`

# Task

1. Run `bun install --frozen-lockfile`.
2. Pick the lowest-numbered issue above. Read it with `gh issue view <n> --comments`.
3. Build it, following `docs/agents/delivery.md` steps 2–4. Commit as you go, in the style of `git log`.
4. `bun run check` must pass before you stop.
5. For any change the player can see or hear, write and run a verify check (`docs/agents/visual-verification.md`). Commit the check; leave its output in `out/verify/`.

Do not push, open a PR or merge. The owner opens the PR from your commits.

# Done

When `bun run check` passes and the work is committed, output <promise>COMPLETE</promise>.
