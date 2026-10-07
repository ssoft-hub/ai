---
name: commit-rules
version: "1.0.0"
description: Apply when writing or reviewing commit messages or naming branches
license: Unlicense
metadata:
  author: ssoft
  tier: narrow
  bound-to:
    - vcs
  tags:
    - git
    - commits
---

# Skill: Commit Rules

Apply when writing commit messages or reviewing commits.

- The step of the work a commit or a branch is made at → `work-sequence` skill.
- Prose register, and the rule that a body states the result rather than the process → `writing-style` skill.
- The commands making a branch, making a commit, correcting one already made and rewriting what is already recorded → the workflow skill of the version control system.

## Format

```
type(scope): subject

Body explaining the change.
```

**First line:** `type(scope): subject` — total length ≤ 72 characters.
**Scope** is optional; use when the change is clearly scoped to one module/component.
**Subject:** imperative mood, lowercase after the colon, no trailing period.

> Merge commits follow `pr-rules` Merge Strategy format (`Merge PR #<n>: ...`, subject ≤ 120 chars), not this section.

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

Write in plain language — no rigid sections, no headers. Explain **why** the
change is made this way: motivation, constraints, non-obvious tradeoffs.

**One short paragraph, 2-6 lines.** A longer body goes unread. The diff already
shows *what* changed, so do not restate it. Evidence, measurements, alternatives
considered, migration notes, and test plans belong in the PR description
(`pr-rules` skill), not in the commit.

```
feat(hash): add SipHash-2-4 keyed 64-bit hash

SipHash provides hash-flooding resistance missing in fnv1a/djb2.
Implements the reference SipHash-2-4 algorithm with a 128-bit key.
Key is passed as two uint64_t values to avoid struct padding issues.
```

Exception — a body may exceed one paragraph only for content that has to travel
with the commit itself: a `BREAKING CHANGE:` paragraph, or trailers referencing
issues. Both go after the explanatory paragraph, not instead of it.

### Do Not

- Bullet-list every file or function the diff touches.
- Add headers (`## Motivation`, `## Changes`, `## Testing`) — this is not a PR.
- Paste benchmark tables, compiler output, or CI logs.
- Enumerate approaches you rejected; name at most the one constraint that ruled
  the chosen approach in.

---

## Branch Naming

```
<user>/<type>/<TRACKER-N>/<subject>
```

| Segment | What it holds | Where it comes from |
|---|---|---|
| `user` | the user's name, which marks the branch personal | the request, the thread or the configuration of the version control system |
| `type` | one value of the Types table | the change |
| `TRACKER-N` | the identifier of the issue the work resolves — `PROJ-42`, `GH-7` | the request, the thread or the project's rules |
| `subject` | kebab-case, imperative, concise | the change |

- Where no source gives the user's name, must ask the user what to do, and must not
  supply a user name no source gives.
- Where it is not known whether the work needs an issue, must settle it by the project's
  rules, must ask where they do not settle it, and must not supply an identifier no
  source gives.
- Where the work has no issue, must drop the `TRACKER-N` segment whole, its slash
  included.

```
<user>/feat/PROJ-42/add-siphash
<user>/chore/update-submodule-refs
```

---

## Consistency Rules

- **Check the branch before the first commit of a round** — the commit goes to a working
  branch, never to a shared one: `main`, `master` or what the project declares.
- **No correction commit in a branch offered for review** — a correction of an earlier
  commit of the same branch, a rename or a move included, is folded into the commit it
  corrects before the branch is offered, so each commit reads as correct from the start.
- **Repository must be consistent at every commit** — docs, tests, and implementation
  must not diverge within a single commit. A commit that adds a feature must also
  update any documentation or tests that reference it.
- **Do not describe a result before it exists** — a commit that only adds tests for
  feature X must not say "add feature X". The subject must match what is actually
  committed, not what will be committed later.

---

## Trailers — Banned

No `Co-Authored-By`, no `Co-authored-by`, no AI-attribution trailers of any kind.

```
# Never:
Co-Authored-By: Claude <noreply@anthropic.com>
Generated-by: AI
```
