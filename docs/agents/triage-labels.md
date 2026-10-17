# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those roles to the actual label strings used in this repo's issue tracker.

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding label string from this table.

Edit the right-hand column to match whatever vocabulary you actually use.

## Needs owner

`needs-owner` marks an issue with an open question only the owner can answer: design, art or placement. Apply it alongside the triage label whenever the issue leaves such a decision open, and remove it once the owner answers in the issue. An agent never builds past it; it asks on the issue and stops.

Apply it to every art request (creating, redrawing or specifying art) that does not yet record the owner's prototype-or-tweak choice (`docs/agents/pixel-art.md`).

## Work type

Every issue also carries exactly one work-type label, so tooling can switch behaviour on the kind of work:

| Label         | Use it when                                                                           |
| ------------- | ------------------------------------------------------------------------------------- |
| `bug`         | Something a player or tool can observe is broken; the fix restores intended behaviour |
| `enhancement` | Adds or changes behaviour: a new feature, rule, art, sound or tool capability         |
| `refactor`    | Restructures code with no change in behaviour                                         |

When a skill asks for an issue's category (for example `/triage`), choose from these three; a behaviour-preserving restructure is `refactor`, not `enhancement`.
