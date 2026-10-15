# Context

You review the work on branch `{{TARGET_BRANCH}}` for issue #{{ISSUE_NUMBER}}. Another agent wrote it. You change no code and make no commits.

Commits under review:

!`git log --oneline main..HEAD`

# Task

1. Use the `/code-review` skill with fixed point `main`. The spec is issue #{{ISSUE_NUMBER}}: read it with `gh issue view {{ISSUE_NUMBER}} --comments`. Do not ask the user anything; nobody is there to answer.
2. On the Standards axis, also use the `/codebase-design` skill's vocabulary: flag shallow modules, leaky seams and interfaces that could be deeper.
3. Write the report to `out/pipeline/review.md`, with the `## Standards` and `## Spec` headings from the skill. Number every finding (S1, S2, … and P1, P2, …), and give each its file, line and a one-line fix. If there are no findings, write `No findings.` as the whole file.

# Done

When `out/pipeline/review.md` is written, output <promise>COMPLETE</promise>.
