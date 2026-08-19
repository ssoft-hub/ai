---
name: architecture
version: "1.0.0"
description: Apply when designing system or module architecture, evaluating architectural tradeoffs, writing an Architecture Decision Record, or choosing between competing designs
license: Unlicense
metadata:
  author: ssoft
  tier: process
  tags:
    - architecture
    - planning
---

# Skill: Software Architecture Design

Apply when designing system or module architecture, evaluating tradeoffs between
competing designs, or writing an Architecture Decision Record (ADR).

- This skill covers how modules/services/processes fit together. A single public
  interface's own hygiene (namespacing, no `void*`, breaking-change policy) →
  `cpp-api-design` skill.
- Modelling one bounded context's domain objects and invariants → `ddd` skill.
  Architecture decides where the boundaries between contexts are; `ddd` decides what
  goes on inside one of them.
- The requirements that motivate an architectural decision should already exist →
  `requirements` skill. Don't design against an unstated requirement.
- Quality Priorities below ranks security, performance, controllability and the rest
  against one another, and defines each only closely enough to be ranked. Hardening a
  trust boundary → `security-and-hardening` skill; investigating and budgeting one
  performance problem → `performance-optimization` skill; instrumenting a running system
  so its qualities can be read at all → `observability-and-instrumentation` skill. The
  ranking is this skill's; the measurement is theirs.

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

Where a decision record goes is a requirement rather than a path. It has to carry a
stable reference a commit or a pull request description can point at (`ADR-0007`, a wiki
permalink, an issue id), be reachable by everyone who will read it, and outlive the
decision it records. A file in the repository meets that, and so does a wiki page, a
tracker issue, or a page in Confluence or Notion; which of them applies comes from the
project's own conventions — its `AGENTS.md`, or wherever else that project keeps them.

Where the project states none, ask where the record goes and whether this project keeps
such records at all, and choose neither silently. When Architecture Work Is Warranted
above answers whether the decision is worth recording; only the project answers where the
record lives. What a reader checks is the record's location against the two things allowed
to have chosen it — a stated project convention, or an answer to that question in the
thread the decision came out of. A record sitting somewhere neither of those names was
placed by the agent, which is what this rule forbids.

## Quality Priorities

A design gives up one quality to get another. These are the seven qualities in play. Row
order is the order of precedence, highest first; each row names the quantity measured and
the artifact it is measured on:

| Quality | Quantity measured | Artifact it is measured on |
|---|---|---|
| **Reliability** | the rate, per operation attempted, of runs ending in a wrong result, a crash or a hang, a wrong result counted whether or not the process also stopped | a fault-injection set held fixed between measurements |
| **Security** | the number of reachable source-sink pairs on which untrusted input arrives at a privileged operation unvalidated | the call graph of the built system, across the trust boundaries `security-and-hardening` draws |
| **Controllability** | the share of six operator actions — halt, drain, roll back, change the log level, disable one feature, read the current state — supported without a rebuild | the deployed build |
| **Performance** | the wall-clock time and the throughput of the operations the requirement names | the built program under a stated workload |
| **Compactness** | the peak and steady-state resident set — memory at run time, not the size of the source or of the built binary — plus every byte it causes to be held outside its own process and released when it exits | the running build under the workload performance is measured on |
| **Modularity** | the number of reference sites reaching the symbols a representative change inside the boundary under discussion would touch, each site counted separately | the reference graph of the current tree |
| **Portability** | the number of platform-conditional sites — a platform `#if`, a per-platform build branch, a call into a platform-specific API | the current tree, whether or not a port has yet been attempted |

**Controllability** is operational control, not the developer reading in which control
means the code does nothing implicit: that reading is code hygiene and would not earn
rank 3, while an operator who cannot halt or roll back a running build cannot contain a
reliability or a security failure either.

**Compactness** excludes the source and binary readings because all three are in
circulation and they pull opposite ways: where the source reading would conflict with
modularity, this one conflicts with performance. The release-on-exit bound is what keeps
a spill file, a mapping and a child process inside the measurement, and a shared service
the program merely calls outside it.

**Modularity** counts each reference site where it stands, never collapsed to one per file
or module. Collapsed that way, a program merged into a single unit would score best where
it should score worst, and the metric would reward removing the very boundaries it exists
to protect.

