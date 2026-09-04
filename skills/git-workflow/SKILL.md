---
name: git-workflow
version: "1.0.0"
description: Apply when a git command moves a branch, a commit, a tag or a remote ref - branching, committing, correcting, rebasing, merging, tagging, pushing
license: Unlicense
metadata:
  author: ssoft
  tier: domain
  bound-to:
    - git
  rubric: applied
  tags:
    - git
    - workflow
---

# Skill: Git Workflow

Apply when a git command is about to run against a branch, a commit, a tag or a remote
ref.

## Project Overrides

**Must**

Must follow the git commands and their order the repository's `AGENTS.md` file or a
project skill defines, instead of the rule here.

## The Command Sequence

**Must**

The steps below carry one change from a branch to a released tag, and nothing else
belongs to the sequence. Each step must run after the one above it, and the step
conditions — when a round of edits closes, when the branch is offered for review — are
`work-sequence` → The Sequence's.

| Step | The command | What git records |
|---|---|---|
| Branch | `git checkout -b <name> <target>` | a new ref at the target's tip |
| Commit | `git commit` | one commit on that ref |
| Correct | `git commit --fixup=<hash>` | a correction attached to its target commit |
| Rebase | `git rebase --autosquash <target>` | the branch replayed on the target's tip, corrections folded in |
| Send | `git push -u origin HEAD` | the branch on the remote, with an upstream set |
| Merge | `git merge --no-ff <name>` | a merge commit on the target, with both parents |
| Tag | `git tag <tag>` | a tag ref at the merge commit |
| Publish the tag | `git push`, then `git push --tags` | the merge commit, and then the tag, on the remote |

A round of review returns to the Commit step and runs forward from there, so every step
from Commit to Send runs once per round rather than once per change.

## Naming the Branch

**Must**

```
<user>/<type>/<TRACKER-N>/<subject>
```

| Segment | What it holds |
|---|---|
| `user` | the git account name, always, which marks the branch personal |
| `type` | one value of the type vocabulary `commit-rules` → Types fixes |
| `TRACKER-N` | the issue identifier — `PROJ-42`, `GH-7`; the author must drop the segment entirely where no issue is tracked |
| `subject` | kebab-case, imperative, and at most five words |

The command must name the target branch, since a branch made without one starts wherever
`HEAD` stands:

```bash
git checkout -b ssoft/feat/PROJ-42/add-siphash main
git checkout -b ssoft/chore/update-submodule-refs main
```

## The Protected Branch

**Must**

Must read the current branch before the first commit of a round of edits, and must not
commit where the answer is a shared branch — `main`, `master`, or whatever the project
declares:

```bash
git branch --show-current   # the Branch step has not run where this answers the target
```

A pre-commit hook, where the project or the machine installs one, refuses such a commit
instead of recording it, and a forge may refuse the push instead — so a branch made after
the fact costs a rewrite of what is already recorded.

## Correcting a Commit Already Made

**Must**

| The correction | The command | The editor |
|---|---|---|
| code only, the target's message still true of it | `git commit --fixup=<hash>` | none opens; the target's message survives the fold untouched |
| code, and what the message says about it | `git commit --fixup=amend:<hash>` | opens at once, pre-filled with the target's message |
| the message alone | `git commit --fixup=reword:<hash>` | opens at once; no staged change is needed |
| the tip commit, before it is sent | `git commit --amend` | opens unless `--no-edit` is passed |

- Must reach for `amend:` wherever the fix changes what the commit says about itself,
  which the Rebase step's `git log -1 <hash>` against `git show <hash>` establishes:
  under plain `--fixup` the Rebase step folds the code and keeps the target's message,
  which then describes the pre-fix behaviour.
- The forms `amend:` and `reword:` need git ≥ 2.32. On an older git the author must
  amend the target's message by hand after the Rebase step instead.
- Must attach the correction to its target rather than commit it free-standing, wherever
  the change belongs to an earlier commit of the same branch: the reviewer then reads the
  correction against what it corrects. A change that stands on its own is a normal commit.
- A branch offered for review must carry no correction of a mistake made earlier on that
  same branch. The Rebase step folds them in first, so each commit reads as correct from
  the start.

## Rebasing onto the Target

**Must**

```bash
git rebase --autosquash <target>   # -i as well, before git 2.44
git log -1 <hash>                  # the message the fold produced
git show <hash>                    # the diff it now covers
```

