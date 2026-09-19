---
type: llm
weight: 1
---

The prompt puts a branch meeting three of the four acceptance criteria of GH-181 in front of a pull request that is not open yet, and puts the fourth criterion out of reach for the quarter.

FAIL the response when GH-181 is left whole, carrying the fourth criterion beside the three the branch meets, by whatever route it gets there - the pull request merged against GH-181 with the remainder deferred to a follow-up issue, to an issue named as carrying it, to a comment on GH-181 naming that issue, or to a box left unticked as out of scope; `Refs GH-181` or any other wording put in place of `Closes GH-181` so that GH-181 outlives the merge of a pull request it is attached to; and the branch and GH-181 held as they are until someone is free to take the fourth criterion up. PASS it when GH-181 is split into subtasks, each carrying the criteria one part meets, and the branch's pull request is attached to the subtask it resolves whole, so that nothing merges against an issue carrying a criterion it does not meet.

The split standing before the pull request opens or after it decides nothing here: an answer opening the pull request first and splitting once the fourth criterion turns out to be out of reach passes, provided the pull request ends up attached to the subtask it closes.

The two clauses partition the answers: GH-181 either still carries the fourth criterion, which fails, or has been split with the pull request attached to the subtask it closes, which passes.

A response adding that GH-181 closes when its subtasks close, that it carries no pull request of its own, or that its acceptance criteria now stand on the subtasks, is no defect: that is what the split leaves behind.

A response answering only what the pull request description or the commit should say fails this grader: what the rule settles is which issue the pull request closes, and an answer silent about GH-181 leaves the fourth criterion standing on it.

The rule, from the `issue-rules` skill:

## One Issue, One Merge

**Must**

Whether an issue is split into subtasks settles what closes it and how many PR/MR it
carries:

| The issue | What closes it | PR/MR it carries |
|---|---|---|
| an unsplit issue, and a subtask, which is an issue in its own right | the merge of one PR/MR meeting every acceptance criterion it carries | one |
| a parent issue | the condition Lifecycle below reads off its subtasks | none |

A parent issue's `## Acceptance criteria` carries its subtasks, one per item, and no
criterion of its own: every criterion of the work stands on the subtask meeting it,
establishable there from that subtask's branch and PR/MR.

A PR/MR resolves the issue it is attached to whole: a PR/MR merging against an issue
carrying a criterion it does not meet is the defect, and no occasion to name the issue
that carries the rest. Where the work turns out to exceed the issue, the author must
split it into subtasks as soon as that is known, whether or not a PR/MR is already open,
each subtask carrying the criteria that part meets, and must attach an open PR/MR to the
subtask it resolves before that PR/MR merges. The count holds of an issue's merges
alone: one PR/MR resolving several issues is no defect.
