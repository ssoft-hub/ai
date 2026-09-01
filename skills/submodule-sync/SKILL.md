---
name: submodule-sync
version: "1.0.0"
description: Apply when syncing git submodules or working across submodule boundaries
license: Unlicense
metadata:
  author: ssoft
  tier: domain
  bound-to:
    - git
  rubric: applied
  tags:
    - git
    - submodules
---

# Skill: Submodule Sync

Apply before superproject commits, before PR, before release, when working across
submodules.

## Project Overrides

**Must**

Must follow the submodule workflow the repository's `AGENTS.md` file or a project skill
defines, instead of the rule here.

## Correct Workflow

**Must**

```bash
# 0. Put the module on a branch
git -C module/foo symbolic-ref -q HEAD || git -C module/foo switch -c <branch>
# 1.
git -C module/foo add <changed-files>
git -C module/foo commit -m "feat: ..."
# 2. Record the ref in the superproject, in a commit of its own
git add module/foo
git commit -m "chore: update module/foo ref"
```

Branch name → `commit-rules`. Never record a ref pointing at an uncommitted or half-merged
module state.

## Detached HEAD

**Must**

Switch the module to a branch before committing in it, never after: a commit made from a
detached HEAD is held by no ref, and the next `git submodule update` discards it.

| Command | Reports a detached HEAD as |
|---|---|
| `git -C module/foo symbolic-ref -q HEAD` | a non-zero exit |
| `git -C module/foo status --short --branch` | `## HEAD (no branch)` |
| `git -C module/foo status` | `HEAD detached at <sha>` |

## Status Prefixes

**Must**

Read `git submodule status` and act on the prefix:

| Prefix | What it says | Way out |
|---|---|---|
| ` ` (space) | the checked-out commit is the one the superproject records | nothing to do |
| `+` | the checked-out commit differs from the one the superproject records, in either direction | Resolving `+` below |
| `-` | the module is not initialized; its directory is empty | `git submodule update --init --recursive` |
| `U` | the gitlink is in conflict; the SHA printed is all zeros | Resolving `U` below |

## Resolving `+`

**Must**

Read the direction, then gate `git add` on the ancestor condition rather than on the form
printed:

```bash
git diff --submodule=log module/foo                              # the direction
git rev-parse :module/foo                                        # the recorded SHA — the index
                                                                 # entry, which status and diff compare
git -C module/foo merge-base --is-ancestor <recorded SHA> HEAD   # exit 0 or non-zero
```

| Printed | What it says |
|---|---|
| `<old>..<new>:` with `>` lines | the checkout carries commits the superproject has not recorded |
| `<old>..<new> (rewind):` with `<` lines | the checkout is missing commits the superproject records |
| `<old>...<new>:` with both | three dots and no `(rewind)` marker — the two have diverged |
| `contains modified content` | no dots, and `git submodule status` carries the space prefix — the difference is inside the module's own checkout; commit it inside `module/foo` first, since `git add module/foo` stages nothing here |

- `git add module/foo` — only where that `merge-base --is-ancestor` exits 0; anywhere else
  it drops the commits the checkout is missing.
- `git submodule update module/foo` — where the diff printed `(rewind)`: the checkout
  carries no commits of its own.
- Diverged — merge under Resolving `U` with the recorded SHA as the other side, then
  record the merge commit.
- Deliberate downgrade — revert inside the module, then `git add`; the gate exits 0.

Do not read the direction off `git status`: it prints `modified: module/foo (new commits)`
in both directions.

## Resolving `U`

**Must**

Merge the two module commits inside the module; record only once that merge has concluded:

```bash
# 0. Put the module on a branch first — a branch cannot be switched mid-merge
git -C module/foo symbolic-ref -q HEAD || git -C module/foo switch -c <branch>
# 1. Read the two sides — :2: ours, :3: the side merged
git rev-parse :2:module/foo :3:module/foo
# 2. Merge inside the module — exit 1 leaves `UU` paths behind
git -C module/foo merge <the :3: SHA>
# 3. After an exit 1 only: resolve those paths and conclude the merge, which must exit 0
git -C module/foo commit --no-edit
# 4. Record the merge commit
git add module/foo
```

