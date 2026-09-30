---
max_turns: 6
allowed_tools: [Skill]
---

`pinemeter` is a command-line tool reading power meters over a serial port, kept in one repository holding `src/`, `tests/`, `docs/benchmarks/` and a `CONTRIBUTING.md` stating: "Benchmark results measured on the reference meter rig are recorded under `docs/benchmarks/`, one file per run."

A change replacing the frame parser landed yesterday, and a benchmark run of it is in: parsing one frame costs 18 microseconds, down from 55, and reading a sweep of 96 registers costs 2.1 milliseconds, down from 6.0. Record these results. The repository is not checked out in this session; work from this description.
