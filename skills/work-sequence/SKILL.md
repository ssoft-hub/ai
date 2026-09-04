---
name: work-sequence
version: "1.0.0"
description: Apply when carrying a change from a task to a closed issue
license: Unlicense
metadata:
  author: ssoft
  tier: process
  bound-to:
    - universal
  rubric: applied
  tags:
    - workflow
    - process
---

# Skill: Work Sequence

Apply from the moment a task is taken up until the issue it resolves is closed.

## Project Overrides

**Must**

Must follow the order of work the repository's `AGENTS.md` file or a project skill defines,
instead of the rule here.

## The Sequence

**Should**

Eight steps, in order. A step is cited by name, never by number. Each step states what it
achieves; what the result carries, and the command that produces it, belong to the skills
named beside it.

| Step | Achieves | Runs when | Stated by |
|---|---|---|---|
| Scope and issue | the change has a tracked issue in the repository it belongs to, a module's in that module's own repository | the task is taken up | `issue-rules` |
| Branch | the work has a branch of its own, named | before the first commit | the workflow skill of the version control system |
| Commits | the change is recorded on that branch | a round of edits closes | `commit-rules` |
| Publish | the branch stands where a reviewer reads it | the local remarks are exhausted | `pr-rules` → Pre-Open Checklist, and the workflow skill of the version control system for the command that sends the branch |
| Offer for review | the change is offered for review | the Publish step has run | `pr-rules` |
| Pre-merge issue check | the tracked issue is reconciled against what the change delivers, with a comment there naming which items it resolves | the review has passed | `pr-rules` → Pre-Merge Checklist, `issue-rules` → Progress Comments |
| Integrate | the change sits on the target branch | the Pre-merge issue check clears | `pr-rules` → Merge Strategy |
| Close issue | the issue's state matches what the change delivered | the Integrate step has run | `issue-rules` → Lifecycle |

- A round of review and fix returns to the Commits step and runs forward from there; the
  Publish step's condition is the same on every pass.
- A step reaching the tracker runs through the CLI skill of the issue tracker; the offer
  for review, through the CLI skill of the hosting platform.

## When a Check Runs

**Should**

Every check run over the change belongs to exactly one of three moments. Which checks a
project declares is the project's own; the pipeline that runs them on a server is
`ci-cd-and-automation`.

| Moment | Runs | Does not run |
|---|---|---|
| A round of edits — one pass over the branch, the first and every fix answering a review remark alike | the checks the change touches: the tests whose subject the change names, plus any check the change's own files are the input of, on the commit that closes the round | what reads the branch as a whole |
| The Publish step, once per branch state offered for review | what reads the branch as a whole | a round of review and fix, which reads the branch as it stands locally; a check whose answer still stands |
| The Offer for review step | nothing over the branch, which the Publish step answered | every check of the branch; the properties of the offer itself are established here instead (`pr-rules` → Pre-Open Checklist) |

- A check that has passed stands while the branch head is the commit it ran against; an
  amend, a rebase or a further commit moves that head and puts the check back.
- The rebase therefore runs first at the Publish step, ahead of every check measured
  against the head it moves.

## Cross-References

**Recommended**

- `issue-rules` — the issue's title, description, labels, lifecycle and progress comments.
- `commit-rules` — the commit message.
- The workflow skill of the version control system — the command each step above runs, and the order they run in.
- `pr-rules` — what the offer for review carries: its title, description, review comments, two checklists and merge strategy.
- `ci-cd-and-automation` — the pipeline running a project's checks on a server.
- `changelog` — the entry a branch carries before it is published.
- `code-review-and-quality` — what the review between the Publish and Pre-merge issue check steps looks for.
- The module-sync skill of the version control system — the module refs a branch records.
- The CLI skill of the hosting platform — the commands behind the steps that reach it.
