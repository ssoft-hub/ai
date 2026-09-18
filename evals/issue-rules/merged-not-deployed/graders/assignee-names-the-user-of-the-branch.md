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

This skill states the conditions the work stands in, each read off an artifact, under a
name of its own that binds no tracker:

| Condition | The artifact it is read off | Name used here |
|---|---|---|
| the issue is triaged, and none of the artifacts below exists | the issue | `Open` |
| the work is taken up | the branch | `In Progress` |
| the work is offered for review | the offer for review (`work-sequence` → The Sequence) | `In Review` |
| the change is merged | the change standing in the target branch and meeting every criterion of the issue (One Issue, One Merge above, reconciled at the Pre-merge issue check step, `work-sequence` → The Sequence) | `Done` |
| the work is dropped | the comment stating that the issue is not going to be fixed, or naming the open issue it duplicates | `Closed` |

A project should state once, where it keeps its conventions, which of its tracker's states
each condition maps to; where a project states none, a reader should read the condition off
the artifact beside it rather than off a field. Whether what the merge delivers has reached
a user is no condition of the issue: the release carries that, under `shipping-and-launch`.

From the branch on, the assignee field, where the tracker has one, should name the user
the `<user>` segment of the branch name carries (`commit-rules` → Branch Naming); an empty
field once the branch exists is a defect of the issue, and an empty field before it is not.
