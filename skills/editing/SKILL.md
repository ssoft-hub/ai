---
name: editing
version: "1.0.0"
description: Apply before writing a file, a tracker issue body or a PR description, and before a merge, which reads the pull request's review threads again first
license: Unlicense
metadata:
  author: ssoft
  tier: domain
  rubric: applied
  bound-to:
    - agent-tool
  tags:
    - workflow
    - editing
---

# Skill: Editing an Artifact

Apply before writing a file, a tracker issue body or a PR description, and before a
merge. Guard Against a Stale Reading names each one.

## Project Overrides

**Must**

Must follow the guard against a stale reading the repository's `AGENTS.md` file or a
project skill defines, instead of the rule here.

## Guard Against a Stale Reading

**Must**

| Artifact | Guard | Procedure where the guard does not hold |
|---|---|---|
| A file | Only the exact-string match of the tool `Edit`, which fails loudly | Re-Read Before Edit |
| The body of a tracker issue, with its checklist boxes | None: the command that writes the body — `gh issue edit --body-file`, and its equivalent on the CLI skill of the issue tracker — replaces it whole | Must build the write from the body fetched immediately before it, checklist boxes included |
| The description of a PR | None, for the same reason: the command `gh pr edit --body-file`, and its equivalent on the CLI skill of the hosting platform, replaces the description whole | As for the issue body |
| A review thread | None: a branch requiring every thread resolved refuses an unresolved one, not one opened and resolved between the two reads, and an administrator can bypass even that | Must read the thread list again immediately before the merge command runs, and must match it against the list read when the review was last addressed. A thread appearing between the two reads blocks the merge until a confirmation of its own names it; where no earlier read exists, every unresolved thread blocks it |
| A merge | Must pass the head SHA read after the last rebase to the merge command — the flag `--match-head-commit <sha>` of the command `gh pr merge`, and its equivalent on the CLI skill of the hosting platform — which then refuses the merge once that head has moved | Where a CLI offers no such flag, must read the head SHA immediately before the merge command and refuse the merge where it differs from the one read after the rebase |

Nothing else belongs to the table. The rest of the merge gate: `pr-rules` → Merge Strategy.

## Re-Read Before Edit

**Must**

Must issue a fresh `Read` of the target file immediately before editing it — even if it was read earlier in the same session.

**Why:** The user edits files directly between Claude interactions (build error fixes, manual corrections, formatting). A cached read from earlier in the session may be stale; editing from stale state overwrites user changes silently.

**Rule:** One `Read` → one `Edit` block. If multiple edits to the same file are needed in one turn, read once, then apply all edits. Do not re-read between edits within the same turn.

## Edit Scope

**Should**

- Edit only files explicitly in scope for the current task.
- Do not touch adjacent files unless the user requested it.
- Prefer `Edit` (diff) over `Write` (full overwrite) for existing files.
