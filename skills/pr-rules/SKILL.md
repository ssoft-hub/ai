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

## PR Title

Conventional Commits format, uppercase first letter, ≤ 120 characters:

```
Feat(hash): add SipHash-2-4 keyed 64-bit hash
Fix(wrapper): correct noexcept propagation through executor chain
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
- [ ] `CHANGELOG.md` updated — every user-visible change documented
- [ ] `git submodule status` — no `+` prefix on any module
- [ ] Every commit in the branch builds independently (no broken intermediate state)
- [ ] Commit trailers conform to `commit-rules` skill
- [ ] Branch is rebased onto the current target branch (no stale merge base)

---

## Merge Strategy

**Rebase, then merge with `--no-ff`** — explicit merge commit per topic; linear first-parent history on protected branches.

### Rules

1. **Rebase before merge.** `git rebase <target>` first; merge only when the branch sits on the current target tip.
2. **`--no-ff` only.** No fast-forward merge. No squash merge.
3. **Merge subject:** `Merge PR #<pr-number>: <pr subject>` — copy the PR subject verbatim. Do not re-prefix with `type(scope):` (the PR title already carries it; re-prefixing duplicates the type in the merged log).
4. **Merge subject length:** ≤ 120 characters (same limit as PR title; supersedes the 72-char rule in `commit-rules` for merge commits only).
5. **Merge body required** — same rule as ordinary commits (`commit-rules`). Body explains what was integrated and why; never empty.
6. **Trailers:** same ban as `commit-rules` — no AI-attribution. `Co-authored-by` injected by GitHub when committer differs from author is allowed.
7. **Cleanup before opening the PR.** Squash fixups via `git commit --fixup=<hash>` + `git rebase -i --autosquash` (per `commit-rules`). Never at merge time.
8. **Rewrite squashed commit bodies** to reflect the final state (see `commit-rules`).

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
