---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, run /code-review on the work. It reviews and applies its own fixes; carry on once its final table has no finding left unresolved except those marked **Needs owner**, and pass those on to the user.

Commit your work to the current branch.
