---
type: llm
weight: 1
---

Read the title of the issue in the response - its first line, or whatever line the response offers as the title - and hold it to the form the rule below fixes.

FAIL the response when the title opens with no type of the nine the rule names, when its subject stands in a mood other than the imperative - a noun phrase naming the thing to be built, a gerund, or a sentence with a subject of its own - when the first letter after the colon is lowercase, when the title ends in a period, or when the whole title runs past 80 characters. PASS it when the title carries a type, an optional scope, and an imperative subject in that form.

A response carrying no title at all fails this grader: the title is what the rule fixes, and a body standing alone carries none.

The rule, from the `issue-rules` skill:

## Title

**Must**

An issue title must read:

```
Type(scope): Subject description
```

- **Type** — capitalized (see Types below).
- **Scope** — optional; component or module the issue targets.
- **Subject** — imperative mood, uppercase first letter after the colon, no trailing period, ≤ 80 characters total.

```
Feat(hash): Add SipHash-2-4 keyed 64-bit hash
Fix(auth): Compare token expiry with <= instead of <
Chore: Update CI runner to Ubuntu 24.04
```
