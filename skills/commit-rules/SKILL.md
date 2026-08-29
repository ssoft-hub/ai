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
git commit --fixup=<hash>          # code-only fix; target's message is left untouched
git commit --fixup=amend:<hash>    # fix also changes what the message must say
git commit --fixup=reword:<hash>   # message-only correction, no code change
git rebase -i --autosquash <base>  # squashes fixups automatically before merge
```

Plain `--fixup` never opens an editor: `rebase --autosquash` folds the code silently and
keeps the target commit's original message exactly as it was, even when the fix makes
that message no longer describe the code. Use `amend:` (or `reword:` for a message-only
correction) whenever the fixup changes what the commit should say about itself — it
opens the editor immediately, pre-filled with the target's message, and the edited
result replaces the target's message during autosquash. `amend:`/`reword:` require
git ≥ 2.32; on an older git, amend the target commit's message by hand after autosquash
instead.

Use `--fixup` when the change belongs to a specific earlier commit — reviewer sees the correction attached to its target, not floating. Use a normal commit only when the change is logically independent.

## Fixup / Squash Merges

Squash fixup commits before the Publish step, not at merge time (`work-sequence` →
The Sequence).

Before running `rebase -i --autosquash`, check whether any fixup changes what its target
commit's body claims. If so, that fixup must be `--fixup=amend:<hash>`, not plain
`--fixup` — otherwise the merged commit keeps describing the pre-fix behaviour.

After autosquash completes, re-read each final message (`git log -1 <hash>`) against the
diff it now covers (`git show <hash>`) and amend anything that drifted. The merged
commit must read as if it was written that way from the start.

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
