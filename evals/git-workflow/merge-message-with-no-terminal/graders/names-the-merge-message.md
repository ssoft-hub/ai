---
type: llm
weight: 1
---

The prompt asks for the git commands an agent runs to merge the branch `lin/feat/BQ-7/add-parquet-export` of the Python pipeline `brightquay` into `main` locally, for pull request #12 titled `BQ-7: Add parquet export`, in a shell with no terminal attached.

The case measures the section quoted below on the merge commit's message with no terminal: git opens no editor, so a message left to one is git's default, `Merge branch 'lin/feat/BQ-7/add-parquet-export'` with no body. The merge command is the command the response gives to join the branch to `main`; it gives the message when it carries `-F` naming a file, or `-m` with the message's text. A message the response says will be typed in an editor, `--no-edit` included, is git's default. A message given afterwards, by `git commit --amend` or any other commit on `main`, is a further commit on the shared branch, which a protection of that branch may refuse wherever the merge itself is allowed.

PASS the response when its merge command records the merge commit with a subject and a body the response gives.

FAIL it otherwise, as when the merge commit carries git's default message, or the response gives the message only through a further commit on `main`.

The section, from the `git-workflow` skill:

## Merging

**Must**

- Must merge only where the `git merge-base --is-ancestor` check of the Integrate row
  exits 0 (`pr-rules` → Merge Strategy 3).
- Must merge locally only where the target accepts a direct push; elsewhere the merge
  runs on the forge, through the CLI skill of the hosting platform.
- Must merge with the command of the method `pr-rules` → Merge Strategy 4 settles, and
  never with a plain `git merge`:

| The method | The merge command |
|---|---|
| a merge commit | `git merge --no-ff -F <file> <name>`, or one `-m` per paragraph in place of `-F` |
| a fast-forward | `git merge --ff-only <name>` |
| another method the project states, such as a squash or a rebase | the flag the CLI skill of the hosting platform gives, the merge then running on the forge |

- Where the push of the target is refused with `(fetch first)` or `(non-fast-forward)`,
  must run `git fetch <remote>`, must drop the local merge with
  `git reset --keep <remote>/<target>`, then must run the Publish step on `<name>`, in the
  worktree holding it or after `git switch <name>` where none does. Must report any other
  refusal of that push to the user.
