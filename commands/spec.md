---
description: Turn an idea or task into a specification (and ADR when the change touches architecture) via the spec-architect persona
argument-hint: <idea or task description>
license: Unlicense
metadata:
  author: ssoft
  tags:
    - pipeline
    - spec
---

Invoke the `spec-architect` subagent to turn the following into a specification:

$ARGUMENTS

Wait for the spec (and ADR, if the change touches system/module structure) before
starting implementation. Do not write implementation code as part of this command —
that is `/build`'s job.
