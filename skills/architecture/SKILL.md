---
name: architecture
version: "1.0.0"
description: Apply when designing system or module architecture, evaluating architectural tradeoffs, writing an Architecture Decision Record, or choosing between competing designs
license: Unlicense
metadata:
  author: ssoft
  tags:
    - architecture
    - planning
---

# Skill: Software Architecture Design

Apply when designing system or module architecture, evaluating tradeoffs between
competing designs, or writing an Architecture Decision Record (ADR).

- This skill covers how modules/services/processes fit together. A single public
  interface's own hygiene (namespacing, no `void*`, breaking-change policy) →
  `api-design` skill.
- Modelling one bounded context's domain objects and invariants → `ddd` skill.
  Architecture decides where the boundaries between contexts are; `ddd` decides what
  goes on inside one of them.
- The requirements that motivate an architectural decision should already exist →
  `requirements` skill. Don't design against an unstated requirement.

## Project Overrides

Project-local rules win. If the repository's `AGENTS.md` or a project skill defines its
own architecture process or ADR location, follow those instead. This skill is the
fallback for projects that do not specify their own.

---

## When Architecture Work Is Warranted

Not every change needs an architectural decision. The signal that it does: the
decision is expensive to reverse (changes a module boundary, a data ownership model, a
synchronous/asynchronous split, a build vs buy call), or it constrains future
decisions in a way that's hard to see from inside a single PR. A decision you could
freely change next week in one PR doesn't need this ceremony — write the code, explain
it in the commit body, move on. Forcing an ADR on every small decision trains people to
skip the process for the ones that actually matter.

## Architecture Decision Record (ADR) Format

```markdown
# ADR-<n>: <short title>

## Context
What situation/requirement made a decision necessary. What constraints applied.

## Decision
What was decided, stated plainly — one sentence if possible.

## Alternatives Considered
Each alternative and why it was rejected. Not exhaustive — the ones seriously weighed.

## Consequences
What this makes easier, what it makes harder, what it forecloses. Include the
downsides — an ADR that only lists upsides reads as advocacy, not a decision record,
and won't help the next person who hits the downside in production.
```

Store ADRs wherever the project's `AGENTS.md` specifies; if unspecified, a flat
`docs/adr/NNNN-title.md` sequence is a reasonable default — the point of numbering is
a stable reference (`ADR-0007`) that a commit or PR description can point at.

## Common Tradeoff Axes

Naming the axis you're trading off on makes the decision legible to someone reviewing
it later, instead of looking like an arbitrary preference:

- **Coupling vs duplication** — sharing code couples two call sites to one
  implementation; duplicating avoids the coupling at the cost of two things to keep in
  sync. Favor duplication until the shared logic has proven it changes for the same
  reason in both places.
- **Consistency vs availability** — under partition or failure, can you stay correct or
  must you stay responsive? Most internal-tool architectures over-index on consistency
  by default without ever interrogating whether availability matters more here.
- **Build vs buy/reuse** — building gives full control and a maintenance burden; reuse
  trades control for less code to own. Check `api-design`'s "no runtime dependencies in
  public API" rule before reuse decisions that would leak a third-party type across a
  public boundary.
- **Synchronous vs asynchronous boundary** — sync is easier to reason about and debug;
  async decouples failure/load between components at the cost of that ease.

## Evaluating Competing Designs

When two or more designs are genuinely in contention, write out each one's answer to
the same set of questions rather than describing them in different terms — that's what
makes the comparison real instead of rhetorical:

- What does it cost to build, and what does it cost to change later?
- What does it cost to operate (debug, monitor, scale)?
- What failure modes does it introduce, and how would you detect them?
- Which tradeoff axis (above) does it lean on, and is that the right lean for this
  context specifically — not as a general preference?

## Keeping Decisions Honest

An architecture decision is a bet under uncertainty, not a proof. State the
assumptions it depends on (expected load, team size, lifespan of the system) so that
when one of those assumptions stops holding, whoever's reading the ADR can tell the
decision needs revisiting — rather than treating it as permanent because no one wrote
down why it was made.
