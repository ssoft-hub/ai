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

## Step 1 — Decide Version (semver)

| Bump | When |
|------|------|
| `MAJOR` (X) | Breaking public API change |
| `MINOR` (Y) | New backwards-compatible functionality |
| `PATCH` (Z) | Backwards-compatible bug fix |

Version string format: `X.Y.Z` (no `v` prefix in files).
Tag format: `vX.Y.Z`.

## Step 2 — Update CHANGELOG.md

`changelog` skill → On Release owns the edit itself — reconciling the section against the
previous release, renaming `[Unreleased]` into the new version section, and prepending a
fresh empty one. What this step adds: confirm every notable change since the last release
is actually in there before the version is frozen.

## Step 3 — Bump Version Strings

Should search the tracked files for the old version, such as `1.2.3`, before the bump:
the search lists every place carrying that version. Should then update every location
the project declares. Typical locations: `CMakeLists.txt`, `Doxyfile` (`PROJECT_NUMBER`),
the badges of the project's front page.

After the bump, should search again and should find the old version nowhere outside the
released sections of `CHANGELOG.md`, which keep the versions they name. The form of both
searches: the workflow skill of the version control system.

## Step 4 — Pre-Release Checklist

Gates the commit and tag of Step 5. Whether the release, once built, is safe to expose
to users is a separate gate → `shipping-and-launch` skill.

- [ ] Build passes on all compilers the project declares
- [ ] All tests pass; CI passed on all compiler targets
- [ ] No breaking API change without `MAJOR` bump, breaking as the API-design skill of
      the language being written defines it in its breaking-changes section
- [ ] `CHANGELOG.md` covers all changes since last release, reconciled against the
      previous release, `[Unreleased]` renamed (`changelog` → On Release)
- [ ] Version string consistent across **all** version files (the search of Step 3
      confirms)
- [ ] Every module ref recorded in this release is the module state it ships, under the
      merge order the module-sync skill of the version control system fixes
- [ ] Commit trailers conform to `commit-rules` skill

## Step 5 — Commit and Tag

The release commit should carry `CHANGELOG.md` and every version file of Step 3, under
the subject `chore(release): bump version to X.Y.Z`. The commit, the tag and the pushes
that publish both belong to the workflow skill of the version control system,
which fixes the order they run in and what each one leaves behind.

## Step 6 — Submodule Root Update (if applicable)

Where this library is a submodule of a superproject, should update the submodule ref in
the superproject once the tag is published, as the module-sync skill of the version
control system states.
