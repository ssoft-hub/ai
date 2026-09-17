---
type: llm
weight: 1
---

Read every name the issue in the response carries - another issue, a pull request, a branch, a review, a session, a skill, a section, an artifact - and settle each one with the question the rule below asks: can the work on this issue start before the named thing is done? Where it can, the name is one no criterion of the issue turns on.

FAIL the response when the issue carries one such name or more, the circumstances the defect was found under among them: the review it surfaced in, the pull request or the branch it was read on, the issue that pull request resolves. PASS it when every name in the issue is one its problem or one of its criteria turns on, the file and the flag the defect sits in among them.

A response whose issue names nothing beyond its own problem passes this grader: the bare problem is the rule's default and no defect, and a name is admitted only where a criterion needs it.

The rule, from the `issue-rules` skill:

## What an Issue Names

**Should**

An issue should name only what its problem or its criteria turn on: no other issue,
branch, skill, section, finding or artifact whose absence would leave every criterion
stating the same thing. One question settles a name: can the work on this issue start
before the named thing is done? Where it can, the author should cut the name, since
whoever takes the issue up, in whatever order the backlog is worked, would otherwise wait
on that thing or cite what never reaches the tree; where it cannot, the name is a
dependency and stays.

An issue should carry the circumstances the problem was found under — a review, a
session, the branch the defect surfaced on — only where they are part of the problem.

A reader should read each name in the issue against the criteria, and should cut a name
no criterion needs.

| Defective | Corrected |
|---|---|
| "Found reviewing PR #<n> on the branch of GH-<n>, in the reviewer's third comment: `<skill>` → <Section> states no limit on the length of a line." | "`<skill>` → <Section> states no limit on the length of a line." |
