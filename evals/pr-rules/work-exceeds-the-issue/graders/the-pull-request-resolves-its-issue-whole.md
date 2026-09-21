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

The rule, from the `pr-rules` skill:

## The Issue a Pull Request Resolves

**Must**

A pull request resolving no tracked issue, which PR Title admits, is bound by nothing
here. Where the title carries a tracker ID, the issue that ID names is the one the pull
request is attached to, and the pull request resolves that issue whole: a pull request
merging against an issue carrying a criterion it does not meet is the defect, and no
occasion to name the issue that carries the rest. An unsplit issue and a subtask alike
take one pull request, and a parent issue takes none (`issue-rules` → What Closes an
Issue). The count holds of an issue's pull requests alone: one pull request resolving
several issues is no defect.

Where the work turns out to exceed the issue, the issue is split into subtasks first
(`issue-rules` → What Closes an Issue), and an open pull request must be attached to the
subtask it resolves before it merges.
