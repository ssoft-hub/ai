---
description: Implement one task by TDD via the implementer persona, from an existing spec
argument-hint: <task to implement>
license: Unlicense
metadata:
  author: ssoft
  tags:
    - pipeline
    - implementation
---

Invoke the `implementer` subagent to implement the following task, by TDD, from the
spec already produced by `/spec`:

$ARGUMENTS

If no spec exists yet for this task, stop and ask whether to run `/spec` first rather
than guessing at requirements. Do not review the resulting diff for merge-readiness as
part of this command — that is `/ship`'s job.
