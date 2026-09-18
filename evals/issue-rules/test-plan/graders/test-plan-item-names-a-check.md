---
type: llm
weight: 1
---

Read the items of the test plan in the response. An item names a check when it gives something run and the result read off it: an automated test named, or steps a reviewer runs and what stands at the end of them. An item names no check when it only puts the change in place or moves the environment to where a check could run - installing it, deploying it, copying a file, restarting a session, opening a project - and states no result anyone reads.

FAIL the response when one item or more names no check. PASS it when every item names one. A deployment step standing inside an item as the precondition of the check that item states is no defect; an item that is the deployment step and nothing else is one.

A response carrying no test plan item at all fails this grader: the section the template fixes is the list of checks, and a list holding none names none.

The rule, from the `issue-rules` skill:

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
