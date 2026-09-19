---
name: issue-rules
version: "1.0.0"
description: Apply when creating or reviewing tracker issues
license: Unlicense
metadata:
  author: ssoft
  tier: narrow
  rubric: applied
  bound-to:
    - tracker
  tags:
    - git
    - issues
    - tracker
---

# Skill: Issue Rules

Apply when creating or reviewing tracker issues (GitHub Issues, Jira, Linear, …).

## One Issue per Concern

**Should**

The author should create an issue only where a search of the open issues by the words of
the concern returns none carrying it. Where an open issue carries the concern, the author
should add the ask there as an acceptance criterion, with a comment naming what was added.

## One Issue, One Merge

**Must**

Whether an issue is split into subtasks settles what closes it and how many PR/MR it
carries:

| The issue | What closes it | PR/MR it carries |
|---|---|---|
| an unsplit issue, and a subtask, which is an issue in its own right | the merge of one PR/MR meeting every acceptance criterion it carries | one |
| a parent issue | the condition Lifecycle below reads off its subtasks | none |

A parent issue's `## Acceptance criteria` carries its subtasks, one per item, and no
criterion of its own: every criterion of the work stands on the subtask meeting it,
establishable there from that subtask's branch and PR/MR.

A PR/MR resolves the issue it is attached to whole: a PR/MR merging against an issue
carrying a criterion it does not meet is the defect, and no occasion to name the issue
that carries the rest. Where the work turns out to exceed the issue, the author must
split it into subtasks as soon as that is known, whether or not a PR/MR is already open,
each subtask carrying the criteria that part meets, and must attach an open PR/MR to the
subtask it resolves before that PR/MR merges. The count holds of an issue's merges
alone: one PR/MR resolving several issues is no defect.

## Title

**Must**

An issue title must read `Type(scope): Subject description`, where:

- **Type** — capitalized (see Types below).
- **Scope** — optional; component or module the issue targets.
- **Subject** — imperative mood (`Compare token expiry with <= instead of <`), uppercase first letter after the colon, no trailing period, ≤ 80 characters total.

## Types

**Must**

An issue's type must be one of the types `commit-rules` → Types lists, capitalised:

`Feat`, `Fix`, `Refactor`, `Perf`, `Docs`, `Test`, `Chore`, `Ci`, `Style`

## Description Template

**Must**

An issue body must carry the sections of the template for its type and no section outside
them. `Fix` takes the Bug template; every other type takes Feature / improvement. The
`## Acceptance criteria` slot of either template must take what a criterion states from
`requirements` → Acceptance Criteria (Given/When/Then). Each item of the `## Test plan`
slot must name a check with an observable result, produced by the branch or by a reviewer
following the item — a command that was run, a test that covers the behaviour, steps
ending in something a reader can see.

Each slot must carry what the table gives it and nothing besides:

| Slot | What it carries |
|---|---|
| `## Acceptance criteria` | one condition per criterion, ticked by one observation; a conjunction, a comma or a semicolon joining two conditions a reader would check apart makes two criteria |
| `## Test plan` | one check per item |
| `## Steps to reproduce` | one action per step |
| `## Goal`, `## Problem` | the symptom, its cost and what triggers it, and nothing else: no history of the discovery, no reasoning that led to the requirement, no alternative that was weighed |

Every criterion must be establishable at or before the merge that closes the issue, from
the branch and the PR/MR. A condition first establishable after that merge — after a
release, after a deployment, after another issue's work, after a user acts — is no
criterion of this issue and must go to whatever owns that moment.

### Feature / improvement

```markdown
## Goal
What is wrong today, what it costs, and what triggers it.

## Acceptance criteria
- [ ] Criterion one
- [ ] Criterion two

## Test plan
- [ ] How to verify criterion one (manual steps or automated test name)
- [ ] How to verify criterion two (manual steps or automated test name)
```

### Bug

