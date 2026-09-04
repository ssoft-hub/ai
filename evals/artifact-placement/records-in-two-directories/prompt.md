---
max_turns: 6
allowed_tools: [Skill]
---

`brookmark` is a TypeScript service resolving short links, kept by a team of six in one repository holding `src/`, `test/`, a `CONTRIBUTING.md` on code review alone, `docs/adr/` with the decision records `0001` to `0007`, and `docs/decisions/` with the decision records `0008` to `0012`. No file says which of the two directories a new record takes.

The team has settled on storing the link tokens as keyed hashes instead of plain: a leaked database dump exposes no token, and verifying a token costs one hash. Write the decision record for this choice. The repository is not checked out in this session; work from this description.
