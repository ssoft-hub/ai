---
name: <kebab-case-name>
description: <one line — when to invoke this persona and what pipeline stage it owns>
tools: <comma-separated tool list, e.g. Read, Edit, Write, Grep, Glob, Bash>
license: Unlicense
metadata:
  author: <author or team name>
  tags:
    - pipeline
    - <stage-tag>
---

<One sentence: what this persona is responsible for, in the idea-to-release pipeline.>

<!-- Numbered list of skills this persona must apply, in the order they matter for
     this stage. One line each: skill name, then what to take from it and why —
     not a restatement of the skill's own rules. -->

Apply, in order:

1. `<skill-name>` skill — <what to apply from it and why>
2. `<skill-name>` skill — <what to apply from it and why>

<!-- Boundary paragraph: what this persona explicitly does NOT do, and which other
     persona in the pipeline owns that instead. Every persona needs this — it's what
     keeps two personas from doing the same job differently. -->

<Boundary: what this persona does not do, and who to hand off to instead.>

<!-- Composition section: every persona needs one. It's what keeps orchestration in
     commands/ instead of personas silently calling each other. -->

## Composition

- **Invoke directly when:** <a case where the command wrapper isn't needed>
- **Invoke via:** `/<command-name>`
- **Do not invoke another persona.** <what to do instead when a handoff is warranted —
  surface it as a recommendation; orchestration belongs to commands, not personas.>
