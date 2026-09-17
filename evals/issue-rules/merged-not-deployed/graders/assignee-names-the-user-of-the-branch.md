---
type: llm
weight: 1
---

The prompt names the branch the work ran on, `ssoft/feat/GH-174/add-a-dry-run-flag`, whose `<user>` segment is `ssoft`, and states that the assignee field of the issue is empty and settable.

FAIL the response when it puts anyone but `ssoft` in that field - whoever merged the pull request, whoever reviewed it, whoever deploys it - when it leaves the field empty, or when it says nothing of the field at all. PASS it when it holds that the field should name `ssoft`, the user the `<user>` segment of the branch name carries; an answer naming that segment as what the field takes, without writing `ssoft` out, passes as well.

A response answering what state the issue stands in and leaving the field unanswered fails this grader: the rule puts an assignee on the issue from the branch onward, and an answer silent about the field leaves an empty one standing.

The rule, from the `issue-rules` skill:

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
