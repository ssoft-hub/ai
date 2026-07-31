---
name: pr-rules
version: "1.0.0"
description: Apply when opening, reviewing, or preparing a PR/MR
license: Unlicense
metadata:
  author: ssoft
  tags:
    - git
    - pr
---

# Skill: Pull Request Rules

Apply when opening, reviewing, or preparing a PR/MR.

## Project Overrides

Project-local rules win. If the repository's `AGENTS.md` or a project skill defines its own PR conventions, follow those instead. This skill is the fallback for projects that do not specify their own.

---

## Workflow

End-to-end order of actions from a new task to a merged, closed issue. Steps run in order — do not open a PR before step 1 is satisfied, do not merge before step 5 is satisfied.

Every step that touches the tracker or the PR is carried out with the hosting platform's CLI — `github-cli` for `gh`, `gitlab-cli` for `glab`. This skill states what must be true at each step; the platform skill states the command that gets there.

**1. Scope and issue** — before any code change:
- Identify the repository the change belongs to (root repo or a submodule); the issue is created and tracked there, not in the root repo.
- Search the tracker for an existing issue covering the task. If found, check it has a test plan and, for features, acceptance criteria (`issue-rules` → Description Template); if incomplete for this task, update the issue before writing code.
- Apply the type label matching the title Type, if one exists, plus topic labels for the issue's subject matter (`issue-rules` → Labels).
- If no issue exists, create one in that repository (`issue-rules`):
```
Feat(hash): Add SipHash-2-4 keyed 64-bit hash   ← title
PROJ-42                                           ← assigned ID
```
An issue without a test plan (and, for features, acceptance criteria) is not ready to implement against.

**2. Branch** — name before first commit (`commit-rules` → Branch Naming):
```
<user>/feat/PROJ-42/add-siphash
```

**3. Commits** — on the branch (`commit-rules`):
```
feat(hash): add SipHash-2-4 keyed 64-bit hash

SipHash provides hash-flooding resistance missing in fnv1a/djb2.
Implements SipHash-2-4 with a 128-bit key passed as two uint64_t.
```

**4. PR** — open when branch is ready (this skill):
```
PROJ-42: Add SipHash-2-4 keyed 64-bit hash
```
Description: `## Problem` + `## Summary` + `## Implementation` + `## Test plan`, the
last one with checkbox items — see Description Structure.

**5. Pre-merge issue check** — before merging (this skill → Pre-Merge Checklist): reconcile every checkbox in the linked issue against what the PR actually delivers, and comment on the issue which items it resolves.

**6. Merge commit** — after review passes and step 5 clears (this skill → Merge Strategy):
`Merge PR #<n>: <pr title>` with a body. See Merge Strategy for the full rule.

**7. Close issue** — only when every checklist checkbox in the issue is checked (`issue-rules` → Lifecycle). If items remain, leave the issue open and note the follow-up PR/MR in a comment instead of closing.

---

## PR Title

Type and subject both start with uppercase, ≤ 120 characters. Format depends on whether the PR resolves a tracked issue:

**With issue** — tracker ID replaces `Type(scope)`:
```
PROJ-42: Add SipHash-2-4 keyed 64-bit hash
GH-7: Correct noexcept propagation through executor chain
```

**Without issue** — Conventional Commits format:
```
Feat(hash): Add SipHash-2-4 keyed 64-bit hash
Fix(wrapper): Correct noexcept propagation through executor chain
```

---

## Description Structure

```markdown
## Problem
What is wrong or missing today, and what prompted the work now — the symptom, the
cost of leaving it, and the trigger (issue, incident, review finding, blocked task).
No solution here.

## Summary
- What changed, from a user-visible perspective (not implementation details)
- One bullet per logical change

## Implementation
- What was changed and how (technical perspective)
- Why this approach over alternatives

## Test plan
- [ ] What was tested and how (automated test name, or manual steps)
- [ ] Edge cases covered
- [ ] How a reviewer can verify the change locally
```

All four sections are required. A PR missing `## Problem` or the test plan is not ready
to review.

**Problem** carries the motivation; **Summary** carries the change. Do not put the
motivation in Summary — the split is what keeps "why this work exists" from
collapsing into a restatement of the diff. When a tracked issue exists, restate its
Goal or Problem here in one or two sentences instead of linking to it alone: the PR
must be readable on its own. A change with no problem to state — a rename, a
formatting pass — says so in one line ("no user-visible problem; ..."), rather than
dropping the section.

