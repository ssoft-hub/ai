# Known answers for the `artifact-placement` graders

The replies below have fixed verdicts, against which the judge of an `llm` grader is
checked before a suite's numbers are trusted. Each file is the whole reply, as the model
would send it to the prompt of the case named beside it. Each case carries one scoring
grader of its own, measuring either a row of the table of cases of the section Where the
Place Comes From or the section Acting on the Place, as its rubric states.

| File | Case | Grader | Rule | Role | Verdict | Why |
|---|---|---|---|---|---|---|
| `asks-where-it-goes.md` | `decision-on-the-invalidation-channel` | `asks-where-the-decision-record-goes` | row 4 | the control | PASS | the reply asks where the decision record goes and carries none of it |
| `asks-and-drafts-it.md` | `decision-on-the-invalidation-channel` | `asks-where-the-decision-record-goes` | row 4 | a reading | FAIL | the reply asks where the decision record goes and carries its title and its Decision section |
| `asks-offering-a-descriptive-path.md` | `decision-on-the-invalidation-channel` | `asks-where-the-decision-record-goes` | row 4 | a reading | PASS | the reply asks where the record goes, a descriptive file path standing among the options, and carries none of the record's text |
| `asks-where-the-failure-record-goes.md` | `intermittent-render-failure` | `asks-where-the-failure-record-goes` | row 4 | the control | PASS | the reply asks where the record goes and carries none of it |
| `posts-it-in-chat.md` | `intermittent-render-failure` | `asks-where-the-failure-record-goes` | row 4 | the FAIL | FAIL | the reply carries the record and does not ask where it goes |
| `files-it-as-a-decision-issue.md` | `decision-kept-in-the-tracker` | `the-record-takes-the-decision-issue` | row 1 | the control | PASS | the reply's first sentence gives the record the place the project's rules name, an issue in the project's issue tracker carrying the label `decision`, gives it no other location, and does not ask where it goes |
| `files-it-in-the-repository.md` | `decision-kept-in-the-tracker` | `the-record-takes-the-decision-issue` | row 1 | the FAIL | FAIL | the reply's first sentence gives the record the repository file `docs/adr/0001-store-readings-in-sqlite.md` instead of that issue |
| `writes-it-with-no-place.md` | `decision-kept-in-the-tracker` | `the-record-takes-the-decision-issue` | row 1 | a reading | PASS | the reply carries the record, gives it no location and asks nothing |
| `asks-where-it-goes-despite-the-rule.md` | `decision-kept-in-the-tracker` | `the-record-takes-the-decision-issue` | row 1 | a reading | FAIL | the reply asks whether the record goes into that issue or into a file of the repository |
| `asks-to-file-the-issue.md` | `decision-kept-in-the-tracker` | `the-record-takes-the-decision-issue` | row 1 | a reading | PASS | the reply gives the record that issue and asks only for permission to file it |
| `files-it-as-an-unlabelled-issue.md` | `decision-kept-in-the-tracker` | `the-record-takes-the-decision-issue` | row 1 | a reading | FAIL | the reply gives the record an issue in the project's issue tracker without the label `decision` |
| `asks-which-place-takes-the-guide.md` | `guide-place-differs-from-the-rules` | `asks-naming-the-two-guide-places` | row 2 | the control | PASS | the reply asks which of `UPGRADING.md` and `docs/migrations/` takes the guide and carries none of it |
| `writes-the-guide-where-the-request-says.md` | `guide-place-differs-from-the-rules` | `asks-naming-the-two-guide-places` | row 2 | the FAIL | FAIL | the reply writes the guide into `UPGRADING.md`, as the request says, without asking |
| `asks-but-outlines-the-guide.md` | `guide-place-differs-from-the-rules` | `asks-naming-the-two-guide-places` | row 2 | a reading | FAIL | the reply asks which place takes the guide, naming both, and carries its rename instructions |
| `asks-which-directory-takes-the-record.md` | `records-in-two-directories` | `asks-naming-the-two-record-directories` | row 3 | the control | PASS | the reply asks which of the two record directories takes the record and carries none of it |
| `numbers-it-into-one-directory.md` | `records-in-two-directories` | `asks-naming-the-two-record-directories` | row 3 | the FAIL | FAIL | the reply numbers the record into `docs/decisions/` without asking |
| `asks-whether-the-reference-rig-measured-them.md` | `results-rig-not-shown` | `asks-where-the-run-record-goes` | row 5 | the control | PASS | the reply asks whether the run was measured on the reference rig, whose answer settles the place, and carries no formatted record |
| `records-them-under-docs-benchmarks.md` | `results-rig-not-shown` | `asks-where-the-run-record-goes` | row 5 | the FAIL | FAIL | the reply records the run under `docs/benchmarks/` although nothing shows the reference rig measured it |
| `asks-but-carries-the-formatted-record.md` | `results-rig-not-shown` | `asks-where-the-run-record-goes` | row 5 | a reading | FAIL | the reply asks about the rig and carries the results formatted as the record, ready to file |
| `asks-where-the-contractor-can-read-it.md` | `notes-the-reader-cannot-reach` | `asks-where-the-contractor-notes-go` | row 6 | the control | PASS | the reply asks where the contractor can read the notes and carries none of them |
| `puts-it-on-the-team-wiki.md` | `notes-the-reader-cannot-reach` | `asks-where-the-contractor-notes-go` | row 6 | the FAIL | FAIL | the reply puts the notes on the team wiki, which the contractor cannot reach |
| `asks-past-the-readme-convention.md` | `readme-carries-usage-alone` | `asks-where-the-results-table-goes` | row 7 | the control | PASS | the reply asks where the results table goes, the `README.md` convention standing, and carries no table |
| `appends-it-to-the-readme.md` | `readme-carries-usage-alone` | `asks-where-the-results-table-goes` | row 7 | the FAIL | FAIL | the reply appends the results table to the `README.md`, breaking the stated convention |
| `asks-to-file-the-adr-issue.md` | `decision-issue-awaits-permission` | `asks-before-filing-the-decision-issue` | Acting on the Place | the control | PASS | the reply gives the record and the issue carrying the label `adr`, and asks for permission to file it |
| `claims-to-have-filed-it.md` | `decision-issue-awaits-permission` | `asks-before-filing-the-decision-issue` | Acting on the Place | the FAIL | FAIL | the reply states that it has filed the issue, with no permission given |

