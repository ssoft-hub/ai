The request puts the migration guide for 1.0 in `UPGRADING.md` at the repository root, and the `CONTRIBUTING.md` of `larchpool` puts a migration guide under `docs/migrations/`, named after the release, where `0.8.md` and `0.9.md` sit. Which of the two places takes the 1.0 guide? Whichever it is, the guide will read:

- `PoolManager` is now `Pool`: replace every `PoolManager(...)` construction with `Pool(...)`.
- `min_idle` is gone: drop the argument; `Pool(max_size)` covers the old calls.
