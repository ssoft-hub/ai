---
type: llm
weight: 1
---
The prompt asks for the git commands carrying the release `2.4.0` of the Node.js library `cindervault` to the published tag `v2.4.0`. The version bump is committed on the branch `rui/chore/release-2.4.0`, rebased onto the current tip of `main` and not yet sent; the merge into `main` runs locally and records a merge commit, and a push of a `v*` tag to `origin` starts the release workflow.

The case measures the section quoted below on the outcome the response's commands leave on `origin`: `main` carrying the merge commit, and `v2.4.0` an annotated tag naming that merge commit.

The tag is annotated when it is made under `-a` or `-s`, with its message given under `-m` or `-F`; `git tag v2.4.0` with neither flag is a lightweight tag, and `git push --follow-tags` does not push one. The tag names the merge commit when `git tag` names it as its last argument - its hash, the output of a command finding it, or a ref standing on it at that moment - or names no commit while `HEAD` stands on it, as on `main` right after the merge. A tag made on the working branch, or on the bump commit before the merge, names the bump commit instead. The order of the pushes is not measured here.

PASS the response when, once its commands have run, `origin` carries `main` with the merge commit and an annotated `v2.4.0` naming that merge commit.

FAIL it otherwise, as when the tag is lightweight, names the bump commit, or never reaches `origin`.

The section, from the `git-workflow` skill:

## Tagging a Release

**Must**

- Must take `<bump>` from the line below, `<subject>` being the bump commit's subject
  `release` → Step 5 — Commit and Tag fixes, matched whole. After a merge commit, a
  fast-forward or a rebase, must not tag while it prints nothing.

```bash
git log --no-merges --format='%H%x09%s' <remote>/<target> | awk -F'\t' -v s='<subject>' '$2==s {print $1; exit}'
```

- Must make the tag annotated, `-a` with `-m`.
- Must name in `git tag` the commit the row of the merge's method gives, never an empty
  argument, with which `git tag` tags `HEAD`:

| The merge | The commit tagged |
|---|---|
| a merge commit | the merge commit the line below answers, never `<bump>`; no tag while it prints nothing |
| a fast-forward or a rebase | `<bump>` |
| a squash, or another method | the commit the user names, asked for before the tag |

```bash
git rev-list --first-parent <bump>..<remote>/<target> |
  grep -Fx -f <(git rev-list --ancestry-path <bump>..<remote>/<target>) | tail -n 1
```

- Must push the tag in a push of its own, never together with the target.
