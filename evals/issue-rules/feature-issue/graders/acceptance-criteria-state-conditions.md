---
type: llm
weight: 1
---

Read the items standing under the acceptance criteria heading of the issue in the response. An item states a criterion when it gives a condition the finished change satisfies, which the rule below takes from the `requirements` skill in the Given/When/Then form: a situation, an act, and the result observed. An item states a step of the work instead when it names what someone edits, adds or writes - a file to change, a flag to implement, a function to extract, a test to write, a document to update - rather than what holds once the change is in.

FAIL the response when one item or more under that heading states a step of the work. PASS it when every item there states a condition the change satisfies.

A response carrying no acceptance criteria at all fails this grader: the slot the template fixes stands empty, and an empty slot states no criterion. The grader `body-carries-the-template-sections.md` measures which sections the body carries and this one what that slot holds, so a body with no such slot fails both, which `evals/README.md` -> What a score counts allows.

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
