---
max_turns: 6
allowed_tools: [Skill]
---

`larchpool` is a Python library pooling database connections, kept in one repository holding `src/`, `tests/`, `docs/` and a `CONTRIBUTING.md`. The `CONTRIBUTING.md` states: "A breaking change ships with a migration guide, a page under `docs/migrations/` named after the release." The directory holds `0.8.md` and `0.9.md`.

Release 1.0 renames the class `PoolManager` to `Pool` and drops the `min_idle` argument of its constructor, `Pool(max_size)` covering the old calls. Write the migration guide for 1.0 and put it in `UPGRADING.md` at the repository root. The repository is not checked out in this session; work from this description.
