# Skill: Commit Rules

Apply when writing commit messages or reviewing commits.

---

## Format

```
type(scope): subject

Body explaining the change.
```

**First line:** `type(scope): subject` — total length ≤ 72 characters.
**Scope** is optional; use when the change is clearly scoped to one module/component.
**Subject:** imperative mood, lowercase after the colon, no trailing period.

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

Body is required when the subject alone does not explain the reasoning. Write in plain language — no rigid sections, no headers. Explain:

- **why** the change was made
- **what problem** it solves
- **how** it was approached (when the approach is non-obvious)

```
feat(hash): add SipHash-2-4 keyed 64-bit hash

SipHash provides hash-flooding resistance missing in fnv1a/djb2.
Implements the reference SipHash-2-4 algorithm with a 128-bit key.
Key is passed as two uint64_t values to avoid struct padding issues.
```

Body is optional for mechanical changes where subject is self-explanatory:
```
chore: update submodule refs to current branch heads
```

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

---

## Trailers — Banned

No `Co-Authored-By`, no `Co-authored-by`, no AI-attribution trailers of any kind.

```
# Never:
Co-Authored-By: Claude <noreply@anthropic.com>
Generated-by: AI
```
