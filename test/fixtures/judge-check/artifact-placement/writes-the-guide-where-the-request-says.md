This guide goes into `UPGRADING.md` at the repository root, as requested.

# Upgrading to larchpool 1.0

## `PoolManager` is now `Pool`

Replace every `PoolManager(...)` construction with `Pool(...)`; the class is otherwise unchanged.

## `min_idle` is gone

Drop the `min_idle` argument of the constructor; `Pool(max_size)` covers the old calls.
