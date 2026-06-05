# Skill: Pull Request Rules

Apply when opening, reviewing, or preparing a PR/MR.

---

## PR Title

Same format as a commit subject — Conventional Commits, ≤ 72 characters:

```
feat(hash): add SipHash-2-4 keyed 64-bit hash
fix(wrapper): correct noexcept propagation through executor chain
```

---

## Description Structure

```markdown
## Summary
- What changed and why (user-visible perspective, not implementation details)
- One bullet per logical change

## Test plan
- What was tested and how
- Edge cases covered
- How a reviewer can verify the change locally
```

Both sections are required. A PR with no test plan is not ready to review.

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

**Rebase, then merge** — no squash merge, no merge commit.

- Rebase the branch onto the target before merging: `git rebase <target>`
- Merge with fast-forward: preserves linear history
- If commits need cleanup (fixups, wip): squash locally before opening the PR, not at merge time
- After squashing fixups: rewrite commit bodies to reflect the final state (see `commit-rules` skill)

---

## PR Size

One logical change per PR. Do not mix:

- Feature + refactoring
- Bug fix + unrelated cleanup
- Multiple unrelated features

If a PR touches too many things, split it. A PR that cannot be summarised in one sentence is too large.
