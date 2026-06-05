# Skill: Submodule Sync

Apply before root repo commits, before PR, before release, when working across submodules.

## Core Concept

Root repo records a specific commit SHA for each submodule.
`git submodule status` prefix meanings:
- ` ` (space) — ref matches what root records ✓
- `+` — submodule is ahead of what root records (needs `git add`)
- `-` — submodule not initialized
- `U` — merge conflict

## Correct Workflow

```
# 1. Commit changes inside the module repo
cd module/foo
git add <changed-files>
git commit -m "feat: ..."

# 2. Back in root — record the new submodule ref
cd ../..
git add module/foo
git status   # should show "modified: module/foo (new commits)"
git commit -m "chore: update module/foo ref"
```

## Pre-PR / Pre-Release Check

```bash
git submodule status          # no '+' prefix allowed
git submodule foreach git status  # all modules clean
```

## Common Operations

```bash
# Pull latest remote module state into root
git submodule update --remote module/foo

# Initialize all submodules after clone
git submodule update --init --recursive

# Check which commit each submodule is at
git submodule status
```

## Rules

- Never record a root ref pointing to an uncommitted module state
- Submodule changes and root ref update are separate commits
- Always verify `git submodule status` before opening a PR