Never run step 4 while step 2 has left `UU` paths: it records the pre-merge HEAD and drops
the side being merged, unnoticed until line 2 of the Pre-PR check.

## Nested Gitlinks

**Must**

A gitlink is in the index of its immediate parent, so a `--recursive` line naming
`module/foo/bar` is resolved at `module/foo` against `bar`. Run in the superproject,
`git rev-parse :module/foo/bar` exits 128 and `git diff --submodule=log module/foo/bar`
prints nothing.

| Step | Command |
|---|---|
| Resolving `+`, the direction | `git -C module/foo diff --submodule=log bar` |
| Resolving `+`, the baseline | `git -C module/foo rev-parse :bar` |
| Resolving `U`, the two sides | `git -C module/foo rev-parse :2:bar :3:bar` |
| Resolving `U`, step 4 | `git -C module/foo add bar` |

Steps 0, 2 and 3 of Resolving `U` run inside `module/foo/bar` itself. `module/foo` then
commits, and the superproject records `module/foo`.

## Pre-PR / Pre-Release Check

**Must**

Run every line before opening a PR and before a release:

```bash
git submodule status --recursive                      # no '+', '-' or 'U' on any line
git submodule foreach --recursive git status --short  # every module clean
git push --dry-run --recurse-submodules=check <remote> <branch>   # must exit 0
```

`--recursive` on both of the first two, or a nested module carrying `+` passes unseen.
Line 3 alone reads the remote: a module commit held in no clone but yours is refused with
`The following submodule paths contain changes that can` and `not be found on any remote:`
on the next line. Publish the commit and rerun.

## Merge Order Across Repositories

**Must**

Merge a superproject working branch only after the module branches it records are merged
and published. Per module:

```bash
git rev-parse HEAD:module/foo   # what the branch records: the committed ref, not the index
git -C module/foo fetch origin
git -C module/foo merge-base --is-ancestor <recorded SHA> origin/<target branch>
```

Exit 0 — the recorded commit is on the module's target branch; non-zero — refuse the
merge. Every module reference the branch carries must resolve to something permanent, and
this condition holds the recorded commit, since one living only on a working branch is
on no target branch. `pr-rules` → Pre-Merge Checklist gates on this.

`submodule.<name>.branch` in `.gitmodules` is the second reference, which that condition
does not reach. `--remote` follows the key, so its value must not take the working branch
shape `<user>/<type>/<TRACKER-N>/<subject>` that `commit-rules` → Branch Naming fixes,
and the module's remote must carry a branch by that name:

```bash
git config -f .gitmodules --get-regexp '^submodule\..*\.branch$'  # every key set; exit 1 for none
git -C module/foo ls-remote --exit-code --heads origin <value>    # exit 0; exit 2 when absent
```

## When to Bump

**Should**

The module ref should move when the superproject needs the new module state, not because
a branch inside the module merged. Merging a superproject branch obliges no commit inside
a module.

## Common Operations

**May**

```bash
# Populate every module after a fresh clone
git submodule update --init --recursive
# Take on a new module: clones it, writes the .gitmodules section, stages both
git submodule add <url> module/foo
# Move a module to its remote's current state instead of the recorded commit
git submodule update --remote module/foo
# Point --remote at a chosen branch instead of the clone's origin/HEAD
git config -f .gitmodules submodule.module/foo.branch release
```

Absent that key, `--remote` follows the clone's own `origin/HEAD`, a clone-time cache a
fetch leaves alone; refresh it with `git -C module/foo remote set-head origin -a`.

## Removing a Module

**Must**

Run all three, then commit; each leaves what the next one takes:

```bash
git submodule deinit -f module/foo   # empties the directory, unregisters it from .git/config
git rm module/foo                    # drops the .gitmodules section and the gitlink
# no git command for the next line
rm -rf .git/modules/module/foo       # drops the module repository the superproject keeps
git commit -m "chore: remove module/foo"
```

`deinit` alone leaves both the section and the gitlink in place; after all three
`git ls-files --stage` must list no `160000` entry for the path.
