---
name: code-review
description: "Adversarial review of the changes since a fixed point (commit, branch, tag, or merge-base) along two axes: Standards (does the code follow this repo's documented coding standards?) and Spec (does the code match what the originating issue/spec asked for?), then fixes the findings. Runs both reviews in parallel sub-agents, reports them side by side, and applies the fixes. Use when the user wants to review a branch, a PR, work-in-progress changes, or asks to \"review since X\"."
---

Two-axis **adversarial review** of the diff between `HEAD` and a fixed point the user supplies, followed by fixing what it finds:

- **Standards**: does the code conform to this repo's documented coding standards?
- **Spec**: does the code faithfully implement the originating issue / spec?

Both axes run as **parallel sub-agents** so they don't pollute each other's context, then this skill aggregates their findings and fixes them. If the user asks for a review only ("report only", "don't fix"), stop after step 6.

The repo's agent docs (`AGENTS.md`, `CLAUDE.md`, and what they point to) say how to reach the issue tracker, which checks to run, and what needs human sign-off. Read them before starting.

## Adversarial stance

The review sub-agents, and you in step 7, work as adversarial reviewers. Assume the change is wrong until the diff proves otherwise. Be skeptical, hunt for flaws, and challenge assumptions: the author's, the spec's, and the tests'. For each hunk ask "what input breaks this?" and "what does this claim that nothing verifies?" Quote the hunk behind every finding; a finding without evidence is dropped. State findings plainly, without praise or softening.

## Process

### 1. Pin the fixed point

Whatever the user said is the fixed point (a commit SHA, branch name, tag, `main`, `HEAD~5`, etc.). If they didn't specify one, ask for it.

Capture the diff command once: `git diff <fixed-point>...HEAD` (three-dot, so the comparison is against the merge-base). Also note the list of commits via `git log <fixed-point>..HEAD --oneline`.

Before going further, confirm the fixed point resolves (`git rev-parse <fixed-point>`) and the diff is non-empty. A bad ref or empty diff should fail here, not inside two parallel sub-agents.

### 2. Identify the spec source

Look for the originating spec, in this order:

1. Issue references in the commit messages (`#123`, `Closes #45`, GitLab `!67`, etc.), fetched the way the repo's agent docs describe.
2. A path the user passed as an argument.
3. A spec file under `docs/`, `specs/`, or `.scratch/` matching the branch name or feature.
4. If nothing is found, ask the user where the spec is. If they say there isn't one, the **Spec** sub-agent will skip and report "no spec available".

### 3. Identify the standards sources

Anything in the repo that documents how code should be written, such as `CODING_STANDARDS.md` or `CONTRIBUTING.md`.

On top of whatever the repo documents, the Standards axis always carries the **smell baseline** below: a fixed set of Fowler code smells (_Refactoring_, ch.3) that applies even when a repo documents nothing. Two rules bind it:

- **The repo overrides.** A documented repo standard always wins; where it endorses something the baseline would flag, suppress the smell.
- **Always a judgement call.** Each smell is a labelled heuristic ("possible Feature Envy"), never a hard violation. Like any standard here, skip anything tooling already enforces.

Each smell reads *what it is* → *how to fix*; match it against the diff:

- **Mysterious Name**: a function, variable, or type whose name doesn't reveal what it does or holds. → rename it; if no honest name comes, the design's murky.
- **Duplicated Code**: the same logic shape appears in more than one hunk or file in the change. → extract the shared shape, call it from both.
- **Feature Envy**: a method that reaches into another object's data more than its own. → move the method onto the data it envies.
- **Data Clumps**: the same few fields or params keep travelling together (a type wanting to be born). → bundle them into one type, pass that.
- **Primitive Obsession**: a primitive or string standing in for a domain concept that deserves its own type. → give the concept its own small type.
- **Repeated Switches**: the same `switch`/`if`-cascade on the same type recurs across the change. → replace with polymorphism, or one map both sites share.
- **Shotgun Surgery**: one logical change forces scattered edits across many files in the diff. → gather what changes together into one module.
- **Divergent Change**: one file or module is edited for several unrelated reasons. → split so each module changes for one reason.
- **Speculative Generality**: abstraction, parameters, or hooks added for needs the spec doesn't have. → delete it; inline back until a real need shows.
- **Message Chains**: long `a.b().c().d()` navigation the caller shouldn't depend on. → hide the walk behind one method on the first object.
- **Middle Man**: a class or function that mostly just delegates onward. → cut it, call the real target direct.
- **Refused Bequest**: a subclass or implementer that ignores or overrides most of what it inherits. → drop the inheritance, use composition.

