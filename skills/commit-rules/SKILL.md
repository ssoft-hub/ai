---
name: commit-rules
version: "1.0.0"
description: Apply when writing or reviewing commit messages or naming branches
license: Unlicense
metadata:
  author: ssoft
  tags:
    - git
    - commits
---

# Skill: Commit Rules

Apply when writing commit messages or reviewing commits.

## Project Overrides

Project-local rules win. If the repository's `AGENTS.md` or a project skill defines its own commit conventions, follow those instead. This skill is the fallback for projects that do not specify their own.

---

## Format

```
type(scope): subject

Body explaining the change.
```

**First line:** `type(scope): subject` — total length ≤ 72 characters.
**Scope** is optional; use when the change is clearly scoped to one module/component.
**Subject:** imperative mood, lowercase after the colon, no trailing period.

> Merge commits follow `pr-rules` Merge Strategy format (`Merge PR #<n>: …`, subject ≤ 120 chars), not this section.

```
feat(hash): add SipHash-2-4 keyed 64-bit hash
fix(wrapper): correct noexcept propagation through executor chain
chore: update submodule refs to current branch heads
```

---

## Types

| Type | When |
|------|------|
| `feat` | New user-visible functionality |
| `fix` | Bug fix |
| `refactor` | Code change with no behaviour change |
| `perf` | Performance improvement |
| `docs` | Documentation only |
| `test` | Test additions or changes |
| `chore` | Build, tooling, dependency, submodule updates |
| `ci` | CI/CD workflow changes |
| `style` | Formatting only (no logic change) |

`BREAKING CHANGE:` in body (or `!` after type) for breaking public API changes.

---

## Body

Blank line between subject and body. Lines ≤ 72 characters.

Body is **always required** — no exceptions.

Write in plain language — no rigid sections, no headers. Explain:

- **why** the change was made
- **what problem** it solves
- **how** it was approached (when the approach is non-obvious)

```
feat(hash): add SipHash-2-4 keyed 64-bit hash

SipHash provides hash-flooding resistance missing in fnv1a/djb2.
Implements the reference SipHash-2-4 algorithm with a 128-bit key.
Key is passed as two uint64_t values to avoid struct padding issues.
```

---

## Branch Naming

```
<user>/<type>/<TRACKER-N>/<subject>
```

- **user** — git username (always; marks personal branches).
- **type** — same values as commit types (`feat`, `fix`, `chore`, …).
- **TRACKER-N** — issue identifier from the tracker (`PROJ-42`, `GH-7`, …). Omit the segment entirely when there is no tracked issue.
- **subject** — kebab-case, imperative, concise.

```
<user>/feat/PROJ-42/add-siphash
<user>/chore/update-submodule-refs
```

---

## Consistency Rules

- **Check branch before committing** — confirm you are on a feature branch, not `main`.
  Direct commits to `main` are blocked by the pre-commit hook.
- **Repository must be consistent at every commit** — docs, tests, and implementation
  must not diverge within a single commit. A commit that adds a feature must also
  update any documentation or tests that reference it.
- **Do not describe a result before it exists** — a commit that only adds tests for
  feature X must not say "add feature X". The subject must match what is actually
  committed, not what will be committed later.

---

## Fixup Commits

When correcting an earlier commit on the same branch, use `--fixup` instead of a free-form commit:

```bash
git commit --fixup=<hash>          # creates "fixup! <original subject>"
git rebase -i --autosquash <base>  # squashes fixups automatically before merge
```

Use `--fixup` when the change belongs to a specific earlier commit — reviewer sees the correction attached to its target, not floating. Use a normal commit only when the change is logically independent.

## Fixup / Squash Merges

Squash fixup commits before opening the PR — not at merge time.

When squashing, rewrite the body to describe the actual final change — not the fixup history. The merged commit must read as if it was written that way from the start.

## No Correction Commits Within a PR

A PR branch must not contain correction commits (fixups, renames, moves) for mistakes introduced earlier in the same branch. If a commit is wrong, rewrite history — do not layer a fix on top.

**Rule:** If a correction belongs to an earlier commit in the same PR, rebase and amend that commit. A reviewer should see each commit as correct from the start, not as a sequence of mistake + fix.

---

## Trailers — Banned

No `Co-Authored-By`, no `Co-authored-by`, no AI-attribution trailers of any kind.

```
# Never:
Co-Authored-By: Claude <noreply@anthropic.com>
Generated-by: AI
```
