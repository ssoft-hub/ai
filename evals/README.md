# Eval suites

One suite per skill, one directory per case. What the command is and what it reports:
`README.md` -> Evals. What a case holds, how the judge is checked and how a list of
skills is run are here.

A suite is written and checked here; its numbers are not. A measurement is worth taking
only immediately before the change it will be compared against, so the work that rewrites
a skill takes its own, on the tree as it stands then, before and after the rewrite. A
number taken when the suite was added is superseded by the next change to either the skill
or the instrument.

## Writing a case

A case is a directory under the suite of the skill it measures, holding a `prompt.md` and
a `graders/`. The prompt poses a task on which the rule is commonly broken, below a
frontmatter naming `max_turns` and the `allowed_tools`, `Skill` among them.

`graders/` holds one file per rule the case exercises, and one indicator:

| Grader | When |
|---|---|
| `regex` | the rule names a pattern, as `writing-style` -> Prefer Keyboard-Reachable Characters does |
| `llm` | the rule names none, and the text of the skill's section is the rubric |
| `tool_used` for `Skill` | the indicator, one per case, named `<skill>-skill-fired.md` |

The indicator carries `input_match: 'claude-config:<skill>'`, so a call loading another
skill is not counted as this suite's skill firing. Under the two arms it is an indicator
that the plugin fired rather than part of the score, which is what `--ablation
with-without` makes of a `tool_used: Skill` grader.

A regex pattern, and an `input_match`, is written in single quotes in the frontmatter: a
double-quoted YAML string reads `\s` as an escape and breaks the pattern. `input_match`
matches as a substring and honours no `\b`.

One grader name carries one rubric: a case needing another rubric gives it another name,
since a case's frontmatter takes no `graders` key and every case holds its own copy of
the file. `test/evals-layout.test.js` holds every case to the shape above, every quoted
section to the text the skill carries, and every shared name to one content.

## A case that measures nothing

A case both arms pass in every run measures nothing, so the author should rewrite it
until the arm without the skill fails at least once in three runs.

## What a score counts

A case's score is a weighted count of the rules a response broke, never the share of its
comments, sentences or lines that are defective: graders may nest, one stating a general
rule and another a named instance of it, and a single defect then fails both. The `delta`
between the two arms is unaffected, the same weighting standing over each of them.

## Checking the judge

The replies the judge is checked on sit in `test/fixtures/judge-check/`, one file per
reply, each naming the verdict it must draw. They sit there rather than here, where the
case walk would run them as cases. A check builds a throwaway root outside this tree
whose case asks the model to output one reply verbatim and whose `graders/` holds a copy
of the rubric under test, and it runs before a suite's numbers are trusted.

## A run that is discarded rather than read

A reader should discard a run whose `partial` flag is true, and a run in which any `llm`
grader records an empty `judgeVotes`. The tool scores a grader it could not run as a
failure, so a judge call that never answered - a session limit, a network error - is
indistinguishable from a verdict of FAIL once the score alone is read; and a breached
`--max-cost-usd` ceiling skips the paid graders while the free ones go on scoring, which
leaves a case scored by part of its graders. The two fields to look at, before any number
of the run is read, are `partial` at the top of `aggregate-result.json` and `judgeVotes`
on every `llm` grader of every run.

## Building and running a list

```
node tools/eval-plugin.js comments writing-style
claude plugin eval <root> --trust-plugin --judge-model <judge> --output-dir evals/results/<label>
```

The root, printed on stdout, holds the listed skills, their cases and a manifest, under
the temporary directory of the operating system; the `--out <dir>` flag chooses another.
A companion a listed skill names in `with:` but the list does not hold is warned about,
and so is a listed skill with no cases. The root sits outside the repository because the
case walk reaches a build left inside it, for the reason the comment above `main` in
`tools/eval-plugin.js` states; the walk leaves out only a `results`, a `node_modules` and
a `.claude` directory, and neither the `--eval-dir` flag nor the manifest narrows it.

`--trust-plugin` asserts that the operator trusts the plugin's code and its eval suite,
which `claude plugin eval` runs on this machine as them. Every build writes the root
afresh, so no trust granted to a previous one reaches it, and a run that cannot stop to
ask refuses a plugin directory it does not already trust.

`--output-dir evals/results/<label>` keeps the results of a run against a build in the
repository, where `.gitignore` leaves them untracked. A run kept for inspection passes
`--keep-temp`; the operator should remove the scaffold directories it keeps by hand
afterwards, as the tool itself asks on Windows.
