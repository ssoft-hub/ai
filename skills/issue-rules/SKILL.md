---
name: issue-rules
version: "1.0.0"
description: Apply when creating or reviewing tracker issues
license: Unlicense
metadata:
  author: ssoft
  tags:
    - git
    - issues
    - tracker
---

# Skill: Issue Rules

Apply when creating or reviewing tracker issues (GitHub Issues, Jira, Linear, …).

## Project Overrides

Project-local rules win. If the repository's `AGENTS.md` or a project skill defines its own issue conventions, follow those instead. This skill is the fallback for projects that do not specify their own.

---

## Title

```
Type(scope): Subject description
```

- **Type** — capitalized (see Types table below).
- **Scope** — optional; component or module the issue targets.
- **Subject** — imperative mood, uppercase first letter after the colon, no trailing period, ≤ 80 characters total.

```
Feat(hash): Add SipHash-2-4 keyed 64-bit hash
Fix(auth): Token expiry check uses < instead of <=
Chore: Update CI runner to Ubuntu 24.04
```

---

## Types

| Type | When |
|------|------|
| `Feat` | New user-visible functionality |
| `Fix` | Bug or regression |
| `Refactor` | Code change with no behaviour change |
| `Perf` | Performance improvement |
| `Docs` | Documentation only |
| `Test` | Test additions or changes |
| `Chore` | Build, tooling, dependency updates |
| `Ci` | CI/CD workflow changes |
| `Style` | Formatting only (no logic change) |

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

Apply at most one type label (matches the title Type). Additional labels are orthogonal:

| Label | When |
|-------|------|
| `breaking` | Public API change |
| `blocked` | Cannot proceed — link the blocker |
| `good first issue` | Self-contained, low risk |
| `needs-design` | Requires ADR or design doc before implementation |

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
- **In Review** — PR open.
- **Done** — merged and deployed, with every checklist checkbox in the issue checked (see `pr-rules` → Pre-Merge Checklist). If checkboxes remain after merge, stay **In Review** with a follow-up PR/MR linked — do not mark Done.
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

- `commit-rules` — branch naming convention references the issue identifier (`TRACKER-N`).
- `pr-rules` — PR title and description mirror the issue being resolved; Pre-Merge Checklist gates merge on this issue's checkbox state.
