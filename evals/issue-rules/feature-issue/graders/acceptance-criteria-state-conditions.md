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
