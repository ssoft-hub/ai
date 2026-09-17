---
type: llm
weight: 1
---

Find every comment in the response and hold each one to a single bar: without this comment, does a careful reader get a fact wrong? Not whether the reader would find the comment useful, not whether the reader would get through the code faster - wrong.

A comment clears the bar by stating a constraint or a requirement imposed from outside the file, an invariant a reader could break while simplifying the code, what a workaround works around, or behaviour that would surprise a careful reader. A comment fails the bar when what it says is stated by something the reader consults instead: the documentation of the program that reads the file, a specification, a type.

FAIL the response when one comment or more fails the bar. PASS it when every comment clears it.

A response carrying no comment at all passes this grader: no comment is the rule's default and no defect. A documentation block on a public function - a JSDoc block, a docstring, a Doxygen block - is not a comment for this purpose; every other comment is, whatever marker opens it.

The rule, from the `comments` skill:

## Philosophy

**Should**

Code documents itself, so a comment should not exist unless it earns its place: it should be there only where, without it, a reader would get a critical, non-obvious fact wrong, and it should never restate what the code already shows.

- **Default to none** — the code should be made self-explanatory first (better names, extracted function, clearer types). "Might help the reader" is not enough; the bar is that they get it *wrong* without the line.
- **Keep it short** — a comment should be one line, with no multi-line prose block outside a documentation block.
- **General character, not case history** — a comment should state a timeless fact about the code (an invariant, a constraint, a non-obvious reason), not the story of how it got that way.
