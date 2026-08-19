---
name: submodule-sync
version: "1.0.0"
description: Apply when syncing git submodules or working across submodule boundaries
license: Unlicense
metadata:
  author: ssoft
  tier: domain
  tags:
    - git
    - submodules
---

# Skill: Submodule Sync

Apply before superproject commits, before PR, before release, when working across
submodules.

## Project Overrides

Project-local rules win. If the repository's `AGENTS.md` or a project skill defines its own submodule workflow, follow those instead. This skill is the fallback for projects that do not specify their own.

## Core Concept

The superproject records one commit SHA per module. `.gitmodules` records each module's
`path`, `url` and, when set, the `branch` it follows.

`git submodule status` prefix meanings:

| Prefix | What it says | Way out |
|---|---|---|
| ` ` (space) | the checked-out commit is the one the superproject records ✓ | nothing to do |
| `+` | the checked-out commit differs from the one the superproject records — a module carrying commits the superproject has not recorded and a module reset to an earlier commit both print it | Resolving `+` below |
| `-` | the module is not initialized; its directory is empty | `git submodule update --init --recursive` |
| `U` | the gitlink is in conflict; the SHA printed is all zeros | Resolving `U` below |

## Resolving `+`

The prefix names no direction, so read the direction before acting:

```bash
git diff --submodule=log module/foo
```

Git prints one of three forms, and the marker to read is the number of dots:

- `Submodule module/foo <old>..<new>:` with `>` lines — two dots, the checkout carries
  commits the superproject has not recorded.
- `Submodule module/foo <old>..<new> (rewind):` with `<` lines — two dots and the marker,
  the checkout is missing commits the superproject records.
- `Submodule module/foo <old>...<new>:` with both `>` and `<` lines — three dots, the two
  have diverged. No `(rewind)` marker appears, so a rule keyed on that marker reads this
  as the first form.

The condition that picks the way out, rather than the marker:

```bash
git rev-parse :module/foo                                       # the recorded SHA, as
                                                                # `git submodule status`
                                                                # compares it: the index
git -C module/foo merge-base --is-ancestor <recorded SHA> HEAD   # exit 0 or non-zero
```

`:module/foo` and not `HEAD:module/foo`: both `git submodule status` and
`git diff --submodule=log` compare the index entry, so where the gitlink is already staged
the two disagree and the `HEAD` baseline inverts the verdict — it exits 0 on a rewind the
marker got right. Merge Order Across Repositories below wants the other one, because what
merges is what the branch records.

- `git add module/foo` — records the checked-out commit, and is correct only where that
  `merge-base --is-ancestor` exits 0, which holds on the first form alone. On the other
  two it writes the commits the checkout is missing out of the superproject.
- `git submodule update module/foo` — checks the recorded commit out again and leaves the
  superproject untouched. Correct wherever the condition exits non-zero and the checkout
  is not what should be recorded.
- On the diverged form neither is correct alone: merge inside the module first, as under
  Resolving `U` with the recorded SHA above as the other side, and record the merge commit.

`git status` does not choose for you: it prints `modified: module/foo (new commits)` in
both directions.

## Resolving `U`

A merge leaves `U` when the two sides record module commits neither of which contains the
other; where one contains the other, git fast-forwards the gitlink itself. Merge the two
module commits inside the module, and record only once that merge has concluded:

```bash
# 0. Put the module on a branch, before the merge — a module `git submodule update`
#    checked out is detached, and a branch cannot be switched mid-merge.
git -C module/foo symbolic-ref -q HEAD || git -C module/foo switch -c <branch>

# 1. The two sides, from the conflicted gitlink's stages: :2: ours, :3: the side merged.
#    `:module/foo` is stage 0 and fails here — there is none during a conflict.
git rev-parse :2:module/foo :3:module/foo

# 2. Merge inside the module. A content conflict exits 1 and leaves `UU` paths behind.
git -C module/foo merge <the :3: SHA>

# 3. Resolve those paths and conclude the merge — this must exit 0 before step 4.
git -C module/foo commit --no-edit

# 4. Record the merge commit.
git add module/foo
```

`git add module/foo` records the module's current HEAD whatever state the module's index
is in, so running it between steps 2 and 3 records the pre-merge HEAD and drops the side
being merged. Nothing objects at that moment: `git submodule status --recursive` prints the
space prefix and the superproject's merge commit lands. What catches it before the pull
request is line 2 of the Pre-PR check, which prints `UU` for the module.

## Correct Workflow