The list is complete at seven: a property not on it is an instance of one of them, or it
is a quality this order does not settle, and step 5 below says what to do then. The order
is itself a fallback: a project whose `AGENTS.md` states an order, or a list of operator
actions, of its own wins, under Project Overrides above.

### Settling a Conflict Between Two Qualities

Two qualities conflict when the decision cannot hold both. Five steps, in order:

1. Name each side as one of the seven, by the definitions above rather than by the word
   the proposal uses for it.
2. Read the task's stated requirements — the issue, the spec, the ADR's own Context —
   for a budget or a threshold on either side. A stated requirement fixes that quality
   for this decision and overrides the order: a latency budget named in the issue raises
   performance above every quality the order puts before it. A quality no requirement
   speaks about is left to the order.
3. Where no stated requirement decides it, the quality earlier in the list wins. The
   order settles what the requirements leave open, and it settles nothing between two
   facets of a single quality — those go back to step 2, and on to step 5 when step 2
   was silent.
4. Name what the decision spent and how much of it, then take the cheaper variant when
   one exists. The order is not licence to spend a lower quality freely: a variant
   returning most of the gain for less of the loss is the decision, and carrying the
   winning quality to its limit is a defect rather than compliance. What a decision
   looks for is the balance between the two, not the maximum of the leftmost one.
5. Two conflicts leave the four steps above without an answer: a side that is neither on
   the list nor an instance of one — usability and compliance are the common cases — and
   a conflict between two facets of one quality that step 2 found no requirement for.
   Neither is the order's to settle, so take it back to whoever owns the requirement.
   Where that answer cannot be waited for, decide on a stated assumption, in the shape
   Keeping Decisions Honest gives one, then return to step 4 for the decision you took
   and record the assumption where step 4's statement goes.

An ADR recording such a decision carries steps 1, 2 and 4 in its Consequences, and the
commit body carries them for a decision that gets no ADR: which quality was given up, by
how much, and against which stated requirement or which position in the order.

## Common Tradeoff Axes

Naming the axis you're trading off on makes the decision legible to someone reviewing
it later, instead of looking like an arbitrary preference. Name the axis, then name the
quality on each side of it; Quality Priorities above settles which side may be spent:

- **Coupling vs duplication** — sharing code couples two call sites to one
  implementation; duplicating avoids the coupling at the cost of two things to keep in
  sync. Favor duplication until the shared logic has proven it changes for the same
  reason in both places — the preference follows from modularity, and it reverses once a
  divergence between the copies starts producing wrong results, since reliability
  outranks modularity.
- **Consistency vs availability** — under partition or failure, can you stay correct or
  must you stay responsive? Most internal-tool architectures over-index on consistency
  by default without ever interrogating whether availability matters more here. Both
  sides of this axis are reliability — a wrong result on one, a stopped run on the
  other — so the order settles nothing here: the stated requirement does, or step 5
  where it is silent.
- **Build vs buy/reuse** — building gives full authority over the implementation and a
  maintenance burden; reuse trades that authority for less code to own. Reuse puts
  reliability, security and portability at risk together — a defect you cannot fix on
  your own schedule, in a dependency that may not exist on the further target — against
  the volume of code you own, which is not one of the seven, so this axis reaches step 5
  rather than the order. Check `cpp-api-design`'s "no runtime dependencies in
  public API" rule before reuse decisions that would leak a third-party type across a
  public boundary.
- **Synchronous vs asynchronous boundary** — sync is easier to reason about and debug;
  async decouples failure/load between components at the cost of that ease. Async buys
  reliability under partial failure and performance under load, and spends
  controllability — in-flight work is harder to observe and to halt — against the
  reliability it puts back at risk in the extra states it introduces.

## Evaluating Competing Designs

When two or more designs are genuinely in contention, write out each one's answer to
the same set of questions rather than describing them in different terms — that's what
makes the comparison real instead of rhetorical:

- What does it cost to build, and what does it cost to change later?
- What does it cost to operate (debug, monitor, scale)?
- What failure modes does it introduce, and how would you detect them?
- Which tradeoff axis (above) does it lean on, and which quality does that lean spend?
  Settle it under Quality Priorities — the stated requirements first, then the order.

## Keeping Decisions Honest

An architecture decision is a bet under uncertainty, not a proof. State the
assumptions it depends on (expected load, team size, lifespan of the system) so that
when one of those assumptions stops holding, whoever's reading the ADR can tell the
decision needs revisiting — rather than treating it as permanent because no one wrote
down why it was made.
