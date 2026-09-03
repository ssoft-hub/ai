---
name: project-planning
version: "1.0.0"
description: Apply when scoping work, breaking a feature down into tasks, estimating effort, sequencing milestones, identifying risk or dependencies, writing a project plan or status update, or launching a build, a test run, a set of checks or several agents at once
license: Unlicense
metadata:
  author: ssoft
  tier: process
  bound-to:
    - universal
  tags:
    - planning
    - project-management
---

# Skill: Project Planning & Management

Apply when scoping work, breaking a feature into tasks, estimating effort, sequencing
milestones, identifying risk/dependencies, writing a project plan or status update meant
for stakeholders, or launching a build, a test run, a set of checks or several agents at
once.

- The planning artifacts are the project-level ones shared with stakeholders — a roadmap,
  a scoping doc, a status report. The ceremony they carry does not reach an
  in-conversation task plan for a single coding task, which the `Plan` tooling covers.
  Running Independent Work in Parallel is the exception: it governs a launch whatever the
  plan behind it.
- A plan is built from settled requirements — if those don't exist yet, go get them
  first → `requirements` skill.
- PR Size discipline and the release checklist are the execution-time tail end of a
  plan made here → `pr-rules`, `release` skills.

## Project Overrides

**Must**

Must follow the planning process or templates the repository's `AGENTS.md` file or a
project skill defines, instead of the rule here.

---

## Breaking Work Into Increments

Decompose a requirement or architectural decision into pieces that are each
independently shippable — each one should leave the system in a working state, even
if the full feature isn't done. This is the same discipline `pr-rules`' "PR Size"
section asks for at the commit/PR level; planning is where you decide the sequence of
increments before any of them are coded.

A good increment:
- Delivers something verifiable on its own (a test can pass, a reviewer can assess it).
- Doesn't require a later increment to avoid leaving the system broken.
- Is small enough that if it turns out to be wrong, the cost of discarding it is small.

If you can't see how to split a requirement this way, that's usually a sign the
requirement itself is still too vague — go back and sharpen it rather than forcing an
artificial split.

## Estimation

Estimate the increments, not the whole feature — a whole-feature estimate is really
just the sum of guesses about pieces nobody has thought through yet, and it hides which
piece carries the most uncertainty. Track uncertainty explicitly (e.g. "well
understood" vs "depends on an unknown" vs "speculative") rather than collapsing it into
a single number — a stakeholder reading "3 days" treats it as a number to hold you to,
even if it was really "3 days if X works as expected, otherwise unknown."

## Identifying Dependencies and Risk

Before sequencing, ask: which increments block others, and which depend on something
outside your control (another team, an external API, an unresolved requirements
question)? Surface the externally-dependent ones early — not because you can resolve
them yourself, but because the people who can need lead time, and a risk discovered in
week 1 is cheap; the same risk discovered in week 4 has already cost three weeks of
work built on top of an assumption that didn't hold.

A risk worth naming explicitly has: what could go wrong, how you'd notice it happening,
and what the fallback is if it does. A risk list without those three things is just a
list of worries, not something the plan can act on.

## Running Independent Work in Parallel

**Should**

Should launch independent units of work at the same time rather than one after another,
and should treat two units as independent when neither reads what the other writes and
the two write nothing in common — a file, a database row, a state key, or a path either
takes from a shared environment variable among them. The path written is what counts, so
two units contend over a directory only where they create or remove the same entry of it,
or where one enumerates it while the other adds an entry. Should read the test over every
pair of the launch, and should run a pair that is not independent in sequence, by the
dependencies the section Identifying Dependencies and Risk establishes.

Should bound the degree of parallelism by each of the rows below and take the lowest
bound they give; no bound outside the table applies:

| The resource | The bound it puts on the degree |
|---|---|
| the CPU cores no other work holds, for a unit that occupies one while it runs rather than waiting | their number |
| a resource consumed in a divisible capacity — memory | the free capacity divided by one unit's peak, measured on this unit or on a previous run of it |
| a resource held one user at a time, a licence and a device only one process may open among them | the number of instances of it |
| a resource carrying throughput, the disk and the network among them | none, unless the units saturate it, and then the measured degree past which the run stops getting shorter |
| a quota over units running at once — a rate limit, a runner pool, a platform's own limit on concurrent jobs | the quota |

A split past the lowest of them shortens no run. Each row names instances of its kind
rather than all of them, and a resource of a kind the table names is bound by that row.
Should run one unit alone where a row needs a measurement no run has taken yet, and
should bound the launch by that row once the run has taken it.

Should reconcile a pipeline stage's launch with the cheapest-check-first order of the
section Fast Feedback First of `ci-cd-and-automation`, by what the stage cancels. A stage
should launch every independent unit at once where it cancels the rest of that stage on
the first failure, which the key `fail-fast` of a `strategy` block does at its default of
`true` over the jobs of one matrix. A stage cancelling nothing should still launch every
unit at once, except that it should run one check alone first where no other unit of the
stage can pass if that check fails, taking the one with the shortest recorded run time
or, where none is recorded, the cheapest to run. The key `cancel-in-progress` of a
`concurrency` block, which sits at workflow or job level, cancels a run or a job a newer
one of the same group replaces, and decides nothing here.

The rule reaches a build launched by the commands `make -j`, `cmake --build <dir> -j` or
`ninja -j`, whose default sits above the bound the table gives; a test run launched by
`ctest -j`, or by `node --test`, whose degree the flag `--test-concurrency=<n>` sets; a set of checks over one change, whether several tools or
one tool in several configurations, the jobs of one pipeline stage included; and the
dispatch of several agents in one message. Nothing else belongs to that list.

## What a Milestone Plan Should Contain

A milestone is a checkpoint, not just a date. State for each one:

- **Scope** — which increments land in this milestone, specifically.
- **Sequence** — what must finish before this milestone can start.
- **Risk** — what's uncertain about this milestone specifically, not the project as a
  whole.
- **Exit criteria** — how you know the milestone is actually done, not just "time's
  up." Tie this to the acceptance criteria from `requirements` where possible.

A plan that's only a list of dates with no scope or exit criteria attached can't be
checked against reality — it just gets quietly redefined as the dates slip.

## Status Updates

A status update earns its place by changing what the reader does next — report what
changed since the last update, what's blocked and on what, and what the next checkpoint
is. "Things are progressing" tells the reader nothing actionable; "increment 2 is
blocked on the external API's rate-limit fix, ETA from their team is Friday" tells them
exactly what to watch for and who to follow up with.
