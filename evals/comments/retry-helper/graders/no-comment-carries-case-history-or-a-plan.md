---
type: llm
weight: 1
---

Find every comment in the response and ask of each one whether it carries the case history of the code beside it - how the code came to be, what changed in it and when, the task, ticket or defect behind the change, the options weighed - or a pending event or plan: what the code waits for, and what is to change in it and when.

FAIL the response when one comment or more carries any of these. PASS it when no comment does.

Commented-out code is among the comments the section Two Kinds of Comment does not admit, which the grader of that section measures, and decides nothing here.

A response carrying no comment at all passes this grader. A documentation block on a public interface falls outside the skill and is not measured here; every other comment is, whatever marker opens it, and, as the section The Comments a Change Writes states, line comments on lines of their own are one comment until a line of code stands between them, a blank line splitting none, and a comment ending a line of code is one by itself.

The section, from the `comments` skill:

## What a Comment Leaves Out

**Must**

Must omit what the table below names from every comment:

| Left out | What it covers |
|---|---|
| case history of the code beside the comment | how the code came to be, what changed in it and when, the task, ticket or defect behind the change, the options weighed |
| a pending event or plan | what the code waits for, and what is to change in it and when |

On the driver workaround of Two Kinds of Comment:

| Comment | Verdict |
|---|---|
| `// The driver drops the first write after a reset.` | admitted |
| `// Second write added after the bench tests of the previous release.` | rejected: case history |

Rejected, a plan:

```python
# Temporary until the reporting service ships its own export.
return legacy_export(rows)
```
