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
at belongs to `work-sequence`, and the command that searches for it, creates it, labels it,
assigns it or comments on it to the CLI skill of the issue tracker.

## One Issue per Concern

**Should**

The author should create an issue only where no open issue carries the same concern,
which a search of the open issues by the words of the concern establishes before the
issue is created; the CLI skill of the issue tracker states the command, in its issues
section. Where an open issue carries the concern, the author should add the ask there as
an acceptance criterion, with a comment naming what was added. A duplicate that reaches
the tracker in spite of the search takes the state Lifecycle (below) gives it, `Closed`.

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

An issue body must carry the sections of the template for its type and no section
outside them, so that a heading the writer invents is not where the origin of the
problem is recorded. `Fix` takes the Bug template; every other type takes Feature /
improvement. The `## Acceptance criteria` slot of either template must take what a
criterion states from `requirements` → Acceptance Criteria (Given/When/Then), and this
skill restates nothing of it.

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

## What an Issue Names

**Should**

An issue should name only what its problem or its criteria turn on: no other issue,
branch, skill, section, finding or artifact whose absence would leave every criterion
stating the same thing. One question settles a name: can the work on this issue start
before the named thing is done? Where it can, the author should cut the name, since
whoever takes the issue up, in whatever order the backlog is worked, would otherwise wait
on that thing or cite what never reaches the tree; where it cannot, the name is a
dependency and stays.

An issue should carry the circumstances the problem was found under — a review, a
session, the branch the defect surfaced on — only where they are part of the problem.

A reader should read each name in the issue against the criteria, and should cut a name
no criterion needs.

| Defective | Corrected |
|---|---|
| "Found reviewing PR #<n> on the branch of GH-<n>, in the reviewer's third comment: `<skill>` → <Section> states no limit on the length of a line." | "`<skill>` → <Section> states no limit on the length of a line." |

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

**Should**

```
Open → In Progress → In Review → Done
  ↘         ↘            ↘
   Closed (won't fix / duplicate)
```

- **Open** — triaged, not started.
- **In Progress** — branch exists; the assignee field, where the tracker has one, should name the user the `<user>` segment of the branch name carries (`commit-rules` → Branch Naming).
- **In Review** — the change is offered for review (`work-sequence` → The Sequence).
- **Done** — the change sits on the target branch after the merge, with every checklist checkbox in the issue checked (reconciled at the Pre-merge issue check step, `work-sequence` → The Sequence). Whether what it delivers has reached a user is no state of the issue: the release carries that, under `shipping-and-launch`.
- **Closed** — explicitly not going to be fixed, or a duplicate of an open issue; a comment should state which, naming the issue a duplicate repeats.

Closing the issue on the tracker is an act; `Done` and `Closed` are states an issue closed
on the tracker stands in, and a reader should tell them apart by the artifact below, never
by the act.

A reader should read a state off the tracker's state field where that field carries these
states, else off the artifact whose existence defines the state — the issue itself, with
none of the other artifacts existing, for `Open`; the branch for `In Progress`; the offer
for review for `In Review`; the merge for `Done`; the closing comment for `Closed` — so
that no state requires a label the project has not declared.

An issue in `In Progress` or `In Review` with the assignee field empty is a defect of the
issue; one in `Open` with the field set is not.

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
- The CLI skill of the issue tracker — the commands that search for, create, label, assign, and comment on an issue.
