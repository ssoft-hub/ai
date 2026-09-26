---
type: llm
weight: 1
---

Count the facts every comment in the response carries.

FAIL the response when one comment or more carries two facts or more. PASS it when every comment carries one fact at most.

A response carrying no comment at all passes this grader. A documentation block on a public interface falls outside the skill and is not measured here; every other comment is, whatever marker opens it, and, as the section The Comments a Change Writes states, line comments on lines of their own are one comment until a line of code stands between them, a blank line splitting none, and a comment ending a line of code is one by itself.

The section, from the `comments` skill:

## One Fact per Comment

**Must**

Must put no two facts in one comment.
