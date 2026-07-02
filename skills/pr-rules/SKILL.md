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

**1. Scope and issue** — before any code change:
- Identify the repository the change belongs to (root repo or a submodule); the issue is created and tracked there, not in the root repo.
- Search the tracker for an existing issue covering the task. If found, check it has a test plan and, for features, acceptance criteria (`issue-rules` → Description Template); if incomplete for this task, update the issue before writing code.
- Apply labels — type label matches the title Type, plus any orthogonal labels that apply (`issue-rules` → Labels).
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
Description: `## Summary` + `## Implementation` + `## Test plan`.

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
## Summary
- What changed and why (user-visible perspective, not implementation details)
- One bullet per logical change

## Implementation
- What was changed and how (technical perspective)
- Why this approach over alternatives

## Test plan
- What was tested and how
- Edge cases covered
- How a reviewer can verify the change locally
```

All three sections are required. A PR with no test plan is not ready to review.

---

## Pre-Open Checklist

- [ ] CI green on all targets declared in the project
- [ ] PR carries the issue's type label (+ `breaking` if applicable) — see `issue-rules` → Labels
- [ ] `CHANGELOG.md` updated — every user-visible change documented
- [ ] `git submodule status` — no `+` prefix on any module
- [ ] Every commit in the branch builds independently (no broken intermediate state)
- [ ] Commit trailers conform to `commit-rules` skill
- [ ] Branch is rebased onto the current target branch (no stale merge base)

---

## Pre-Merge Checklist

Gates the merge itself — distinct from the Pre-Open Checklist above, which gates opening the PR. Run this against the issue linked in the PR title, not just the PR description.

- [ ] Every checklist checkbox in the issue reflects actual current state, not the state at issue-creation time
- [ ] Each checkbox now checked is verifiable from what shipped in this PR or an earlier merged PR
- [ ] Every unchecked item either is out of scope for this PR or has a linked follow-up PR/MR
- [ ] A comment is added to the issue recording which PR/MR resolves which item (`issue-rules` → Progress Comments)

**Merge gate:** merge only if every item in the issue is checked, or the remaining unchecked items already have a follow-up PR/MR linked in an issue comment. An issue with unchecked items and no plan to address them blocks the merge.

---

## Merge Strategy

**Rebase, then merge with `--no-ff`** — explicit merge commit per topic; linear first-parent history on protected branches.

### Rules

1. **Issue gate.** Merge only after the Pre-Merge Checklist above passes.
2. **Rebase before merge.** `git rebase <target>` first; merge only when the branch sits on the current target tip.
3. **`--no-ff` only.** No fast-forward merge. No squash merge.
4. **Merge subject:** `Merge PR #<pr-number>: <pr subject>` — copy the PR subject verbatim. Do not re-prefix with `type(scope):` (the PR title already carries it; re-prefixing duplicates the type in the merged log). When the PR title starts with a tracker ID, `#<pr-number>` and `TRACKER-N` are distinct identifiers — both appear and that is correct (`Merge PR #7: PROJ-42: Add SipHash…`).
5. **Merge subject length:** ≤ 120 characters (same limit as PR title; supersedes the 72-char rule in `commit-rules` for merge commits only).
6. **Merge body required** — same rule as ordinary commits (`commit-rules`). Body explains what was integrated and why; never empty.
7. **Trailers:** same ban as `commit-rules` — no AI-attribution. `Co-authored-by` injected by GitHub when committer differs from author is allowed.
8. **Cleanup before opening the PR.** Squash fixups via `git commit --fixup=<hash>` + `git rebase -i --autosquash` (per `commit-rules`). Never at merge time.
9. **Rewrite squashed commit bodies** to reflect the final state (see `commit-rules`).

### Rationale

- `--no-ff` keeps the topic boundary visible. `git log --first-parent <branch>` on a protected branch shows one entry per integrated PR.
- Rebase before merge ensures no interleaved history under the merge commit.
- Protected branches — the canonical set is defined and enforced by `hooks/git/pre-commit`. Feature branches commit freely.

### GitHub equivalent

```
gh pr merge <n> --merge -t "<subject>" -b "<body>" --delete-branch
```

### Repo settings prerequisites

- "Allow merge commits" — ON
- "Require linear history" — OFF (blocks `--no-ff`)

---

## PR Size

One logical change per PR. Do not mix:

- Feature + refactoring
- Bug fix + unrelated cleanup
- Multiple unrelated features

If a PR touches too many things, split it. A PR that cannot be summarised in one sentence is too large.
