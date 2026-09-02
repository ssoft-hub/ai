---
name: issue-rules
version: "1.0.0"
description: Apply when creating or reviewing tracker issues
license: Unlicense
metadata:
  author: ssoft
  tier: narrow
  bound-to:
    - tracker
  tags:
    - git
    - issues
    - tracker
---

# Skill: Issue Rules

Apply when creating or reviewing tracker issues (GitHub Issues, Jira, Linear, …).

This skill states what an issue must contain. The step of the work each act on it runs
at belongs to `work-sequence`, and the command that creates it, labels it, or comments on
it to the CLI skill of the issue tracker.

## Project Overrides

**Must**

Must follow the issue conventions the repository's `AGENTS.md` file or a project skill
defines, instead of the rule here.

---

## Title

```
Type(scope): Subject description
```

- **Type** — capitalized (see Types below).
- **Scope** — optional; component or module the issue targets.
- **Subject** — imperative mood, uppercase first letter after the colon, no trailing period, ≤ 80 characters total.

```
Feat(hash): Add SipHash-2-4 keyed 64-bit hash
Fix(auth): Token expiry check uses < instead of <=
Chore: Update CI runner to Ubuntu 24.04
```

---

## Types

The same set as `commit-rules` → Types, which owns what each one means. The only
difference an issue makes is capitalization:

`Feat`, `Fix`, `Refactor`, `Perf`, `Docs`, `Test`, `Chore`, `Ci`, `Style`

---

## Description Template

### Feature / improvement

```markdown
## Goal
What problem does this solve and why now.

## Acceptance criteria
- [ ] Criterion one
- [ ] Criterion two

## Test plan
- [ ] How to verify criterion one (manual steps or automated test name)
- [ ] Edge cases to cover

## Out of scope
What is explicitly not part of this issue.
```

### Bug

```markdown
## Problem
What is broken and what is the impact.

## Steps to reproduce
1. Step one
2. Step two

## Expected behaviour
What should happen.

## Actual behaviour
What happens instead.

## Test plan
- [ ] Regression test that would have caught this bug
- [ ] Steps a reviewer can run to confirm the fix

## Environment
OS, version, relevant config.
```

---

## Labels

Every issue gets at most one **type** label, matching the title Type, when one applies:

| Label | Title Types it covers |
|-------|------------------------|
| `Feature` | `Feat` |
| `BUG` | `Fix` |
| `Refactor` | `Refactor` |

Title types other than these three (see Types above) carry no label — the title prefix alone is enough.

Every issue also gets a few **topic** labels (2-4, not a tag cloud) — named after the
actual subject matter (component, subsystem, domain concept), not drawn from a fixed
list. Before creating one, list the tracker's existing labels — the CLI skill of the
issue tracker states the command, in its issues section — and reuse one covering the
same topic; create a new topic label only the first time a topic has no match. Topic
labels grow organically with the project.

```
Feat(threat-analysis): Add short-term conflict alert algorithm
→ Feature, STCA, Safety Nets, Algorithm, ATCS
```

Set labels when the issue is created, not after. The PR carries the same labels — the
type label if the issue has one, plus its topic labels — see `pr-rules` → Pre-Open
Checklist.

---

## Priority

| Level | Meaning |
|-------|---------|
| P0 | Blocker — production broken or security issue |
| P1 | High — significant user impact, next sprint |
| P2 | Medium — normal backlog |
| P3 | Low — nice to have, no deadline |

Default when unset: **P2**.

---

## Milestone

Assign to a milestone when the issue must ship in a specific release. Leave unset for backlog items with no committed date.

---

## Lifecycle

```
Open → In Progress → In Review → Done
                              ↘ Closed (won't fix / duplicate)
```

- **Open** — triaged, not started.
- **In Progress** — branch exists (see `commit-rules` Branch Naming).
- **In Review** — the change is offered for review (`work-sequence` → The Sequence).
- **Done** — merged and deployed, with every checklist checkbox in the issue checked (reconciled at the Pre-merge issue check step, `work-sequence` → The Sequence). If checkboxes remain after merge, stay **In Review** with a follow-up PR/MR linked — do not mark Done.
- **Closed** — explicitly not going to be fixed; add a comment explaining why.

---

## Progress Comments

Track implementation progress in comments, not only checkboxes:

- When a PR/MR is opened against this issue, comment which checklist items it addresses.
- When a PR/MR merges, comment which items it resolved and update the corresponding checkboxes to match.
- When items remain open after a merge, comment that a follow-up PR/MR is needed, and link it once it exists.

A reader should be able to reconstruct, from comments alone, which PR/MR implemented which requirement.

---

## Cross-References

- `work-sequence` — the step of the work each act on this issue runs at, and the condition behind each lifecycle state.
- `commit-rules` — branch naming convention references the issue identifier (`TRACKER-N`).
- `pr-rules` — PR title and description mirror the issue being resolved; its Pre-Merge Checklist gates merge on this issue's checkbox state.
- The CLI skill of the issue tracker — the commands that create, label, and comment on an issue.