**Test plan** items are checkboxes, matching the issue templates (`issue-rules` →
Description Template) so plan items can be reconciled against the issue at merge
time. Check a box only once that item has actually been run and passed; an unchecked
box means not yet verified, and the Pre-Open Checklist gates on that.

---

## Review Comments

Applies to review feedback wherever it lands — inline comments and their replies on a
PR, and the same feedback carried in a tracker or a message when that is where the
review happens. A different artifact from the Description above: shorter-lived, one
point at a time.

### Findings

Order:
1. **The fact** — what the code does, naming the exact symbol. Not an impression
   ("this looks fragile") — the concrete behaviour.
2. **The consequence** — the scenario where it breaks, or the invariant it violates.
   Skip only when the fact alone is self-evidently wrong.
3. **The fix** — a specific change, or a couple of named alternatives ("either X or
   Y"). A finding with no proposed direction is not actionable.

Prefix with a bold, lowercase, colon-terminated severity label — `**blocking:**`,
`**must-fix:**`, `**question:**`, `**note:**`, or whatever label set the project's
existing review threads already use. Omit the label only when every finding in the
review is the same severity and there's nothing to disambiguate.

```markdown
**must-fix:** `hashBytes()` reads `key[0..15]` unconditionally; a key shorter than
16 bytes is undefined behaviour, and nothing on the call path checks the length
before this point.

Any caller passing a key from configuration can trigger it silently on a truncated
value. Validate the length where the key is constructed and return an error, rather
than trusting every call site to check it first.
```

Address the code, not the author — state what the code does and what follows from it
("the division by 2 encodes a fixed switch topology" — not "you hardcoded the
topology"). Recommend rather than command, even for a blocking finding — "worth
validating", "better to return an error here" — severity is carried by the label, not
by imperative phrasing.

### Replies

Open with a verb naming the resolution: fixed / reworked / done / agreed / removed /
replaced. State the result first, explanation after — then, in one to a few
sentences, what changed (naming the actual symbol) and, when one exists, the test
that now covers it.

```markdown
Fixed: `SipHashKey` now validates its length in the constructor and returns
`InvalidKeyLength` for anything but 16 bytes; call sites no longer need to check it
themselves. Covered by `key_shorter_than_16_bytes_is_rejected`.
```

When disagreeing or clarifying instead of agreeing, give the actual reasoning
specifically enough that the reviewer can check it — never dismiss a finding without
an explanation. When the fix belongs to a separate task, say so and name it, or offer
to file one; don't let a valid finding go unaddressed just because it's out of scope
for this PR.

### Pending by Default

Review feedback is outward-facing: publishing notifies the author and every watcher, and
editing afterwards does not unsend it. An agent therefore does not publish its own review
wording — on any platform, findings and replies alike, including replies to feedback on
the agent's own PR.

What that means depends on what the platform offers:

- **A draft mechanism exists** — GitHub pending reviews, GitLab draft notes, Gerrit draft
  comments: write into it and stop there. The human submits.
- **None exists** — Jira and most trackers, chat, email: post nothing at all. The wording
  goes into the reply to the human, who posts it or asks for it to be posted.

Check for a draft or pending state in that platform's API before assuming which case
applies. "No draft support" is something to state in the report, not licence to publish.

The single exception is an explicit instruction naming the act on that artifact — "approve
it", "post that reply now". The instruction is the submission. Nothing else authorises
publishing, and an instruction given on one PR does not carry to the next one.

The ban covers review feedback, not every comment. The issue comments and progress notes
the Workflow requires (steps 1, 5 and 7; `issue-rules` → Progress Comments) are published
as usual: recording which PR resolves which checklist item is not a review finding.

**Report** at the end: that feedback is waiting, where it is, what it covers, and whether
the draft was opened by this pass or reused. A draft nobody is told about is the same as
no review.

Which command publishes on the spot, which one keeps the feedback unsent, and the traps
neither CLI help states: `github-cli` → Review Threads, `gitlab-cli` → Draft Notes.

### Register

Full sentences, exact identifiers in backticks, no filler or hedging, no slang or
unnecessary borrowed words — `writing-style` covers these general prose rules for
every artifact, review comments included. Recommend-not-command and address-the-code
tone (above) are specific to review feedback and live only in this section, not in
`writing-style`. Use whichever severity-label vocabulary and language the project's
existing review threads already use (`AGENTS.md` / project convention wins, per
Project Overrides above).

---

## Pre-Open Checklist

- [ ] CI green on all targets declared in the project
- [ ] Description carries all four sections, `## Problem` included — see Description Structure
- [ ] Every checked box in the PR's test plan corresponds to a run that actually passed
- [ ] PR carries the issue's labels — type label if any, plus topic labels — see `issue-rules` → Labels
- [ ] `CHANGELOG.md` updated — every user-visible change documented
- [ ] `git submodule status` — no `+` prefix on any module
- [ ] Every commit in the branch builds independently (no broken intermediate state)
- [ ] Commit trailers conform to `commit-rules` skill
- [ ] Branch is rebased onto the current target branch (no stale merge base)

---

## Pre-Merge Checklist

Gates the merge itself — distinct from the Pre-Open Checklist above, which gates opening the PR. Run it against the issue linked in the PR title and against the PR's own test plan; neither one alone is enough.

- [ ] Every checklist checkbox in the issue reflects actual current state, not the state at issue-creation time
- [ ] Each checkbox now checked is verifiable from what shipped in this PR or an earlier merged PR
- [ ] Every unchecked item either is out of scope for this PR or has a linked follow-up PR/MR
- [ ] Every test-plan box in the PR description is checked, or the item is named out of scope with a reason — an unchecked box means the work is merging unverified
- [ ] A comment is added to the issue recording which PR/MR resolves which item (`issue-rules` → Progress Comments)

**Merge gate:** merge only if every item in the issue and every test-plan box in the PR is checked, or the remaining ones already have a follow-up PR/MR linked in an issue comment or a stated reason for staying unrun. Unchecked items with no plan behind them block the merge.

---

## Merge Strategy

**Rebase, then merge with `--no-ff`** — explicit merge commit per topic; linear first-parent history on protected branches.

### Rules

1. **Issue gate.** Merge only after the Pre-Merge Checklist above passes.
2. **The human authorises the merge.** An agent does not merge on its own initiative, and an authorisation given for one PR does not carry to the next — the same rule the review feedback follows (Review Comments → Pending by Default), applied to the heavier act.
3. **Rebase before merge.** `git rebase <target>` first; merge only when the branch sits on the current target tip.
4. **`--no-ff` only.** No fast-forward merge. No squash merge.
5. **Merge subject:** `Merge PR #<pr-number>: <pr subject>` — copy the PR subject verbatim. Do not re-prefix with `type(scope):` (the PR title already carries it; re-prefixing duplicates the type in the merged log). When the PR title starts with a tracker ID, `#<pr-number>` and `TRACKER-N` are distinct identifiers — both appear and that is correct (`Merge PR #7: PROJ-42: Add SipHash...`).
6. **Merge subject length:** ≤ 120 characters (same limit as PR title; supersedes the 72-char rule in `commit-rules` for merge commits only).
7. **Merge body required** — same rule as ordinary commits (`commit-rules`). Body explains what was integrated and why; never empty.
8. **Trailers:** same ban as `commit-rules` — no AI-attribution. `Co-authored-by` injected by GitHub when committer differs from author is allowed.
9. **Cleanup before opening the PR.** Squash fixups via `git commit --fixup=<hash>` + `git rebase -i --autosquash` (per `commit-rules`). Never at merge time.
10. **Rewrite squashed commit bodies** to reflect the final state (see `commit-rules`).

### Rationale

- `--no-ff` keeps the topic boundary visible. `git log --first-parent <branch>` on a protected branch shows one entry per integrated PR.
- Rebase before merge ensures no interleaved history under the merge commit.
- Protected branches — the canonical set is defined and enforced by `hooks/git/pre-commit`. Feature branches commit freely.

### Platform mechanics

The command that performs this merge, and the repository settings it depends on:
`github-cli` → Pull Requests, `gitlab-cli` → Merge Requests.

---

## PR Size

One logical change per PR. Do not mix:

- Feature + refactoring
- Bug fix + unrelated cleanup
- Multiple unrelated features

If a PR touches too many things, split it. A PR that cannot be summarised in one sentence is too large.

---

## Cross-References

- `issue-rules` — the issue this PR resolves: title, description templates, labels, lifecycle.
- `commit-rules` — commit message format and branch naming on the PR's branch.
- `github-cli` — the `gh` commands behind every step above.
- `gitlab-cli` — the `glab` commands behind every step above.