```markdown
## Problem
What is broken, what it costs, and what triggers it.

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

## What a Sentence of the Body States

**Should**

Every sentence of an issue body should state the problem, a criterion, an item of the test
plan, or a condition of one of those, in the register the `writing-style` skill fixes, and
the author should cut a sentence stating none of them.

## What an Issue Names

**Should**

An issue should name only what its problem or its criteria turn on: no other issue,
branch, skill, section, finding or artifact whose absence would leave every criterion
stating the same thing. One question settles a name: can the work on this issue start
before the named thing is done? Where it can, the author should cut the name; where it
cannot, the name is a dependency and stays. An issue should carry the circumstances the
problem was found under — a review, a session, the branch the defect surfaced on — only
where they are part of the problem.

## Labels

**Should**

Every issue should get at most one **type** label, matching the title Type when one
applies, spelled as the table gives it:

| Label | Title Types it covers |
|-------|------------------------|
| `Feature` | `Feat` |
| `BUG` | `Fix` |
| `Refactor` | `Refactor` |

An issue whose title type is outside the three should carry no type label. Every issue should
also get 2-4 **topic** labels named after its subject matter — a component, a subsystem, a domain
concept — and the author should list the tracker's existing labels first and reuse one covering
the same topic, creating one only where none does. The topic labels of one project should share
one capitalisation, the project's own. Should set labels when the issue is created, not after.

## Priority

**Should**

An issue should carry one of these levels:

| Level | Meaning |
|-------|---------|
| P0 | Blocker — production broken or security issue |
| P1 | High — significant user impact, next sprint |
| P2 | Medium — normal backlog, and the level of an issue with none set |
| P3 | Low — nice to have, no deadline |

## Milestone

**Should**

Should assign to a milestone when the issue is to ship in a specific release, and leave it unset for a backlog item with no committed date.

## Lifecycle

**Should**

This skill states the conditions the work stands in, each read off an artifact, under a
name of its own that binds no tracker:

| Condition | The artifact it is read off | Name used here |
|---|---|---|
| the issue is triaged, and none of the artifacts below exists | the issue | `Open` |
| the work is taken up | the branch | `In Progress` |
| the work on a parent issue is taken up | any subtask of it whose own work is taken up | `In Progress` |
| the work is offered for review | the offer for review (`work-sequence` → The Sequence) | `In Review` |
| the change is merged | the change standing in the target branch and meeting every criterion of the issue (One Issue, One Merge above, reconciled at the Pre-merge issue check step, `work-sequence` → The Sequence) | `Done` |
| the work on a parent issue is complete | its subtasks, every one of them closed | `Done` |
| the work is dropped | the comment stating that the issue is not going to be fixed, or naming the open issue it duplicates | `Closed` |

A project should state once, where it keeps its conventions, which of its tracker's states
each condition maps to; where a project states none, a reader should read the condition off
the artifact beside it rather than off a field. Whether what the merge delivers has reached
a user is no condition of the issue: the release carries that, under `shipping-and-launch`.

From the branch on, the assignee field, where the tracker has one, should name the user
the `<user>` segment of the branch name carries (`commit-rules` → Branch Naming); an empty
field once the branch exists is a defect of the issue, and an empty field before it is not.

## Progress Comments

**Should**

Should track implementation progress in comments, not only checkboxes, so that a reader
can reconstruct from the comments alone which PR/MR implemented which requirement:

- When a PR/MR is opened against this issue, should comment which checklist items it addresses.
- When a PR/MR merges, should comment which items it resolved and update the corresponding checkboxes to match.

## Cross-References

**Recommended**

- `work-sequence` — the step of the work each act on this issue runs at, and the artifact each condition of the Lifecycle above is read off.
- `commit-rules` — branch naming convention references the issue identifier (`TRACKER-N`).
- `pr-rules` — PR title and description mirror the issue being resolved; its Pre-Merge Checklist gates merge on this issue's checkbox state.
- `writing-style` — prose register in the body of an issue and in its comments.
- The CLI skill of the issue tracker — the commands that search for, create, label, assign, and comment on an issue.
