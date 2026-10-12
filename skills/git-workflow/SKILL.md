---
name: git-workflow
version: "1.0.0"
description: Apply when running git to branch, search for a version string, commit, correct a commit, rebase, push, read a round of review, merge, remove a merged branch, or tag a release
license: Unlicense
metadata:
  author: ssoft
  tier: narrow
  bound-to:
    - git
  rubric: applied
  tags:
    - git
    - workflow
---

# Skill: Git Workflow

Apply when a git command is about to run at a step of `work-sequence` → The Sequence or of
`release`, and when a round of review is read. The steps, their order and their conditions
are those skills'; this skill gives the git commands each step runs.

## Commands by Step

**Must**

Must run the commands in bash or zsh, on git 2.32 or later, the first carrying
`--fixup=amend:` and `--fixup=reword:`. Must run at each step the commands its row names,
in the order given. Must join the commands with no output read between them as one line
with `&&`, never with `;`, `&` or `|`; a pipe stands only where a command reads the output
of the one before it. Must negate with `!` a check whose success is a non-zero exit
before it joins a `&&` chain.

`<remote>` is the remote the branch is sent to, `origin` by convention, and `<target>` the
branch the change merges into, written `<remote>/<target>` after a fetch; `<name>` is the
working branch; `<tip>` its tip, `HEAD` on the author's clone and `<remote>/<name>` on a
reviewer's; `<file>` a file holding a message; `<bump>` the version bump commit.

| Step | Commands | Section |
|---|---|---|
| Branch | `git fetch <remote>`, `git switch -c <name> --no-track <remote>/<target>`, which runs also where another worktree holds `<target>` | — |
| Commits | `git branch --show-current` and `git status --porcelain` before the first commit of a round, then `git commit -F <file>`; a correction in the form its section gives | Making the Branch, Committing with No Terminal, Correcting a Commit Already Made |
| `release` → Step 3 — Bump Version Strings, within Commits | `git grep -n -F "<old-version>"` before the bump and after it | — |
| Publish | `git fetch <remote>`, `GIT_SEQUENCE_EDITOR=: GIT_EDITOR=: git rebase -i --autosquash <remote>/<target>`, the correction check of Rebasing onto the Target, the checks `work-sequence` → When a Check Runs gives, then `git push -u <remote> HEAD`, or after a rewrite `git push --force-with-lease --force-if-includes <remote> HEAD` | Rebasing onto the Target, Sending the Branch |
| A round of review, between Offer for review and Pre-merge issue check | `git diff <remote>/<target>...<tip>`, and from the second round `git range-diff` | Reading One Round of Review |
| Integrate, merged locally, where the target accepts a direct push | in the worktree holding `<target>`, or after `git switch <target>` where none does: `git pull --ff-only`, `git merge-base --is-ancestor <target> <name>`, `test "$(git rev-parse <name>)" = <baseline>`, `<baseline>` being the head SHA `editing` → Guard Against a Stale Reading reads, the merge command of Merging, `git push <remote> <target>`, `git branch -d <name>`, `git push <remote> --delete <name>` | Merging, Removing the Merged Branch |
| Integrate, merged on the forge | `git fetch <remote>`, `git merge-base --is-ancestor <remote>/<target> <remote>/<name>`, the merge the CLI skill of the hosting platform gives; then, in the worktree holding `<target>`, or after `git switch <target>` where none does: `git pull --ff-only`, `git branch -d <name>`, `git push <remote> --delete <name>` | Merging, Removing the Merged Branch |
| `release` → Step 5 — Commit and Tag, once Integrate has run | `git fetch <remote>`, the `<bump>` line of Tagging a Release, `git tag -a <tag> -m "<message>" <commit>` on the commit its table names, `git push <remote> refs/tags/<tag>` | Tagging a Release |

## Making the Branch

**Must**

Must run the check of the branch `commit-rules` → Consistency Rules asks for as
`git branch --show-current`, before the first commit of a round of edits, and must make
the next move its row names:

| The current branch | The next move |
|---|---|
| a working branch | the commit |
| a shared branch, as `commit-rules` → Consistency Rules names one, or an empty line, `HEAD` being detached; carrying neither a commit of the round nor an uncommitted change, `git status --porcelain` printing nothing | the Branch step |
| a shared branch or a detached `HEAD` carrying a commit of the round or an uncommitted change | `git switch -c <name>`, which the rebase of the Publish step brings onto the target; then, where a commit of the round was recorded on the shared branch `<shared>`, `git branch -f <shared> <remote>/<shared>` |

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

## Correcting a Commit Already Made

**Should**

Should record a correction with the command of its row, chosen by reading the target's
message, `git log -1 <hash>`, against `git diff --cached`:

