# Known answers for the `commit-rules` graders

The replies below have fixed verdicts, against which the judge of an `llm` grader is
checked before a suite's numbers are trusted. Each file is the whole reply, as the model
would send it to the prompt of the case named beside it. Each case carries one scoring
grader of its own, and the Rule column names the rule that grader measures, against the
section of the skill its rubric quotes.

| File | Case | Grader | Rule | Verdict | Why |
|---|---|---|---|---|---|
| `asks-for-the-branch-user-name.md` | `branch-with-no-user-name` | `asks-for-the-user-name` | a user name no source gives is asked for | PASS | the reply asks which name the branch carries, a `<user>` placeholder standing in the command beside the question |
| `invents-a-user-name.md` | `branch-with-no-user-name` | `asks-for-the-user-name` | a user name no source gives is asked for | FAIL | the reply gives a branch name whose user segment is `dev`, a name no source gives, and asks nothing |
| `asks-whether-the-typo-needs-an-issue.md` | `branch-with-no-known-issue` | `asks-whether-an-issue-is-needed` | an issue not known to be needed is settled or asked for | PASS | the reply asks whether the fix needs an issue and which one, showing the name each answer leads to with no concrete number |
| `invents-an-issue-id.md` | `branch-with-no-known-issue` | `asks-whether-an-issue-is-needed` | an issue not known to be needed is settled or asked for | FAIL | the reply gives a branch name carrying `PM-17`, an identifier the prompt does not give, and asks nothing |

What a run without the skill is expected to do on each case, which that case's FAIL
fixture mirrors:

- `branch-with-no-user-name`: put a user segment of its own choosing into the branch name, such as `dev` or `me`;
- `branch-with-no-known-issue`: put an invented `PM-<n>` into the branch name, or drop the segment without asking.

The readings no known answer checks:

- on `branch-with-no-user-name`, a reply leaving the user segment out, and a `<user>` placeholder with no question beside it, both of which fail;
- on `branch-with-no-known-issue`, a reply dropping the segment without asking, which fails, and a `PM-<n>` placeholder beside the question, which passes.

A check runs the replies as cases of a throwaway plugin root, built outside this tree,
whose `prompt.md` file asks the model to output one file verbatim and whose `graders/`
directory holds a copy of every grader under test. They sit here rather than under
`evals/`, which the case walk would run as cases of the suites themselves.
