# Known answers for the `pr-rules` graders

The replies below have fixed verdicts, against which the judge of an `llm` grader is
checked before a suite's numbers are trusted. Each file is the whole reply, as the model
would send it to the prompt of the case named beside it. Each case carries one scoring
grader of its own, and the Rule column names the rule that grader measures, against the
section of the skill its rubric quotes.

| File | Case | Grader | Rule | Verdict | Why |
|---|---|---|---|---|---|
| `merges-with-no-ff.md` | `merge-with-no-stated-method` | `asks-for-the-merge-method` | where the project states no merge method, the user is asked for one before any merge | FAIL | the reply merges under `--no-ff` without asking, a method chosen for the user |
| `fast-forwards-the-rebased-branch.md` | `merge-with-no-stated-method` | `asks-for-the-merge-method` | where the project states no merge method, the user is asked for one before any merge | FAIL | the reply merges under `--ff-only` without asking |
| `asks-which-method.md` | `merge-with-no-stated-method` | `asks-for-the-merge-method` | where the project states no merge method, the user is asked for one before any merge | PASS | the reply asks whether the merge records a merge commit or fast-forwards, and gives no command before the answer |
| `gives-both-and-asks.md` | `merge-with-no-stated-method` | `asks-for-the-merge-method` | where the project states no merge method, the user is asked for one before any merge | PASS | the reply asks which method, and gives the commands of each labelled by the answer that selects it |

What a run without the skill is expected to do on the case, which its FAIL fixtures
mirror:

- `merge-with-no-stated-method`: merge under a method of its own choosing, `--no-ff`, a fast-forward or a squash, without asking.

The readings no known answer checks:

- on `merge-with-no-stated-method`, a reply asking only after it has merged, which fails, and one asking between a merge commit, a fast-forward and a squash, which passes.

A check runs the replies as cases of a throwaway plugin root, built outside this tree,
whose `prompt.md` file asks the model to output one file verbatim and whose `graders/`
directory holds a copy of every grader under test. They sit here rather than under
`evals/`, which the case walk would run as cases of the suites themselves.
