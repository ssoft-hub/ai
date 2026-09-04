---
name: pr-rules
version: "1.0.0"
description: Apply when opening, reviewing, or preparing a PR/MR
license: Unlicense
metadata:
  author: ssoft
  tier: narrow
  bound-to:
    - forge
  rubric: applied
  tags:
    - git
    - pr
---

# Skill: Pull Request Rules

Apply when opening, reviewing, or preparing a PR/MR.

Where the pull request sits in the order of work, and which check runs at which
moment: `work-sequence` → The Sequence and When a Check Runs.

## Project Overrides

**Must**

Must follow the PR conventions the repository's `AGENTS.md` file or a project skill
defines, instead of the rule here.

## PR Title

**Must**

Type and subject both start with uppercase; the whole title is at most 120 characters.

| The PR resolves | Format | Example |
|---|---|---|
| a tracked issue | `TRACKER-N: Subject` — the tracker ID replaces `Type(scope)` | `PROJ-42: Add SipHash-2-4 keyed 64-bit hash` |
| no tracked issue | `Type(scope): Subject` | `Fix(wrapper): Correct noexcept propagation through executor chain` |

## Description Structure

**Must**

All four sections are required, in this order. A change too large for the budgets is a
PR to split (PR Size), not a description to extend.

| Section | Carries | Budget |
|---|---|---|
| `## Problem` | the symptom, its cost and the trigger; the linked issue's Goal restated in one or two sentences; no solution. A change with no problem to state says so in one line. A table, a diagram or an example may carry the symptom, the cost or the trigger, within the budget (`writing-style` → Show the Example, Not a Description of It) | up to five lines |
| `## Summary` | what changed, user-visible, one bullet per logical change | up to five bullets, one line each |
| `## Implementation` | one bullet per decision, each naming the file or symbol it changed and the constraint that decided it | up to six bullets |
| `## Test plan` | `- [ ]` per item, naming the command that was run or the test that covers it; a box is checked only once that run has passed (`issue-rules` → Description Template) | one line per item |

## No Figures That Go Stale

**Should**

A description, a comment and a reply should leave out a number measuring a run rather than
the change, and what the pull request itself shows. A rebase, a merge or one further
commit invalidates such a number, and the run and the diff carry it and keep it current.

| Left out | Named instead |
|---|---|
| a test total, a pass count, a coverage percentage, a timing | the command producing it, `npm test` |
| a count of changed files, lines or commits | nothing: the diff shows them |
| the hash of a commit on the branch under review | a released version, a tag, or the merge commit on the target branch |

A figure belonging to the change stays: a measured regression it exists to fix, a
documented limit, a version. A `## Test plan` item names the test itself, which the reader
runs.

## Review Comments

**Should**

Review feedback wherever it lands: inline on a PR, or in a tracker or a message where
the review happens.

A finding, in order:

1. **The fact** — what the code does, naming the exact symbol.
2. **The consequence** — the scenario where it breaks or the invariant it violates;
   skipped only where the fact alone is self-evidently wrong.
3. **The fix** — a specific change, or a couple of named alternatives.

Prefix every finding with a bold, lowercase, colon-terminated severity label:
`**blocking:**`, `**must-fix:**`, `**question:**`, `**note:**`, or the set the
project's threads already use.

Address the code rather than the author, and recommend rather than command: the label
carries the severity.

A reply opens with a verb naming the resolution — fixed / reworked / done / agreed /
removed / replaced — then names the symbol that changed and, where one exists, the
test now covering it.

A disagreement gives reasoning specific enough for the reviewer to check it; a fix
belonging to another task is named as such rather than left unanswered.

Should write a finding in the register the `writing-style` skill fixes, and should name
the kind of every symbol the finding names (`writing-style` → Name the Kind of Every
Identifier).

## Pending by Default

**Must**

An agent must not publish its own review wording — any platform, findings and replies
alike, including replies on its own PR. Check the platform's API for a draft or
pending state before assuming which case applies, and report a platform offering none
rather than publishing there.

| The platform offers | The agent does |
|---|---|
| a draft mechanism — GitHub pending reviews, GitLab draft notes, Gerrit draft comments | write the feedback into it and stop; the human submits |
| none | post nothing; the wording goes into the reply to the human |

None of these runs for review feedback:

- **Publishes on the spot** — `gh pr review` with `--comment`, `--approve` or
  `--request-changes`, `gh pr comment`, `glab mr note`, `glab mr note create`,
  `glab mr approve`.
- **Sends an existing draft** — `submitPullRequestReview`,
  `PUT .../draft_notes/:id/publish`, `POST .../draft_notes/bulk_publish`.
- **Reaches a reader with no draft at all** — `POST .../pulls/{n}/reviews` with an
  `event` field, `addPullRequestReview` carrying one, `POST .../pulls/{n}/comments`
  with `in_reply_to`, `POST .../merge_requests/:iid/notes`,
  `POST .../merge_requests/:iid/discussions`, and
  `addPullRequestReviewThreadReply` without a `pullRequestReviewId`.

The one exception is an explicit instruction naming the act on that artifact
("approve it", "post that reply now"), and it does not carry to the next PR. It is per
draft, not per pull request: a call that sends every draft the caller holds needs an
instruction covering each of them, and the single-draft form is what an instruction
naming one reply admits. The issue comments `work-sequence` requires are published as
usual (`issue-rules` → Progress Comments).

