---
type: llm
weight: 1
---

The response is a message in a thread. It passes when a reader who did not follow the thread understands it: it names the artifact, the symbol and the decision it turns on. It fails when it leans on a word whose referent stands only in what came before it, such as "done", "fixed as discussed" or "good catch" standing alone.

The rule, from the `writing-style` skill:

## A Message Stands Without Its Context

**Should**

Should write a message a reader who did not follow the conversation understands. Should
name the artifact, the symbol and the decision the message turns on, rather than reach for
a name standing only in what came before it.

A word whose referent stands only in what came before the message is a defect, and reading
the message with nothing around it is what finds one.

| Defective | Corrected |
|---|---|
| "done, as discussed above" | "fixed: the guard now rejects a path outside the repository, per the `check` function's exit-code contract" |
