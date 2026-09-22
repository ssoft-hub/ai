---
type: regex
pattern: '^[\s\S]{0,400}?(^|\n)[#>` ]{0,8}(\*{1,2})?(Title:\*{0,2} )?(Feat|Fix|Refactor|Perf|Docs|Test|Chore|Ci|Style)(\([^)\n]{1,40}\))?: [A-Z]'
weight: 1
---

The rule: `issue-rules` -> Types, in the Type slot `issue-rules` -> Title fixes. The nine types the skill names stand under a `**Should**`, and a project adds the type its own work needs where none of them names it; the pattern holds the title to those nine, capitalised, an optional scope in parentheses, and an uppercase letter after the colon. A project's own type stands outside what this case measures.

This is a named instance of the form the grader `title-follows-the-form.md` measures whole, so a title carrying no type fails both, which `evals/README.md` -> What a score counts allows.
