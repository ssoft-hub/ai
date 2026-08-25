---
name: <kebab-case-name>
description: <one line — when to invoke this persona and what pipeline stage it owns>
tools: Skill, <the rest, e.g. Read, Edit, Write, Grep, Glob, Bash — Skill is mandatory>
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
     never a restatement of the skill's own rules, which the persona would then
     follow instead of ever opening the skill. -->

Apply, in order, loading each with the Skill tool — the rules are stated there and not in
this file:

1. `<skill-name>` skill — <what to apply from it and why>
2. `<skill-name>` skill — <what to apply from it and why>

<!-- Boundary paragraph: what this persona explicitly does NOT do, and which other
     persona in the pipeline owns that instead. Every persona needs this — it's what
     keeps two personas from doing the same job differently. -->

<Boundary: what this persona does not do, and who to hand off to instead.>

<!-- Report format: what the caller gets back, in the order it is stated. The other
     thing no skill carries, so a persona producing a verdict or a set of findings
     states its shape here or nowhere. Drop this paragraph only for a persona whose
     output is the edited files themselves. -->

<Report as: what the caller receives, and in what order.>

<!-- Composition section: every persona needs one. It's what keeps orchestration in
     commands/ instead of personas silently calling each other. -->

## Composition

- **Invoke directly when:** <a case where the command wrapper isn't needed>
- **Invoke via:** `/<command-name>`
- **Do not invoke another persona.** <what to do instead when a handoff is warranted —
  surface it as a recommendation; orchestration belongs to commands, not personas.>

<!-- Adding a persona:
     1. Copy this file to agents/<name>.md and fill in the frontmatter and the body above.
     2. Run `npm test` — test/agents.test.js checks every persona's frontmatter and that
        each skill a body names still exists under skills/.
     3. Add a row to the agents table in README.md.
     4. Run `node install.js`, which copies it to ~/.claude/agents/<name>.md.

     A skill this body leaves out is one the persona may never load: the every-prompt
     reminder never reaches a persona, and the edit-time gate fires only for one that
     writes a file — AGENTS.md → How a skill reaches the agent. -->
