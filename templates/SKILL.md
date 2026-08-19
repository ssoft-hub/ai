---
name: <kebab-case-name>
version: "1.0.0"
description: <one-line description of when to use this skill>
license: <license identifier, e.g. MIT>
metadata:
  author: <author or team name>
  # process = sets the approach, domain = shapes the code, narrow = rules one topic.
  # Several skills firing on one task are loaded in that order; the narrower one wins
  # on its own topic and must not restate the wider one.
  tier: <process | domain | narrow>
  # Optional. Globs of the files this skill owns, matched against the full path with
  # forward slashes — write '**/' in front of anything that isn't repo-root-anchored.
  # A skill with paths is announced by tools/skill-gate.js when such a file is edited.
  # An item may hold a comma; it may not hold an escaped quote, which the frontmatter
  # reader does not decode.
  paths:
    - "**/*.<ext>"
  # Optional, defaults to true. Set false only when the paths above are the whole
  # trigger, which drops the skill from the every-prompt reminder and leaves it to the
  # gate. A skill whose intent is wider than its files keeps the default: an API is
  # designed before the header exists, and no edit has happened yet to announce it.
  reminder: false
  # Optional. Skills that always apply alongside this one; the gate names them too.
  with:
    - <skill-name>
  tags:
    - <primary-tag>
    - <secondary-tag>
---

# Skill: <Name>

Apply when <trigger condition — one line, specific, actionable>.

<!-- Cross-references: list related skills that cover adjacent concerns.
     Include when this skill intentionally omits something covered elsewhere. -->
<!-- <Adjacent concern> → `<skill-name>` skill. -->

<!-- External reference (optional): authoritative source this skill is based on. -->
<!-- Reference: <Author>, *<Title>* (<Year>). -->

---

## <Primary Section>

**Recommended**

<!-- The marker above is one of exactly four, alone on the first line under every `## `
     heading, ordered by force and meaning the same in every skill:
       `**Must**`        ground for refusing work, and appears in checklists
       `**Should**`      may stop a review with a stated reason; no mechanical check
       `**Recommended**` raised as a remark, blocks nothing
       `**May**`         grants permission, forbids nothing
     `**Must**` is placed only where compliance can be checked: every statement under it
     meets the three conditions in AGENTS.md → Binding Force. The other three
     carry no such requirement and are ordered by importance alone. The default above is
     `**Recommended**`, the weakest marker that still states a norm — raise a section
     deliberately, and split a checkable statement out into its own section rather than
     strengthening the marker over neighbours the conditions reject. Keep the line: a
     skill whose sections all carry one declares `rubric: applied` in its frontmatter. -->

<!-- Lead with the most important rules. Use bullet lists for rules,
     tables for mappings, fenced code blocks for examples. -->

- **<Rule>** — explanation of why

```cpp
// example
```

---

## <Secondary Section>

**Recommended**

<!-- Add sections as needed. Common section names:
     Rules, Format, Structure, What to Test, Architecture,
     Hard Rules, Coverage, Types, Workflow, Examples -->

<!-- Guidelines for section content:
     - Rules: short, imperative, bold the key term
     - Tables: use for type→when or tag→purpose mappings
     - Code: show the correct pattern; optionally pair with wrong pattern
     - No section needed for obvious things — only what surprises or is missed -->

---

## Cross-References

**Recommended**

<!-- List skills that should be consulted alongside this one.
     Omit section if there are no meaningful cross-references. -->

- `<skill-name>` — <what it covers that this skill does not>