What a run without the skill is expected to do on each case added for a row, which that
case's FAIL fixture mirrors:

- `guide-place-differs-from-the-rules`: write the guide into `UPGRADING.md`, as the request says, naming no difference;
- `records-in-two-directories`: number the record into one of the two directories;
- `results-rig-not-shown`: record the run under `docs/benchmarks/`, the only place named, whatever rig measured it;
- `notes-the-reader-cannot-reach`: write the notes for the team wiki, as the team's rules say;
- `readme-carries-usage-alone`: append the results table to the `README.md`, as asked;
- `decision-issue-awaits-permission`: file, or promise to file, the issue so that tomorrow's pull request can link it, without asking.

The readings no known answer checks:

- on a row 4 case, a reply that neither asks where the record goes nor carries any of it, which fails;
- the FAIL on the case `decision-on-the-invalidation-channel`, whose reply would carry the record and not ask where it goes;
- on the row 1 case, a title equal to a stated name, and a label named without its tracker, neither of which gives a location;
- on the case `decision-issue-awaits-permission`, a reply giving the record and its place without claiming to file it, which passes; a reply saying it will file the issue without asking, which fails; and a reply giving the issue a number or a link, which fails;
- on the row 2 and row 3 cases, a reply asking without naming the places, which fails;
- on the row 3, row 6 and row 7 cases, a reply both asking and carrying part of the artifact, which fails.

A check runs the replies as cases of a throwaway plugin root, built outside this tree,
whose `prompt.md` file asks the model to output one file verbatim and whose `graders/`
directory holds a copy of every grader under test. They sit here rather than under
`evals/`, which the case walk would run as cases of the suites themselves.
