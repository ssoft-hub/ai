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

## What Closes an Issue

**Must**

Whether an issue is split into subtasks settles what closes it:

| The issue | What closes it |
|---|---|
| an unsplit issue, and a subtask, which is an issue in its own right | one delivery of the work meeting every acceptance criterion it carries |
| a parent issue | the condition Lifecycle below reads off its subtasks |

A parent issue's `## Acceptance criteria` carries its subtasks, one per item, and no
criterion of its own: every criterion of the work stands on the subtask meeting it,
establishable there from what that subtask delivers.

Where the work turns out to exceed the issue, the author must split it into subtasks as
soon as that is known, each subtask carrying the criteria that part meets.

## Title

**Must**

An issue title must read `Type(scope): Subject description`, where:

- **Type** — capitalized (see Types below).
- **Scope** — optional; component or module the issue targets.
- **Subject** — imperative mood (`Compare token expiry with <= instead of <`), uppercase first letter after the colon, no trailing period, ≤ 80 characters total.

## Types

**Should**

An issue's type should be one of these, each against what an issue of that type covers:

| Type | What the issue covers |
|---|---|
| `Feat` | functionality a user does not have yet |
| `Fix` | behaviour that departs from what the software states it does |
| `Refactor` | the shape of the code or the text, with nothing a user sees changed |
| `Perf` | a measured cost — time, memory, size — that the work brings down |
| `Docs` | what a reader is told, in documentation or in a comment |
| `Test` | behaviour no test reaches yet |
| `Chore` | the build, the tooling, a dependency or a module reference |
| `Ci` | the pipeline running the project's checks |
| `Style` | formatting alone, with no logic and no wording changed |

A project should add the type its own work needs where none of these names it.

## Description Template

**Must**

An issue body must carry the sections of the template for its type and no section outside
them. `Fix` takes the Bug template; every other type takes Feature / improvement. The
`## Acceptance criteria` slot of either template must take what a criterion states from
`requirements` → Acceptance Criteria (Given/When/Then). The body must carry no plan of
the checks that establish those criteria.

Each slot must carry what the table gives it and nothing besides:

| Slot | What it carries |
|---|---|
| `## Acceptance criteria` | one condition per criterion, ticked by one observation; a conjunction, a comma or a semicolon joining two conditions a reader would check apart makes two criteria |
| `## Steps to reproduce` | one action per step |
| `## Goal`, `## Problem` | the symptom, its cost and what triggers it, and nothing else: no history of the discovery, no reasoning that led to the requirement, no alternative that was weighed |

Every criterion must be establishable at or before the issue closes, from what the work
delivers. A condition first establishable after that — after a release, after a
deployment, after another issue's work, after a user acts — is no criterion of this
issue and must go to whatever owns that moment.

### Feature / improvement

```markdown
## Goal
What is wrong today, what it costs, and what triggers it.

## Acceptance criteria
- [ ] Criterion one
- [ ] Criterion two
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

## Acceptance criteria
- [ ] A test covering the steps above fails against the behaviour as it stood before the change
- [ ] That test passes against the change
- [ ] Further criterion of the fix

## Environment
OS, version, relevant config.
```

## What a Sentence of the Body States

**Should**

Every sentence of an issue body should state the problem, a criterion, or a condition of
one of those, in the register the `writing-style` skill fixes, and the author should cut a
sentence stating none of them.

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
| the issue is triaged, and no condition below it holds | the issue | `Open` |
| the work is taken up | what the project names for that condition | `In Progress` |
| the work on a parent issue is taken up | any subtask of it whose own work is taken up | `In Progress` |
| the work is offered for review | what the project names for that condition | `In Review` |
| the work is delivered and every acceptance criterion of the issue is met by it | what the work delivered, read against those criteria | `Done` |
| the work on a parent issue is complete | its subtasks, every one of them closed | `Done` |
| the work is dropped | the comment stating that the issue is not going to be fixed, or naming the open issue it duplicates | `Closed` |

A project should state once, where it keeps its conventions, which artifact it names for
the conditions the table leaves to it, and which of its tracker's states each condition
maps to; a reader should read a condition off its artifact rather than off a field. Where
a project's order of work is the one `work-sequence` → The Sequence states,
`work-sequence` → The Artifact Each Condition Is Read Off names those artifacts for it.

Where the project has named none, a reader should read the condition off what the work
itself produced by that point.

Whether what the work delivered has reached a user is no condition of the issue: the
release carries that, under `shipping-and-launch`.

From the condition `In Progress` on, the assignee field, where the tracker has one, should
name the person carrying the work; an empty field from that condition on is a defect of the
issue, and an empty field before it is not.

## Cross-References

**Recommended**

- `work-sequence` — the step of the work each act on this issue runs at, and the artifact `In Progress`, `In Review` and `Done` are read off under a project's order of work.
- `writing-style` — prose register in the body of an issue and in its comments.
- The CLI skill of the issue tracker — the commands that search for, create, label, assign, and comment on an issue.