| The correction | The command | The file `cp` copies |
|---|---|---|
| code only, the target's message still true of it | `git commit --fixup=<hash>` | — |
| code, and what the target's message says about it | `GIT_EDITOR='cp <file>' git commit --fixup=amend:<hash>` | `amend! <target subject>`, a blank line, then the target's subject line and body as they read once folded |
| the message alone, nothing staged | `GIT_EDITOR='cp <file>' git commit --fixup=reword:<hash>` | as the row above |

- Once the Publish step's rebase has folded the corrections, should read the folded
  messages against their code, `git log -p <remote>/<target>..HEAD`.

## Rebasing onto the Target

**Must**

- Where the rebase stops on `CONFLICT`, must stage the resolution with `git add` and must
  continue with `GIT_EDITOR=: git rebase --continue`.
- Must hold the rule on correction commits of `commit-rules` → Consistency Rules with
  the check below, and must offer for review only a branch on which it exits 0:

```bash
! git log --format=%s <remote>/<target>..HEAD | grep -qE '^(fixup|amend|squash)! '
```

## Sending the Branch

**Must**

Must make the next move the row of the push's answer names; a refused push of the target
follows Merging:

| The answer | The next move |
|---|---|
| `! [rejected] ... (non-fast-forward)` | `git push --force-with-lease --force-if-includes <remote> HEAD` |
| `! [rejected] ... (fetch first)`, or `(stale info)` under the lease | `git fetch <remote>`, then `git push --force-with-lease --force-if-includes <remote> HEAD` |
| `! [rejected] ... (remote ref updated since checkout)` | `git log --reverse <remote>/<name> --not $(git reflog --format=%H <name>)`; `git cherry-pick` of each commit it lists, in that order, save one whose subject a commit of `<remote>/<target>..HEAD` carries: that one is an earlier version of the branch's own commit, sent from another clone; then `git push --force-with-lease <remote> HEAD`, without `--force-if-includes` |

- Must not list the commits to carry by `<remote>/<name>@{1}..<remote>/<name>`, and must
  not run the list again after the cherry-pick.
- Must not push under `--force`, `-f` or a `+` refspec.

## Reading One Round of Review

**Must**

```bash
git diff <remote>/<target>...<tip>                    # one round
git range-diff <remote>/<target> <old-tip> <tip>      # two rounds
```

- Must read the subject of a round as the three-dot diff above, never as a two-dot diff.
- `<old-tip>` is the tip the previous round read; on a reviewer's clone one fetch after
  that round, `<remote>/<name>@{1}`.
- `range-diff` marks a commit the round left alone `=`, a changed one `!` with the
  difference below it, and one only the old or the new range holds `<` or `>`. A commit
  changed past what the pairing admits shows as one `<` and one `>`;
  `--creation-factor=100` usually pairs the two under `!`.
- A hash read in an earlier round may name a commit the branch no longer carries: a
  rebase gives a new hash to the first commit the rebase changes and to every commit above
  that one.

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

## Removing the Merged Branch

**Must**

Must remove the branch in the worktree holding `<target>`, or after `git switch <target>`
where none does, once the local target carries the merge, and must make the next move the
answer's row names:

| The answer | The next move |
|---|---|
| `Deleted branch <name> (was <hash>).` | none |
| `error: branch '<name>' not found` | none: the merge the CLI skill gives removed the local branch |
| `error: cannot delete branch '<name>' used by worktree at '<path>'`, or on git before 2.42 `error: Cannot delete branch '<name>' checked out at '<path>'` | `git worktree remove <path>`, or `git -C <path> switch --detach`, then the removal |
| `warning: not deleting branch ...`, then an error ending `is not fully merged` | `git branch -D <name>`: the warning states the branch is merged into `HEAD` |
| an error ending `is not fully merged`, with no warning above it | `git pull --ff-only` on the target and the removal again; where it still refuses, `git cherry <target> <name>`: with no line opening with `+`, `git branch -D <name>`; with one, the branch stays, and its `+` commits are named to the user |
| `warning: deleting branch ...`, then `Deleted branch <name> (was <hash>).` | `git pull --ff-only` on the target, where it has not run |
| `- [deleted]         <name>`, from `git push <remote> --delete <name>` | none |
| `error: unable to delete '<name>': remote ref does not exist` | none: the merge on the forge removed the remote branch |

- Must remove a branch with `git branch -D` only after `warning: not deleting branch`,
  where `git cherry <target> <name>` prints no line opening with `+`, or on the user's
  instruction naming the branch.

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

## Cross-References

**Recommended**

- `commit-rules` — the message of every commit, and the branch name.
- `pr-rules` — the offer for review, its checklists, the merge method and the message
  of a merge commit.
- `release` — the version, the files carrying it, the bump commit and the tag's name.
- `submodule-sync` — the module refs a branch records.
- The CLI skill of the hosting platform — the offer for review and the merge run on the
  forge.