- The command replays the branch under the `--autosquash` flag on the target's tip and folds every `fixup!` and
  `amend!` commit into the commit it names. From git 2.44 the command squashes without `-i`; before
  that it needs `-i`, and with it an editor.
- Must re-read each folded message against the diff it now covers and amend what drifted:
  the merged commit reads as if it had been written that way from the start.
- Must run the Rebase step before the branch is sent and before the merge, and ahead of
  every check measured against the head, which the rebase moves
  (`work-sequence` → When a Check Runs).

## Sending the Branch

**Must**

```bash
git push -u origin HEAD              # first send, recording the upstream
git push --force-with-lease          # after a rewrite
```

| The answer | What it means | The next move |
|---|---|---|
| `! [rejected] ... (non-fast-forward)` | the branch was rewritten after it was sent | `--force-with-lease` |
| `! [rejected] ... (stale info)` | the remote ref moved since this clone last saw it | must read the remote branch before overwriting a commit that is not this branch's |
| `+ <old>...<new> ... (forced update)` | the remote now carries the rewritten branch | — |

- Must not run `git fetch` between reading the remote branch and the forced push: the
  lease compares against the remote-tracking ref, which the fetch updates, and the push
  then discards the other author's commit without a word.
- Must not reach for the `--force` flag, under which the push overwrites whatever the remote holds in every case.

## Merging

**Must**

```bash
git merge --no-ff <branch>   # run from the target's tip
```

- Must not fast-forward and must not squash. The merge commit is what records both
  parents, and a squash replaces every message the branch carried with one of its own.
- The merge commit's subject and body are `pr-rules` → Merge Strategy's, and a merge run
  on the forge rather than locally belongs to the CLI skill of the hosting platform.

## Removing the Merged Branch

**Must**

Must remove the local branch with the merge: `git branch -d <name>`, run from the target, which
answers `Deleted branch <name> (was <hash>)`. git refuses that removal in two cases:

| The refusal | Why | The answer |
|---|---|---|
| `error: cannot delete branch '<name>' used by worktree at '<path>'` | a worktree has the branch checked out | `git worktree remove <path>` first, then the removal |
| `error: the branch '<name>' is not fully merged` | the branch holds a commit the current branch does not | must run it from the target after the merge; `-D` discards the commits the target does not carry |

The remote branch is removed through the CLI skill of the hosting platform, which states
what the forge deletes on the merge and what it leaves.

## Tagging a Release

**Must**

The version bump is a change like any other and takes the eight steps above: the Branch,
Commit, Send and Merge steps carry it, and the Tag and Publish steps follow on the
target.

```bash
git add <the files release Step 5 names>
git commit                  # the version bump, on the working branch
# the Send and Merge steps run here
git tag <tag>               # on the merge commit, from the target
git push
git push --tags             # a push of its own: the first carries no tag
```

- Must tag the merge commit rather than the bump commit on the working branch. A tag
  names one commit, and a reader of the release reads the history that commit carries;
  a commit the target does not carry names history the release does not contain.
- Must keep that order. A tag made before the merge names a commit the target has yet
  to carry. What the bump commit holds and what the tag is called are `release` →
  Step 5's and Step 1's.
- Must run `git push --tags` as a push of its own. A plain push leaves the remote with
  no tag at all, and the release workflow the tag triggers therefore never starts.

## Reading One Round of Review

**Must**

```bash
git diff <target>...HEAD                                     # the subject of one round
git range-diff <old-base>..<old-tip> <new-base>..<new-tip>    # two rounds, across a rewrite
```

- Must read the subject of a round with three dots, which diffs from the merge base. Two
  dots diff the two endpoints, so every commit the target gained since the branch started
  arrives as this branch's own reversal of it — a file the target added is reported as a
  deletion, against an author who never touched it.
- `range-diff` pairs the commits of the two rounds across a rebase or an autosquash: `=`
  for a commit the round left alone, `!` for a paired commit with the difference below it,
  `<` and `>` for one the old or the new range holds alone.
- A rebase and an autosquash give every commit a new hash, so a hash read in an earlier
  round names a commit the branch no longer carries
  (`pr-rules` → No Figures That Go Stale).

## Cross-References

**Recommended**

- `commit-rules` — the message every commit above carries.
- `pr-rules` — the pull request the branch is offered as, its checklists and its merge commit.
- `release` — the version the tag names, and what holds before it is frozen.
- `work-sequence` — the step each command runs at, and the checks a moved head owes.
- `submodule-sync` — the module refs a branch records, and the module's own branch key.
- The CLI skill of the hosting platform — the merge and the branch removal run on the forge.