```bash
# 0. Put the module on a branch — a module `git submodule update` checked out is detached
cd module/foo
git symbolic-ref -q HEAD || git switch -c <branch>   # branch name → commit-rules

# 1. Commit changes inside the module repo
git add <changed-files>
git commit -m "feat: ..."

# 2. Back in the superproject — record the new module ref
cd ../..
git add module/foo
git commit -m "chore: update module/foo ref"
```

## Detached HEAD

`git submodule update` checks the recorded commit out detached. Inside the module
`git status` prints `HEAD detached at <sha>`, `git status --short --branch` prints
`## HEAD (no branch)`, and `git symbolic-ref -q HEAD` exits non-zero. A commit made from
there is held by no ref: the next `git submodule update` checks the recorded commit out
again, and `git branch --all --contains <sha>` then lists nothing. Switch to a branch
before the commit, never after.

## Pre-PR / Pre-Release Check

```bash
git submodule status --recursive                      # no '+', '-' or 'U' on any line
git submodule foreach --recursive git status --short  # every module clean
git push --dry-run --recurse-submodules=check <remote> <branch>   # must exit 0
```

`--recursive` on both of the first two: neither walks a module's own modules without it,
so a nested module carrying `+` passes a check that leaves it out. Line 2 prints
`Entering '<path>'` before each module's own output, so a clean module contributes that
line and nothing after it.

The push check is the only one that reads what the remote holds. The first two pass on a
branch whose recorded module commit exists in no clone but yours; the push then refuses it
with `The following submodule paths contain changes that can`, then `not be found on any
remote:` on the next line — git breaks the sentence between `can` and `not`, so a search
for it on one line finds nothing. The `git submodule update --init --recursive` of whoever
clones next refuses it too. Publish the module commit and rerun.

## Merge Order Across Repositories

A superproject working branch merges only after the module branches it records are merged
and published. The condition, per module:

```bash
git rev-parse HEAD:module/foo   # what the branch records — the committed ref, not the index
git -C module/foo fetch origin
git -C module/foo merge-base --is-ancestor <recorded SHA> origin/<target branch>
```

Exit 0 — the recorded commit is on the module's target branch. Non-zero — merging the
superproject would put a ref on the target branch pointing at a commit that module's
target branch does not carry. `pr-rules` → Pre-Merge Checklist gates on this.

Merging a branch inside a module is not on its own a reason to bump the module ref in the
superproject: bump it when the superproject needs the new module state. The same holds
facing the other way — merging a superproject branch obliges no commit inside a module.

## Common Operations

```bash
# Populate every module after a fresh clone — until this runs the directories are
# empty and `git submodule status` prints '-' for each one
git submodule update --init --recursive

# Take on a new module — clones it, writes the .gitmodules section, stages both
git submodule add <url> module/foo

# Move a module to its remote's current state instead of the recorded commit
git submodule update --remote module/foo
```

`--remote` follows `submodule.<name>.branch` from `.gitmodules`, and the module clone's
own `origin/HEAD` when that key is absent. That ref is a local cache written at clone
time: a plain fetch leaves it alone, so once the remote's default branch moves, `--remote`
keeps following the old one until `git -C module/foo remote set-head origin -a` rewrites
it. Set the key where a module must follow some other branch, and there is nothing to
refresh:

```
[submodule "module/foo"]
	path = module/foo
	url = <url>
	branch = release
```

Removing a module takes three commands and the commit that records them, each leaving
what the next one takes:

```bash
git submodule deinit -f module/foo   # empties the directory, unregisters it from .git/config
git rm module/foo                    # drops the .gitmodules section and the gitlink from the index
# git has no command for the next line, and `rm -r` draws a `bash-safety` prompt
rm -rf .git/modules/module/foo       # drops the repository git kept inside the superproject's
git commit -m "chore: remove module/foo"
```

`deinit` alone leaves both the `.gitmodules` section and the gitlink in place. After
`git rm`, `.gitmodules` carries no section for the module — the file itself stays, empty,
when that was the last one — and `git ls-files --stage` lists no `160000` entry for the
path.

## Rules

- Never record a superproject ref pointing to an uncommitted or half-merged module state
- Module changes and the superproject ref update are separate commits
- `git add module/foo` only where `git -C module/foo merge-base --is-ancestor <recorded
  SHA> HEAD` exits 0, the recorded SHA read from `git rev-parse :module/foo` — the
  `(rewind)` marker is absent on a divergence, where `git add` drops commits just the same
- Run every line of the Pre-PR / Pre-Release Check before opening a PR
