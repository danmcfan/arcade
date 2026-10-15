# Context

You work in the arcade repo on branch `{{TARGET_BRANCH}}`, for issue #{{ISSUE_NUMBER}}. Read `AGENTS.md` first and obey it.

{{TASK}}

# Task

1. Handle each item above. Fix it, or skip it if it is wrong or not worth the change, and say why.
2. Commit as you go, in the style of `git log`. If a fix changes what the player sees or hears, rerun the verify check for it.
3. Append what you did to `out/pipeline/fixes.md`: one line per item, `<id>: fixed | skipped | no change needed: <reason>`.
4. `bun run check` must pass before you stop.

Do not push, open a PR or merge.

# Done

When `bun run check` passes and the work is committed, output <promise>COMPLETE</promise>.
