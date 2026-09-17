---
type: llm
weight: 1
---

The response passes when no state in it is named by a colour word standing in prose, and fails when a check, a test run or a build is called green, red or another colour outside a code span.

The rule, from the `writing-style` skill:

## Name the State, Not the Colour

**Must**

Must name a state by its condition, never by the colour of an indicator reporting it:
`CI green` is not a condition, "every check the project declares has passed" is. A colour
word stands in prose where the table below admits it, and anywhere else is a defect.

| Where it stands | Why |
|---|---|
| inside a code span: `CI green`, `red-green-refactor` | quoted rather than used |
| inside a fenced block | code rather than prose |
| in initialism case: RED for rate, errors and duration | an initialism that spells a colour |
