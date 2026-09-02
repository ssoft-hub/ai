---
name: changelog
version: "1.0.0"
description: Apply when editing CHANGELOG.md or asked about changelog format
license: Unlicense
metadata:
  author: ssoft
  tier: narrow
  bound-to:
    - universal
  reminder: false
  paths:
    - "**/CHANGELOG.md"
  tags:
    - git
    - changelog
---

# Skill: Changelog

Apply when editing `CHANGELOG.md` or asked about changelog format.

- What counts as a breaking change → the API-design skill of the language being written.

## Project Overrides

**Must**

Must follow the changelog conventions the repository's `AGENTS.md` file or a project skill
defines, instead of the rule here.

## Format

Keep a Changelog (https://keepachangelog.com/en/1.1.0/) + Semantic Versioning.

```
# Changelog

## [Unreleased]
### Added
- New feature description.

## [X.Y.Z] - YYYY-MM-DD
### Changed
- What changed and why it matters to users.
```

## Subsections

Use only what applies. Order:
`Added` → `Changed` → `Deprecated` → `Removed` → `Fixed` → `CI`

## Bullet Rules

- Past tense, present-user perspective ("Added", not "Adding")
- Describe the WHAT and WHY for the user — not the implementation
- One logical change per bullet
- At most 300 characters, carrying the change alone: not how it is built, why it was
  built that way, or what holds it. A rule that moved is stated by naming the skill or
  file it moved to
- No PR numbers, no commit hashes, no internal refactor details

## What Goes In

- New public API / behaviour
- Behaviour changes (even if backwards-compatible)
- Deprecations and removals
- Breaking changes (mark clearly)
- CI changes visible to contributors

## What Stays Out

- Pure internal refactors with no visible effect
- Comment-only changes
- Formatting / style fixes
- Test-only changes (unless they affect contributor workflow)

## On Release

1. Reconcile the section against the previous release. The reader's baseline is the last
   version they can have, so a bullet is an entry only when the state it is measured
   against reached that version. A bullet measured against something introduced in
   the same `[Unreleased]` section — "X now does Y instead of Z", a `### Fixed` bullet
   for a defect that never reached a release — describes a transition no release
   contained. It is not an entry but an edit to the bullet that introduced the thing —
   under `### Added`, or under `### CI` when that is where it arrived: fold what it says
   about the shipped state into that bullet, and delete the bullet you took it from. Drop
   it outright when that bullet already describes the shipped state. A thing introduced
   and removed in the same section shipped nothing, so both bullets go; one introduced
   and deprecated ships deprecated, so correct the `### Added` bullet and keep the
   `### Deprecated` entry, the section a reader scans before upgrading. A change measured
   against the previous release is a real `### Changed` entry and stays.
   - Reconcile clause by clause: one bullet can carry a change against the previous
     release beside an edit to an unreleased one, or several unreleased edits folding
     into different `### Added` bullets.
   - Test the `### Added` bullet's claim, not its form. Fold when the unreleased change
     leaves that bullet wrong about what ships or short of it: the parts it lists are
     read as all of them, and a qualifier it states (`on every edited C++ file`) as
     holding. A gloss that qualifies nothing (`blocks credential leaks`) survives a
     change widening only the surface it runs on, and fails one widening the class it
     names. Drop otherwise — a bullet naming a thing without claiming its contents
     (`Skills: a, b, c`) ships it whole, whatever revisions it went through.
   - Nothing to fold into means the thing never reached `### Added` at all. Drop the
     bullet either way, and add the thing there first when What Goes In admits it.
   - An `### Added` bullet measured against another one folds first, so every later
     bullet tests against the merged claim.
   - The baseline is the last version the reader can have, which is not always a tag: a
     project shipping untagged builds, or a fork, keeps the entries measured against
     those. With no such version, every bullet reconciles this way.
   - Dropping is not a completeness check. It removes a bullet measured against a state
     no release had; whether `### Added` carries what that bullet said is confirmed by
     `release` → Step 2.
2. Rename `## [Unreleased]` → `## [X.Y.Z] - YYYY-MM-DD` (today's date)
3. Prepend a new empty `## [Unreleased]` section above it
4. Leave empty subsections out — add them only when there's content
