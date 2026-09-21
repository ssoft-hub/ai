---
type: llm
weight: 1
---

Read the items of the test plan in the response. An item names a check when it gives something run and the result read off it: an automated test named, or steps a reviewer runs and what stands at the end of them. An item names no check when it only puts the change in place or moves the environment to where a check could run - installing it, deploying it, copying a file, restarting a session, opening a project - and states no result anyone reads.

FAIL the response when one item or more names no check. PASS it when every item names one. A deployment step standing inside an item as the precondition of the check that item states is no defect; an item that is the deployment step and nothing else is one.

A response carrying no test plan item at all fails this grader: the section the description fixes is the list of checks, and a list holding none names none.

The rule, from the `pr-rules` skill:

## Description Structure

**Must**

All four sections are required, in this order. A change too large for the budgets is a
PR to split (PR Size), not a description to extend.

| Section | Carries | Budget |
|---|---|---|
| `## Problem` | the symptom, its cost and the trigger; the linked issue's Goal restated in one or two sentences; no solution. A change with no problem to state says so in one line. A table, a diagram or an example may carry the symptom, the cost or the trigger, within the budget (`writing-style` → Show the Example, Not a Description of It) | up to five lines |
| `## Summary` | what changed, user-visible, one bullet per logical change | up to five bullets, one line each |
| `## Implementation` | one bullet per decision, each naming the file or symbol it changed and the constraint that decided it | up to six bullets |
| `## Test plan` | `- [ ]` per item, naming a check with an observable result, produced by the branch or by a reviewer following the item — a command that was run, a test that covers the behaviour, steps ending in something a reader can see; a box is checked only once that run has passed | one line per item |
