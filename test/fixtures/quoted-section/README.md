# A section quoted against a fenced template

Five files behind the four fixture tests of `test/evals-layout.test.js`, which hold the
rule that an `llm` grader quotes the whole section it names. `skills/issue-rules/SKILL.md`
is the one skill in the tree whose section carries a template full of `##` headings, so a
suite losing it would lose the fence check in silence; this fixture carries the shape
instead.

| File | Holds | Fails when |
|---|---|---|
| `skill.md` | two sections, the first carrying a fenced template whose every heading is a `##` line | — |
| `quotes-the-whole-section.md` | a rubric quoting that section to its last line | the walk takes a fenced `##` line for a section boundary |
| `stops-at-the-fenced-heading.md` | the same rubric, cut where a fence-blind walk cuts it | the check asks for containment instead of the whole section |
| `shows-a-heading-above-the-quote.md` | a rubric quoting the second section, below a `##` line its own prose carries | the failure over a heading the skill carries no section under reports a quote cut short |
| `mentions-the-heading-inline.md` | a rubric naming the section inside a sentence of its prose, above a quote of the whole of it | the quote is sliced from the mention instead of from the heading's own line |

The cut quote is a prefix of the section and so a substring of the skill, which is what a
containment check accepts and what the pair holds shut.
