---
name: release
version: "1.0.0"
description: Apply when preparing a release, bumping version, or tagging
license: Unlicense
metadata:
  author: ssoft
  tags:
    - git
    - release
    - semver
---

# Skill: Release Preparation

Apply when user says "release", "bump version", "prepare release", or "tag".
Project `AGENTS.md` specifies which files contain version strings.

## Project Overrides

Project-local rules win. If the repository's `AGENTS.md` or a project skill defines its own release process, follow those instead. This skill is the fallback for projects that do not specify their own.

## Step 1 — Decide Version (semver)

| Bump | When |
|------|------|
| `MAJOR` (X) | Breaking public API change |
| `MINOR` (Y) | New backwards-compatible functionality |
| `PATCH` (Z) | Backwards-compatible bug fix |

Version string format: `X.Y.Z` (no `v` prefix in files).
Git tag format: `vX.Y.Z`.

## Step 2 — Update CHANGELOG.md

See `changelog` skill for format details.

1. Rename `## [Unreleased]` → `## [X.Y.Z] - YYYY-MM-DD` (today's date, ISO 8601)
2. Ensure all notable changes since last release are documented

## Step 3 — Bump Version Strings

Find all occurrences of old version (substitute actual version number, e.g. `1.2.3`):
```bash
git grep -F "1.2.3"
```

Update in every location the project declares (check `AGENTS.md` for the list).
Typical locations: `CMakeLists.txt`, `Doxyfile` (`PROJECT_NUMBER`), `README.md` badges.

Verify nothing remains:
```bash
git grep -F "1.2.3"   # must return empty
```

## Step 4 — Verify

- [ ] Build passes on all compilers declared in project (check AGENTS.md)
- [ ] All tests pass
- [ ] No breaking API change without `MAJOR` bump
- [ ] `CHANGELOG.md` covers all changes since last release

## Step 5 — Commit and Tag

```bash
git add CHANGELOG.md <version-files>
git commit -m "chore(release): bump version to X.Y.Z"
git tag vX.Y.Z
git push
git push --tags    # separate push — triggers CI release workflow
```

## Step 6 — Submodule Root Update (if applicable)

If this library is a submodule in a root repo:
1. After pushing the tag, update the submodule ref in root
2. See `submodule-sync` skill for the exact workflow

## Pre-Release Checklist

- [ ] `CHANGELOG.md` updated — `[Unreleased]` renamed, new section added
- [ ] Version string consistent across **all** version files (grep confirms)
- [ ] CI green on all compiler targets
- [ ] Submodule ref updated in root repo (if applicable)
- [ ] Commit trailers conform to `commit-rules` skill
