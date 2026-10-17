# Arcade

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for danmcfan/arcade, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default label names: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix, plus needs-owner for open owner questions. Every issue also carries exactly one work type: bug, enhancement or refactor. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Delivery

Every change is committed straight to `main` and pushed, with no branch or PR; evidence goes to the owner as an Artifact page. Steps and evidence: `docs/agents/delivery.md`.

## Visual verification

Show the owner screenshots and video of any change a player can see or hear, captured by a throwaway script on `scripts/harness.ts`; unit tests carry the proof. How, and the browser gotchas: `docs/agents/visual-verification.md`.

## Pixel art

On a `ready-for-human` issue, any art request (creating, redrawing or specifying art) starts with the owner, who picks prototype or tweak before any art is committed; on a `ready-for-agent` issue, make the artistic calls yourself and name them to the owner: `docs/agents/pixel-art.md` (modes, variants, sources, helpers, `bun run pixel`, the quality bar).

## Quality gate

`bun run check` runs strict tsc, Oxlint, Prettier, knip, tests and the build; fix the code, never the rules. What each tool enforces and the guards around it: `docs/agents/quality-gate.md`.

## Sweet Sam gameplay

Sweet Sam matches the arcade Pac-Man; settle any gameplay question from the Pac-Man Dossier: `docs/sweet-sam-pacman.md`.

## Review

`CODING_STANDARDS.md` holds the rules for the Standards axis of `/code-review`.