### 4. Spawn both sub-agents in parallel

**Standards sub-agent prompt** should include:

- The full diff command and commit list.
- The list of standards-source files you found in step 3, **plus the smell baseline from step 3** pasted in full (the sub-agent has no other access to it).
- The **Adversarial stance** section, pasted in full.
- The brief: "Report, per file/hunk where relevant, (a) every place the diff violates a documented standard: cite the standard (file + the rule); and (b) any baseline smell you spot: name it and quote the hunk. Distinguish hard violations from judgement calls: documented-standard breaches can be hard, but baseline smells are always judgement calls, and a documented repo standard overrides the baseline. Skip anything tooling enforces. Under 400 words."

**Spec sub-agent prompt** should include:

- The diff command and commit list.
- The path or fetched contents of the spec.
- The **Adversarial stance** section, pasted in full.
- The brief: "Report: (a) requirements the spec asked for that are missing or partial; (b) behaviour in the diff that wasn't asked for (scope creep); (c) requirements that look implemented but where the implementation looks wrong; (d) assumptions the spec, code, or tests rely on that may not hold (edge cases, ordering, state, claims about external behaviour), checked against any reference the spec or repo docs name. Quote the spec line for each finding. Under 400 words."

If the spec is missing, skip the Spec sub-agent and note this in the final report.

### 5. Aggregate

Lay out the two reports under `## Standards` and `## Spec` headings, verbatim or lightly cleaned. Do **not** merge or rerank findings, because the two axes are deliberately separate (see _Why two axes_). Present them after step 6, so each finding carries its verdict.

End with a one-line summary: total findings per axis, and the worst issue _within each axis_ (if any). Don't pick a single winner across axes: that's the reranking the separation exists to prevent.

### 6. Verify

A reviewer that hunts for flaws also produces false positives. Before anything gets fixed, put each axis's findings through a fresh **verifier** sub-agent that saw none of the review: one per axis, in parallel. Skip an axis with no findings.

Each verifier prompt should include the diff command, that axis's findings verbatim, and the sources the reviewer had (standards files and smell baseline, or the spec). The brief: "Try to refute each finding. Read the code around the hunk, not just the hunk; look for the caller, test, guard, or rule that makes it a non-issue. Give each finding a verdict: **Confirmed**, **Refuted**, or **Unsure**, with one line of evidence (a quote or a `file:line`). Under 300 words."

Then present the step 5 report, once, with each verdict beside its finding.

### 7. Fix

Take every finding from both axes and settle it with your own judgement, using the verifier's verdict as evidence, not as the decision: a **Refuted** finding is usually **Skipped** with the verifier's reason, and an **Unsure** one gets your own look before you choose. Each finding ends as one of:

- **Fixed**: the finding holds and the fix is clear and inside the change's scope. Apply it.
- **Skipped**: on a second, adversarial look the finding is wrong, or the smell is a judgement call you reject. Give the reason in one line.
- **Needs owner**: only a human can decide it: the spec is ambiguous, scope creep the owner may want to keep, a redesign beyond the change, or anything the repo's agent docs reserve for human sign-off.

Then:

1. Run the repo's checks (as its agent docs describe) until they pass, and redo whatever verification those docs require for a change a user can see.
2. Commit the fixes to the current branch. Push only where the repo's delivery rules say to.
3. Report a table with one row per finding: axis, finding, outcome (**Fixed** / **Skipped** / **Needs owner**), and a one-line note. List the **Needs owner** rows again below the table as questions for the user.

The step is done when every finding has an outcome and the checks pass.

## Why two axes

A change can pass one axis and fail the other:

- Code that follows every standard but implements the wrong thing → **Standards pass, Spec fail.**
- Code that does exactly what the issue asked but breaks the project's conventions → **Spec pass, Standards fail.**

Reporting them separately stops one axis from masking the other.
