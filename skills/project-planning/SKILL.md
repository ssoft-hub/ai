---
name: project-planning
version: "1.0.0"
description: Apply when scoping work, breaking a feature down into tasks, estimating effort, sequencing milestones, identifying risk or dependencies, or writing a project plan or status update
license: Unlicense
metadata:
  author: ssoft
  tags:
    - planning
    - project-management
---

# Skill: Project Planning & Management

Apply when scoping work, breaking a feature into tasks, estimating effort, sequencing
milestones, identifying risk/dependencies, or writing a project plan or status update
meant for stakeholders.

- This is for project-level planning artifacts shared with stakeholders — a roadmap, a
  scoping doc, a status report. It is not the same thing as Claude's own in-conversation
  task plan (the `Plan`/writing-plans tooling used to plan a single coding task); don't
  conflate the two, and don't apply this skill's ceremony to a plan that's just
  "what I'm about to do this turn."
- A plan is built from settled requirements — if those don't exist yet, go get them
  first → `requirements` skill.
- PR Size discipline and the release checklist are the execution-time tail end of a
  plan made here → `pr-rules`, `release` skills.

## Project Overrides

Project-local rules win. If the repository's `AGENTS.md` or a project skill defines its
own planning process or templates, follow those instead. This skill is the fallback
for projects that do not specify their own.

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
