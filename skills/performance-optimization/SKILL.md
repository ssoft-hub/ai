---
name: performance-optimization
version: "1.0.0"
description: Apply when diagnosing or fixing a reported performance problem, or evaluating whether a change is worth its performance cost
license: Unlicense
metadata:
  author: ssoft
  tier: domain
  bound-to:
    - universal
  tags:
    - performance
    - quality
---

# Skill: Performance Optimization

Apply when diagnosing or fixing a reported performance problem, or evaluating whether a
change is worth its performance cost. This skill covers the *process* of finding and
validating a performance fix. The default idioms to write by (avoiding copies, preferring
views, hot-path allocation discipline) are always in effect regardless of a specific
problem → the coding-conventions skill of the language being written — do not restate
them here.

- Performance depth during review → `code-review-and-quality` skill (Performance axis).
- Production performance regressions surfaced via metrics → `observability-and-instrumentation` skill.

## Project Overrides

**Must**

Must follow the performance process, budget and tooling the repository's `AGENTS.md`
file or a project skill defines, instead of the rule here.

---

## Measure Before Optimizing

Do not change code for performance based on intuition about what "should" be slow.
Profile first (e.g. `perf`, VTune, Tracy, a targeted micro-benchmark) and identify the
actual hot path — intuition about hot paths is wrong often enough that skipping this
step routinely produces effort spent on code that wasn't the bottleneck.

Two complementary measurements matter, not one: a controlled micro-benchmark or
profiler run isolates a specific function under reproducible conditions, while
telemetry from real usage (`observability-and-instrumentation`) confirms the fix
actually helped under real workloads and hardware. A benchmark improvement that doesn't
show up in production telemetry means the benchmark measured the wrong thing.

## State the Budget

Before optimizing, state what "fast enough" means for this specific case (a latency
target, a throughput target, a memory ceiling) — see `requirements` for non-functional
requirements. Optimizing past the stated budget trades engineering time and code clarity
for a gain nobody asked for.

## Algorithmic Complexity First

Check the algorithmic complexity (Big-O) of the hot path before micro-optimizing its
constant factor — an O(n²) algorithm processing a large `n` will not be fixed by
inlining or removing a copy. Fix the algorithm before tuning the implementation.

## Measure the Fix

Re-run the same profiling/benchmark after the change, on the same workload, and compare
against the baseline captured before the change. A performance fix without a before/after
number is a guess about whether it helped — see `test-driven-development`'s "measure,
don't assume" spirit applied to performance instead of correctness.

- Bad: "this should be faster because it avoids a copy" (no measurement)
- Good: "p99 latency for a 10k-row export dropped from 480ms to 95ms (benchmark: `export_bench`, 20 runs)"

Where the before-and-after measurement goes: `artifact-placement` → Where the Place Comes From.

## Common Sources, in Order of Likely Impact

| Source | What to check |
|--------|----------------|
| Algorithm | Big-O of the hot path relative to the actual input size |
| I/O | Network/disk calls inside a loop that could be batched |
| Allocation | Allocations per iteration of a hot loop |
| Copies | Values copied where a reference/view/move would do |
| Synchronization | Lock contention or false sharing under concurrent load |
| Cache locality | Data layout causing avoidable cache misses on a hot path |

## Do Not Trade Away Correctness or Clarity Silently

A performance change that removes a bounds check, a validation step, or makes the code
meaningfully harder to follow needs to say so explicitly and justify the trade with the
measured gain — see `code-review-and-quality`. An unstated correctness-for-speed trade
is a defect, not an optimization.

## When Not to Optimize

A cold path (rarely executed, not on any measured budget) does not get optimized on
suspicion alone. Time spent there is better spent elsewhere unless a specific report or
measurement says otherwise.
