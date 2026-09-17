---
type: llm
weight: 1
---

The prompt describes a change merged with every checkbox of the issue checked and deployed nowhere yet, on a tracker whose state field carries open and closed alone.

FAIL the response when it holds the issue short of `Done` for want of the deployment - naming `Merged`, `In Review`, or any state standing for a change merged but not yet with its users - when it puts the tracker's own open or closed in place of a state of the lifecycle, or when it reads the state off that field rather than off the artifact the rule ties the state to. PASS it when it names `Done`, reads that state off the merge, and leaves the pending deployment out of the issue's state.

An answer adding that the issue is to be closed on the tracker, or that the deployment is the release's to carry, is no defect: the state is read off the merge either way.

A response naming no state at all fails this grader: what the rule asks of a reader is the state, and an answer carrying none names it nowhere.

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
