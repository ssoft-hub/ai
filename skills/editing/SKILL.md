---
name: editing
version: "1.0.0"
description: Apply when writing a file, a tracker issue body or a PR description, and when a merge turns on a review thread or the branch head
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

Apply when writing a file, a tracker issue body or a PR description, and when a merge
turns on a review thread or the branch head. The section Guard Against a Stale Reading
names every artifact and what guards it.

## Project Overrides

**Must**

Must follow the guard against a stale reading the repository's `AGENTS.md` file or a
project skill defines, instead of the rule here.

## Guard Against a Stale Reading

**Must**

| Artifact | Guard | What the reader owes |
|---|---|---|
| A file | Only the exact-string match of the tool `Edit`, which returns an error and writes nothing. The tool `Write` replaces the file whole and carries no such match | Re-Read Before Edit |
| The body of a tracker issue, with its checklist boxes | None: the command the CLI skill of the issue tracker gives for writing a body replaces it whole | Must build the write from the body fetched immediately before it, checklist boxes included |
| The description of a PR | None, for the same reason, with the command named by the CLI skill of the hosting platform | As for the issue body |
| A review thread | Partial: where the repository or the target branch requires every thread resolved, the platform refuses a merge leaving one unresolved. It refuses neither a thread opened and resolved between the two reads nor a merge an administrator forces | Must read the thread list again immediately before the merge command runs, and must match it against the list read when the review was last addressed. A thread appearing between the two reads blocks the merge until an instruction from the human names that thread. Where no earlier read exists, every unresolved thread blocks it |
| A merge | Partial: the head guard the CLI skill of the hosting platform names refuses the merge once the head no longer matches the SHA that guard is given, and refuses nothing where the merge runs without it | Must pass that guard the head SHA read after the last rebase, or after the review where the rebase moved nothing. Where the merge runs through a path taking no such argument, must read the head SHA immediately before the merge command and refuse the merge where it differs from that baseline |

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
