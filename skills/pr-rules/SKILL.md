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

## Project Overrides

**Must**

PR conventions defined in the repository's `AGENTS.md` or in a project skill must be
followed instead of this one.

## Workflow

**Should**

Eight steps, in order. A step that touches the tracker or the PR runs through the CLI
skill of the hosting platform. Outside this section a step is cited by name, never by
number.

**1. Scope and issue** — find or create the issue in the repository the change belongs
to, a submodule's in that submodule rather than in the superproject, and complete it
per `issue-rules`.

**2. Branch** — name it before the first commit: `commit-rules` → Branch Naming.

**3. Commits** — commit on the branch per `commit-rules`.

**4. Push** — send the branch to the remote once the local remarks are exhausted; a
later round of review returns here on the same condition.

**5. PR** — open it once the Push step has run: PR Title, Description Structure.

**6. Pre-merge issue check** — reconcile the linked issue against what the PR
delivers, and comment there which items it resolves: Pre-Merge Checklist.

**7. Merge commit** — after review passes and the Pre-merge issue check clears: Merge
Strategy.

**8. Close issue** — when every checkbox in the issue is checked; otherwise leave it
open and name the follow-up PR/MR in a comment (`issue-rules` → Lifecycle).

## When a Check Runs

**Should**

Every check this skill names as run over the change belongs to exactly one of three
moments. Which checks a project declares is the project's own; the pipeline that runs
them on the server is `ci-cd-and-automation`.

| Moment | Runs | Does not run |
|---|---|---|
| A round of edits — one pass over the branch, the first and every fix answering a review remark alike | the checks the change touches: the tests whose subject the change names, plus any check the change's own files are the input of, on the commit that closes the round | what reads the branch as a whole |
| The push — the Push step, once per branch state offered for review | what reads the branch as a whole | a round of review and fix, which reads the branch as it stands locally; a check whose answer still stands |
| Opening the pull request | nothing over the branch, which the push answered | every check of the branch; the pull request's own four properties are established here instead, and the Pre-Open Checklist lists them as what it leaves out |

- A check that has passed stands while the branch head is the commit it ran against;
  an amend, a rebase or a further commit moves that head and puts the check back.
- The rebase therefore runs first at the push, ahead of every check measured against
  the head it moves.

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
| `## Problem` | the symptom, its cost and the trigger; the linked issue's Goal restated in one or two sentences; no solution. A change with no problem to state says so in one line | up to five lines |
| `## Summary` | what changed, user-visible, one bullet per logical change | up to five bullets, one line each |
| `## Implementation` | one bullet per decision, each naming the file or symbol it changed and the constraint that decided it | up to six bullets |
| `## Test plan` | `- [ ]` per item, naming the command that was run or the test that covers it; a box is checked only once that run has passed (`issue-rules` → Description Template) | one line per item |

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

Register: `writing-style`.

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
naming one reply admits. The issue
comments the Scope and issue, Pre-merge issue check and Close issue steps require are
published as usual (`issue-rules` → Progress Comments).

Report at the end of a review pass: that feedback is waiting, where it is, what it
covers, and whether the draft was opened by this pass or reused. The draft mechanics
belong to the CLI skill of the hosting platform, under its review-thread or draft-note
section.

## Pre-Open Checklist

**Must**

Conditions on the branch, each naming the moment it is established at (When a Check
Runs):

- [ ] Every check the change touches passes — at the round of edits
- [ ] Branch is rebased onto the current target branch (no stale merge base) — at the push
- [ ] Every check the project declares passes over the branch as it stands — at the push
- [ ] Every commit in the branch builds independently (no broken intermediate state) — at the push
- [ ] Every line of the pre-PR check in the module-sync skill of the version control system passes — at the push
- [ ] Commit trailers conform to `commit-rules` — at the push
- [ ] `CHANGELOG.md` updated — every user-visible change documented — at the push

The pull request's own four properties are established with it instead:

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

## Merge Strategy

**Must**

1. **Checklist gate.** Merge only after the Pre-Merge Checklist passes.
2. **The human authorises the merge.** An agent merges on an explicit instruction
   naming this PR, which does not carry to the next one: the authorisation is per pull
   request, so a command merging several needs an instruction naming each of them.
3. **Rebase before merge.** `git rebase <target>`, then merge from the current target
   tip; the rebase moves the head, so it returns to the push moment and the checks of
   that moment run again.
4. **`--no-ff` only.** No fast-forward merge, no squash merge.
5. **Merge subject:** `Merge PR #<pr-number>: <pr subject>`, the PR subject verbatim
   and never re-prefixed with `type(scope):`, so a tracker ID in the title leaves both
   identifiers in place (`Merge PR #7: PROJ-42: Add SipHash...`).
6. **Merge subject length:** at most 120 characters, superseding the 72-character rule
   in `commit-rules` for merge commits only.
7. **Merge body required.** What was integrated and why, never empty (`commit-rules`).
8. **Trailers:** the ban in `commit-rules` holds; `Co-authored-by` injected by the
   forge when committer differs from author is allowed.
9. **Cleanup before the push.** Squash fixups (`commit-rules` → Fixup Commits) before
   the branch is sent, never at merge time: a rewrite afterwards takes a force-push and
   owes every check the push ran.
10. **Rewrite squashed commit bodies** per `commit-rules` → Fixup / Squash Merges.

The command performing the merge, and the repository settings it depends on, belong to
the CLI skill of the hosting platform.

## PR Size

**Should**

One logical change per PR: not feature plus refactoring, not bug fix plus unrelated
cleanup, not several unrelated features. A PR that cannot be summarised in one sentence
is split before review.

## Cross-References

**Recommended**

- `issue-rules` — the issue this PR resolves: title, templates, labels, lifecycle, progress comments.
- `commit-rules` — commit message format and branch naming on the PR's branch.
- `code-review-and-quality` — what a review looks for, where this skill states how a finding is worded.
- `writing-style` — prose register in the description and in the review threads.
- `ci-cd-and-automation` — the pipeline answering the checks reported on the pull request.
- The module-sync skill of the version control system — the pre-PR check and the merge order the checklists gate on.
- The CLI skill of the hosting platform — the commands behind the Workflow steps and the draft mechanics behind Pending by Default.
