---
type: llm
weight: 1
---

The template a body takes is the one the type of its own title calls for: `Fix` takes Bug, every other type takes Feature / improvement, as the rule below states. Read the type off the title, then hold the body to that template's sections.

FAIL the response when the body carries a heading outside that template, whatever it is called - a background, a context, a proposal, a solution, a design, a list of tasks, notes, an estimate, a risk - or when it leaves one of the template's headings out. PASS it when the headings of the body are that template's and nothing else.

A response whose body carries no heading at all fails this grader: a template is a set of sections, and prose standing under none of them is none of them.

A title carrying no type of the nine is the title graders' to fail, not this one's: hold such a body to the Feature / improvement template, the work in the prompt fixing no defect.

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
