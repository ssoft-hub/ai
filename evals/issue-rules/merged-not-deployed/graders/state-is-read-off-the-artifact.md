---
type: llm
weight: 1
---

The prompt describes a change merged with every checkbox of the issue checked and deployed nowhere yet, on a tracker whose state field carries open and closed alone.

FAIL the response when it holds the issue short of the merged condition for want of the deployment - naming `Merged`, `In Review`, or any state standing for a change merged but not yet with its users - when it puts the tracker's own open or closed in place of a condition of the work, or when it reads the condition off that field rather than off the artifact the rule ties it to. PASS it when it names the merged condition, by the default name `Done` or in words of its own, reads it off the merge, and leaves the pending deployment out of the issue's state.

An answer adding that the issue is to be closed on the tracker, or that the deployment is the release's to carry, is no defect: the state is read off the merge either way.

A response naming no state at all fails this grader: what the rule asks of a reader is the state, and an answer carrying none names it nowhere.

The rule, from the `issue-rules` skill:

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
