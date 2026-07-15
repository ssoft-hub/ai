---
description: <one line — what this command orchestrates>
argument-hint: <what $ARGUMENTS represents, e.g. "<task to implement>" or "[optional scope]">
license: Unlicense
metadata:
  author: <author or team name>
  tags:
    - pipeline
    - <stage-tag>
---

<!-- Body is the prompt template run for /<name>. Keep it to orchestration: invoke the
     agent(s) that do the actual work, state the handoff condition, and state the
     boundary — what this command does NOT do, deferred to another command. Do not
     restate a skill's or agent's own rules here; reference them instead. -->

Invoke the `<agent-name>` subagent to <do the thing> with:

$ARGUMENTS

<Boundary: what this command does not do, and which other command picks it up next.>