Report at the end of a review pass: that feedback is waiting, where it is, what it
covers, and whether the draft was opened by this pass or reused. The draft mechanics
belong to the CLI skill of the hosting platform, under its review-thread or draft-note
section.

## Pre-Open Checklist

**Must**

Conditions on the branch, each naming the moment it is established at
(`work-sequence` → When a Check Runs):

- [ ] Every check the change touches passes — at a round of edits
- [ ] Branch is rebased onto the current target branch (no stale merge base) — at the Publish step
- [ ] Every check the project declares passes over the branch as it stands — at the Publish step
- [ ] Every commit in the branch builds independently (no broken intermediate state) — at the Publish step
- [ ] Every line of the pre-PR check in the module-sync skill of the version control system passes — at the Publish step
- [ ] Commit trailers conform to `commit-rules` — at the Publish step
- [ ] `CHANGELOG.md` updated — every user-visible change documented — at the Publish step

The pull request's own four properties are established at the Offer for review step
instead:

- The status of the checks reported on it, which the pipeline answers rather than a local run (`ci-cd-and-automation`)
- A description carrying all four sections, `## Problem` included — see Description Structure
- A test-plan box checked only where the run it names has passed
- The issue's labels — type label if any, plus topic labels — see `issue-rules` → Labels

## Pre-Merge Checklist

**Must**

Gates the merge, where the Pre-Open Checklist gates opening the PR. Run it against the
issue linked in the PR title and against the PR's own test plan; neither alone is
enough. Its items are read off the issue and the pull request rather than run, so none
of them names a moment.

- [ ] Every check reported on the pull request has passed on the commit it now points at (`ci-cd-and-automation`)
- [ ] Every checklist checkbox in the issue reflects actual current state, not the state at issue-creation time
- [ ] Each checkbox now checked is verifiable from what shipped in this PR or an earlier merged PR
- [ ] Every unchecked item either is out of scope for this PR or has a linked follow-up PR/MR
- [ ] Every module reference the branch records satisfies the merge order the module-sync skill of the version control system fixes
- [ ] Every test-plan box in the PR description is checked, or the item is named out of scope with a reason
- [ ] A comment is added to the issue recording which PR/MR resolves which item (`issue-rules` → Progress Comments)
- [ ] No review thread of the pull request stands unresolved, unless `editing` → Guard Against a Stale Reading admits the merge

The head guard the CLI skill of the hosting platform names does not cover the
review-thread box: a thread opened after the thread list was last read moves no commit.

## Merge Strategy

**Must**

1. **Checklist gate.** Merge only after the Pre-Merge Checklist passes.
2. **The human authorises the merge.** An agent merges on an explicit instruction
   naming this PR, which does not carry to the next one: the authorisation is per pull
   request, so a command merging several needs an instruction naming each of them.
3. **Rebase before merge.** Rebase onto the target as the workflow skill of the version
   control system states, then merge from the current target tip; the rebase moves the
   head, so the branch returns to the Publish step and the checks of that moment run
   again (`work-sequence` → When a Check Runs). The merge is guarded with the head SHA
   read afterwards (`editing` → Guard Against a Stale Reading).
4. **The merge form.** Fixed by the workflow skill of the version control system, along
   with the forms it refuses.
5. **Merge subject:** `Merge PR #<pr-number>: <pr subject>`, the PR subject verbatim
   and never re-prefixed with `type(scope):`, so a tracker ID in the title leaves both
   identifiers in place (`Merge PR #7: PROJ-42: Add SipHash...`).
6. **Merge subject length:** at most 120 characters, superseding the 72-character rule
   in `commit-rules` for merge commits only.
7. **Merge body required.** What was integrated and why, never empty (`commit-rules`).
8. **Trailers:** the ban in `commit-rules` holds; `Co-authored-by` injected by the
   forge when committer differs from author is allowed.
9. **Cleanup before the Publish step.** Squash the corrections, as the workflow skill of
   the version control system states: a rewrite after the branch is sent takes a forced
   push and owes every check that step ran.
10. **Rewrite the messages the squash leaves** — the workflow skill of the version
    control system states what each one is read against.
11. **Read the thread list before the merge command.** Immediately before it, read the review
    threads again and match them against the list read when the review was addressed
    (`editing` → Guard Against a Stale Reading).

The command performing the merge, and the repository settings it depends on, belong to
the CLI skill of the hosting platform.

## PR Size

**Should**

One logical change per PR: not feature plus refactoring, not bug fix plus unrelated
cleanup, not several unrelated features. A PR that cannot be summarised in one sentence
is split before review.

## Cross-References

**Recommended**

- `work-sequence` — the order of work the Offer for review step belongs to, and the moment each check runs at.
- `issue-rules` — the issue this PR resolves: title, templates, labels, lifecycle, progress comments.
- `commit-rules` — the message format of every commit on the PR's branch.
- `code-review-and-quality` — what a review looks for, where this skill states how a finding is worded.
- `editing` — the head-SHA read Merge Strategy turns on, the thread-list read it owes before the merge command, and the thread state the Pre-Merge Checklist reads.
- `writing-style` — prose register in the description and in the review threads.
- `ci-cd-and-automation` — the pipeline answering the checks reported on the pull request.
- The workflow skill of the version control system — the commands behind the rebase, the send, the merge and the removal of the merged branch.
- The module-sync skill of the version control system — the pre-PR check and the merge order the checklists gate on.
- The CLI skill of the hosting platform — the commands behind the steps that reach this platform, and the draft mechanics behind Pending by Default.
