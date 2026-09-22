---
type: llm
weight: 1
---

Read the title of the issue in the response - its first line, or whatever line the response offers as the title - and hold it to the form the rule below fixes.

FAIL the response when the title opens with no type at all, when its subject stands in a mood other than the imperative - a noun phrase naming the thing to be built, a gerund, or a sentence with a subject of its own - when the first letter after the colon is lowercase, when the title ends in a period, or when the whole title runs past 80 characters. PASS it when the title carries a type, an optional scope, and an imperative subject in that form.

The nine types the rule names stand under a `**Should**`, and a project adds the type its own work needs where none of them names it: a capitalised type outside the nine, standing in the Type slot with the rest of the form held, passes this grader, a project's own type standing outside what this case measures.

A response carrying no title at all fails this grader: the title is what the rule fixes, and a body standing alone carries none.

The rule, from the `issue-rules` skill:

## Title

**Must**

An issue title must read `Type(scope): Subject description`, where:

- **Type** — capitalized (see Types below).
- **Scope** — optional; component or module the issue targets.
- **Subject** — imperative mood (`Compare token expiry with <= instead of <`), uppercase first letter after the colon, no trailing period, ≤ 80 characters total.
