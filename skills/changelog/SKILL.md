# Skill: Changelog

Apply when editing `CHANGELOG.md` or asked about changelog format.

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

1. Rename `## [Unreleased]` → `## [X.Y.Z] - YYYY-MM-DD` (today's date)
2. Prepend a new empty `## [Unreleased]` section above it
3. Leave empty subsections out — add them only when there's content
