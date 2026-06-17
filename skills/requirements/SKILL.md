---
name: requirements
version: "1.0.0"
description: Apply when eliciting requirements, writing user stories or use cases, defining acceptance criteria, or turning a vague ask into a spec before design starts
license: Unlicense
metadata:
  author: ssoft
  tags:
    - requirements
    - planning
---

# Skill: Requirements Gathering

Apply when eliciting requirements, writing user stories or use cases, defining
acceptance criteria, or turning a vague ask into a spec before design starts.

- Once a requirement is settled and design begins → `architecture` skill.
- The vocabulary used while gathering requirements should become the vocabulary used
  in the domain model, not get re-invented later → `ddd` skill.
- Breaking settled requirements into shippable work → `project-planning` skill.

## Project Overrides

Project-local rules win. If the repository's `AGENTS.md` or a project skill defines its
own requirements process, follow those instead. This skill is the fallback for projects
that do not specify their own.

---

## Why Write This Down at All

A requirement that lives only in a chat message gets reinterpreted differently by
whoever implements it, whoever tests it, and whoever reviews it — each fills the gaps
with their own assumption. Writing it down once, in a shared format, means everyone
fills the gaps the same way, and disagreements surface before code is written instead
of in review.

## Structure of a Requirement

Every requirement should make these explicit, even briefly:

- **Actor** — who wants this (a user role, an external system, an internal caller).
- **Goal** — what they're trying to achieve, not the mechanism for achieving it.
- **Context** — when/why this comes up; the situation that triggers the need.

If you can't fill in actor and goal, the request isn't a requirement yet — it's a
solution looking for a problem. Push back and ask what it's for before specifying how.

## User Story Format

```
As a <role>, I want <goal>, so that <benefit>.
```

The "so that" clause is not decoration — it's what lets you tell whether a proposed
implementation actually satisfies the requirement, or just satisfies the literal
wording while missing the point.

### Acceptance Criteria (Given/When/Then)

```
Given <starting state>,
When <action>,
Then <observable outcome>.
```

Write acceptance criteria as outcomes a reviewer or tester can check without reading
the implementation — "the export finishes in under 2 seconds for a 10k-row file," not
"the export is fast." A criterion that can't be checked isn't a criterion, it's a hope.

## Functional vs Non-Functional

- **Functional** — what the system does (behavior, inputs/outputs, business rules).
- **Non-functional** — how well it does it (performance, security, availability,
  usability) and constraints it must operate under (compliance, platform support).

Non-functional requirements are easy to omit because they're rarely volunteered by the
person asking — "fast," "secure," and "works offline" are usually implied, not stated.
Ask explicitly rather than assuming silence means "no constraint."

## Flagging Ambiguity and Conflict

When a requirement is ambiguous (admits more than one reasonable interpretation) or
conflicts with an existing one, say so before proceeding — don't silently pick an
interpretation and hope it's the right one. A wrong guess costs far more once it's
built than a clarifying question costs now.

## Definition of Done

State up front what "done" means for the requirement: which acceptance criteria must
pass, what documentation/tests are expected, what's explicitly out of scope. A
requirement without a stated boundary tends to grow during implementation as edge
cases get discovered — better to decide the boundary deliberately than let it drift.

## Traceability

Keep a requirement traceable to what it produced: which design decision addressed it,
which code/tests implement it. This doesn't need heavyweight tooling for small
projects — a reference in a commit body, PR description, or ADR (see `architecture`
skill) is often enough. The point is being able to answer "why does this code exist"
without archaeology.
