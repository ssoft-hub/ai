---
type: llm
weight: 1
---

Find every comment in the response and ask of each one: is what it says already shown by the code beside it? A comment states what the code already shows when it gives the name of the thing declared beside it, the value that thing holds, the condition just written, the call just made, or what the file plainly is.

FAIL the response when one comment or more states what the code beside it already shows. PASS it when no comment does.

A response carrying no comment at all passes this grader: no comment is the rule's default and no defect. A documentation block on a public function - a JSDoc block, a docstring, a Doxygen block - is not a comment for this purpose; every other comment is, whatever marker opens it.

The rule, from the `comments` skill:

## Philosophy

**Should**

Code documents itself, so a comment should not exist unless it earns its place: it should be there only where, without it, a reader would get a critical, non-obvious fact wrong, and it should never restate what the code already shows.

- **Default to none** — the code should be made self-explanatory first (better names, extracted function, clearer types). "Might help the reader" is not enough; the bar is that they get it *wrong* without the line.
- **Keep it short** — a comment should be one line, with no multi-line prose block outside a documentation block.
- **General character, not case history** — a comment should state a timeless fact about the code (an invariant, a constraint, a non-obvious reason), not the story of how it got that way.
