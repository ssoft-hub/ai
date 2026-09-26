---
type: llm
weight: 1
---

Find every comment in the response and settle its kind by the section quoted below. A comment is a service comment where a tool acts on its content as an instruction or an input - a formatter, an analyser, a compiler, an editor; a comment a tool only lists or highlights is not one. Every other comment is admitted only where it passes both tests the section names. The deletion test: delete the comment and read the code beside it; the comment passes where that code then conveys a different meaning, the meaning compared being what a line does, or why the line is there, never why a value is the one it is. The checkable claim: the comment passes where it carries at least one claim checkable against the code beside it - a function name, a condition or an ordering. Commented-out code, and a section banner that is no service comment, are among the comments the section does not admit.

PASS the response when every comment is a service comment, or passes both tests and is neither commented-out code nor a section banner. FAIL it otherwise: the section owes every comment it does not admit deletion.

Whether a name or a type replaces a comment, how many facts it carries, and whether it names a case history or a plan are measured by other graders and decide nothing here.

A response carrying no comment at all passes this grader. A documentation block on a public interface falls outside the skill and is not measured here; every other comment is, whatever marker opens it, and, as the section The Comments a Change Writes states, line comments on lines of their own are one comment until a line of code stands between them, a blank line splitting none, and a comment ending a line of code is one by itself.

The section, from the `comments` skill:

## Two Kinds of Comment

**Must**

Must admit no comment but the two kinds below, and must delete every comment this section
does not admit, commented-out code and a section banner that is no service comment
included.

| Kind | The comment | Identified by |
|---|---|---|
| service comment | one whose content a tool — a formatter, an analyser, a compiler, an editor — acts on as an instruction or an input | the tool acting on it |
| clarifying comment | one without which the meaning of the code beside it is not clear | the deletion test and the checkable claim |

A comment a tool only lists or highlights, such as a `TODO` comment an editor collects, is
no service comment.

Must admit a comment that is no service comment only where it passes both tests below:

| Test | The comment passes where |
|---|---|
| deletion test | with the comment deleted, the code beside it conveys a different meaning: what a line does, or why the line is there |
| checkable claim | it carries a function name, a condition or an ordering checkable against the code beside it |

The deletion test never compares why a value is the one it is.

Admitted, a service comment mypy acts on:

```python
from vendor_sdk import Client  # type: ignore[import-untyped]
```

Admitted, both tests passed; the ordering is the first write after `reset`:

```c
reset(port);
// The driver drops the first write after a reset.
write(port, header, size);
write(port, header, size);
```

Rejected by the deletion test, since the condition already conveys what the line does and
why it is there:

```cpp
// Upstream API returns null once the connection is closed.
if (connection == nullptr) return;
```

Rejected by the checkable claim alone; the deletion test keeps it, since nothing else says
why the line is there:

```ts
// Keeps the chart from flickering.
chart.update({ animate: false });
```
