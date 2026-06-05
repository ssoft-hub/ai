# Skill: File Editing Workflow

Apply when editing any file in the project.

## Re-Read Before Edit

Always issue a fresh `Read` of the target file immediately before editing it — even if it was read earlier in the same session.

**Why:** The user edits files directly between Claude interactions (build error fixes, manual corrections, formatting). A cached read from earlier in the session may be stale; editing from stale state overwrites user changes silently.

**Rule:** One `Read` → one `Edit` block. If multiple edits to the same file are needed in one turn, read once, then apply all edits. Do not re-read between edits within the same turn.

## Edit Scope

- Edit only files explicitly in scope for the current task.
- Do not touch adjacent files unless the user requested it.
- Prefer `Edit` (diff) over `Write` (full overwrite) for existing files.
