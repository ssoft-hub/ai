---
type: llm
weight: 1
---

The prompt asks for the git commands correcting the message of `5e1f2a0` on the branch `ivo/feat/LK-8/add-tooltip` of the TypeScript library `lumenkit`, run on git 2.47 in a shell with no terminal attached, where no editor opens. The branch is not yet sent and carries `5e1f2a0`, whose body reads `The tooltip opens after the delay prop, in milliseconds.`, then `7c3d9b1` and `9a8b7c6`. The body has to say `openDelay` instead of `delay`; no code changes and nothing is staged.

The case measures the section quoted below: with no terminal, every command gives its message in the command itself, since a command leaving the message, or the todo list of an interactive rebase, to an editor gets no editor.

Any commands reaching the outcome count, provided none waits on an editor: `git commit --fixup=reword:5e1f2a0` run with `GIT_EDITOR` set to a command writing the new message, such as `GIT_EDITOR='cp <file>'`, the file it copies starting with `amend! feat(tooltip): add the tooltip component` and a blank line, then a rebase folding it with no editor: `git rebase -i --autosquash main` with `GIT_SEQUENCE_EDITOR=:` and `GIT_EDITOR=:`, or `git rebase --autosquash main` without `-i`, which git 2.44 and later run with no editor; or an interactive rebase whose todo list is edited by a command set in `GIT_SEQUENCE_EDITOR`, such as `sed`, and whose message is written by a command set in `GIT_EDITOR` or by `git commit --amend -m` or `-F` at a stop. A `git rebase -i` with `GIT_SEQUENCE_EDITOR` unset, a `--fixup=reword:` or `--fixup=amend:` with `GIT_EDITOR` unset, and a `git commit --amend` with no `-m`, `-F` or `--no-edit` each wait on an editor. Without the `amend!` line the rebase folds nothing: `5e1f2a0` keeps `delay` and a fourth commit carries the new message. `--fixup=reword:` with `-m` or `-F` is refused by git. `git commit --amend` run on the tip changes `9a8b7c6`, not `5e1f2a0`.

PASS the response when, once its commands have run, `5e1f2a0` carries a body saying `openDelay` where it said `delay`, the three commits carry the code they carried before, and no command waits on an editor.

FAIL it otherwise.

The section, from the `git-workflow` skill:

## Committing with No Terminal

**Must**

Must give every commit of the Commits step its message in the command: `-F <file>`,
`--no-edit` under `--amend`, `--fixup=<hash>`, or `GIT_EDITOR='cp <file>'` before
`--fixup=amend:` or `--fixup=reword:`.

```bash
git commit -F <file>             # subject, blank line, body
git commit --amend --no-edit     # the tip commit, its message kept
git commit --amend -F <file>     # the tip commit, its message replaced
```

- Must correct a commit below the tip under a `--fixup` form, never under `--amend`.
