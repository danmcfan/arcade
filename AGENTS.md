# Arcade

## Agent skills

### Issue tracker

Issues and specs live in GitHub Issues for danmcfan/arcade, managed with the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Uses the default label names: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` plus `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Delivery

Every change ships as a PR from its own branch; the owner reviews and merges on GitHub. Steps, evidence and boundaries: `docs/agents/delivery.md`.

## Visual verification

Verify any change a player can see or hear with a verify check (`bun run verify <name>`, `scripts/harness.ts`), and attach its screenshots and video to the PR. How to write one and the browser gotchas: `docs/agents/visual-verification.md`.

## Pixel art

Drawing, redrawing or specifying art: `docs/agents/pixel-art.md` (sources, helpers, `bun run pixel`, the quality bar).

## Review

`CODING_STANDARDS.md` holds the rules for the Standards axis of `/code-review`.
