---
type: llm
weight: 1
---

The prompt describes a change merged with every checkbox of the issue checked and deployed nowhere yet, on a tracker whose state field carries open and closed alone.

FAIL the response when it holds the issue short of the merged condition for want of the deployment - naming `Merged`, `In Review`, or any state standing for a change merged but not yet with its users - when it puts the tracker's own open or closed in place of a condition of the work, or when it reads the condition off that field rather than off the artifact the rule ties it to. PASS it when it names the merged condition, by the default name `Done` or in words of its own, reads it off what the work delivered, and leaves the pending deployment out of the issue's state.

An answer adding that the issue is to be closed on the tracker, or that the deployment is the release's to carry, is no defect: the state is read off what the work delivered either way.

A response naming no state at all fails this grader: what the rule asks of a reader is the state, and an answer carrying none names it nowhere.

A response answering the state and saying nothing of whether the tracker's own state field settles it fails this grader as well: the prompt asks that question, and an answer silent about the field leaves it standing as what the state is read off.

The rule, from the `issue-rules` skill:

## Lifecycle

**Should**

This skill states the conditions the work stands in, each read off an artifact, under a
name of its own that binds no tracker:

| Condition | The artifact it is read off | Name used here |
|---|---|---|
| the issue is triaged, and no condition below it holds | the issue | `Open` |
| the work is taken up | what the project names for that condition | `In Progress` |
| the work on a parent issue is taken up | any subtask of it whose own work is taken up | `In Progress` |
| the work is offered for review | what the project names for that condition | `In Review` |
| the work is delivered and every acceptance criterion of the issue is met by it | what the work delivered, read against those criteria | `Done` |
| the work on a parent issue is complete | its subtasks, every one of them closed | `Done` |
| the work is dropped | the comment stating that the issue is not going to be fixed, or naming the open issue it duplicates | `Closed` |

A project should state once, where it keeps its conventions, which artifact it names for
the conditions the table leaves to it, and which of its tracker's states each condition
maps to; a reader should read a condition off its artifact rather than off a field. Where
a project's order of work is the one `work-sequence` → The Sequence states,
`work-sequence` → The Artifact Each Condition Is Read Off names those artifacts for it.

Where the project has named none, a reader should read the condition off what the work
itself produced by that point.

Whether what the work delivered has reached a user is no condition of the issue: the
release carries that, under `shipping-and-launch`.

From the condition `In Progress` on, the assignee field, where the tracker has one, should
name the person carrying the work; an empty field from that condition on is a defect of the
issue, and an empty field before it is not.
