---
name: release
version: "1.0.0"
description: Apply when preparing a release, bumping version, or tagging
license: Unlicense
metadata:
  author: ssoft
  tier: domain
  bound-to:
    - universal
  tags:
    - git
    - release
    - semver
---

# Skill: Release Preparation

Apply when user says "release", "bump version", "prepare release", or "tag".
The project declares which files carry version strings.

## Project Overrides

**Must**

Must follow the release process the project states, in a project skill or wherever else it
keeps its conventions, instead of the rule here.

## Step 1 — Decide Version (semver)

| Bump | When |
|------|------|
| `MAJOR` (X) | Breaking public API change |
| `MINOR` (Y) | New backwards-compatible functionality |
| `PATCH` (Z) | Backwards-compatible bug fix |

Version string format: `X.Y.Z` (no `v` prefix in files).
Git tag format: `vX.Y.Z`.

## Step 2 — Update CHANGELOG.md

`changelog` skill → On Release owns the edit itself — reconciling the section against the
previous release, renaming `[Unreleased]` into the new version section, and prepending a
fresh empty one. What this step adds: confirm every notable change since the last release
is actually in there before the version is frozen.

## Step 3 — Bump Version Strings

Find all occurrences of old version (substitute actual version number, e.g. `1.2.3`):
```bash
git grep -F "1.2.3"
```

Should update every location the project declares.
Typical locations: `CMakeLists.txt`, `Doxyfile` (`PROJECT_NUMBER`), the badges of the
project's front page.

Verify nothing remains:
```bash
git grep -F "1.2.3"   # must return empty
```

## Step 4 — Pre-Release Checklist

Gates the commit and tag of Step 5. Whether the release, once built, is safe to expose
to users is a separate gate → `shipping-and-launch` skill.

- [ ] Build passes on all compilers the project declares
- [ ] All tests pass; CI passed on all compiler targets
- [ ] No breaking API change without `MAJOR` bump, breaking as the API-design skill of
      the language being written defines it in its breaking-changes section
- [ ] `CHANGELOG.md` covers all changes since last release, reconciled against the
      previous release, `[Unreleased]` renamed (`changelog` → On Release)
- [ ] Version string consistent across **all** version files (grep confirms)
- [ ] Every module ref recorded in this release is the module state it ships, under the
      merge order the module-sync skill of the version control system fixes
- [ ] Commit trailers conform to `commit-rules` skill

## Step 5 — Commit and Tag

```bash
git add CHANGELOG.md <version-files>
git commit -m "chore(release): bump version to X.Y.Z"
git tag vX.Y.Z
git push
git push --tags    # separate push — triggers CI release workflow
```

## Step 6 — Submodule Root Update (if applicable)

If this library is a submodule in a superproject:
1. After pushing the tag, update the submodule ref in the superproject
2. See the module-sync skill of the version control system for the exact workflow
